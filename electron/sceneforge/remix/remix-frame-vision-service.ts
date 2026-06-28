import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { nativeImage } from 'electron';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AISettings, SourceSegment, LLMProvider } from '../../../src/types/ai';
import { resolveDefaultLlmBinding } from '../../../src/lib/llm/provider-utils';
import { createChatModelFromProvider } from '../../../src/lib/llm/model';
import { extractTextContent } from '../../../src/lib/llm/content';
import { getRemixSegmentFrameVisionJsonPath } from './remix-artifact-paths';
import { resolveProjectFile } from './remix-validators';

export interface RemixSegmentFrameVisionDocument {
  schema: 'sceneforge-remix-segment-frame-vision';
  version: 1;
  sourceAssetId: string;
  segmentId: string;
  generatedAt: string;
  inputHash: string;
  provider: string | null;
  model: string | null;

  frames: Array<{
    frameId: string;
    frameRole: 'first' | 'middle' | 'last' | string;
    timestampMs: number;
    imagePath: string;
    imageHash?: string | null;
    caption: string;
    visibleCharacters: string[];
    visibleActions: string[];
    environment: string;
    props: string[];
    lighting: string;
    composition: string;
    confidence: number;
    warnings: string[];
  }>;

  segmentVisualSummary: string;
  quality: {
    needsHumanReview: boolean;
    warnings: string[];
  };
}

class SimpleLimit {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private max: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// 全局 Vision 并发限制，确保最多 2 个多模态请求在执行
const visionLimit = new SimpleLimit(2);

async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const buf = await fs.readFile(filePath);
    return createHash('md5').update(buf).digest('hex');
  } catch {
    return '';
  }
}

function buildSegmentFrameVisionInputHash(
  segmentId: string,
  frames: Array<{ frameId: string; imageHash: string | null; timestampMs: number }>,
): string {
  const payload = {
    segmentId,
    frames: frames.map((f) => ({
      frameId: f.frameId,
      imageHash: f.imageHash,
      timestampMs: f.timestampMs,
    })),
    promptVersion: 'vision-v1',
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function isVisionInputSupported(provider?: LLMProvider): boolean {
  if (!provider) return false;
  if (provider.capabilities?.visionInput !== undefined) {
    return provider.capabilities.visionInput;
  }
  return false;
}

const VISION_SYSTEM_PROMPT = `你是一个专业的影视分镜画面分析师。
请针对给出的影视关键帧图像，进行客观、准确的视觉描述，禁止凭空捏造不可见的情节、角色身份或剧情意图。

请必须只返回一个合法的 JSON 格式对象，不要包含任何 Markdown 代码块标签、前言或后记。JSON 的属性必须且只能包含以下 7 个字段（大小写敏感）：
- caption: 对这一帧画面的整体视觉文字描述（包含主体人物、动作、主要道具和环境细节）。
- visibleCharacters: 画面中明确可见的人物列表（字符串数组，如果没有则为空数组 []）。
- visibleActions: 人物正在进行的明确动作或肢体状态（字符串数组，如果没有则为空数组 []）。
- environment: 场景环境描述（如“微暗的室内书房”、“明亮的户外街道”等）。
- props: 画面中可见的服装和关键道具列表（字符串数组，如果没有则为空数组 []）。
- lighting: 画面中的光影明暗特征（如“侧面自然光”、“室内冷色顶光”等）。
- composition: 画面的镜头构图特征（如“三分线构图，主体偏左”、“中景，主体居中”等）。`;

interface RawVisionResult {
  caption?: string;
  visibleCharacters?: string[];
  visibleActions?: string[];
  environment?: string;
  props?: string[];
  lighting?: string;
  composition?: string;
}

export class RemixFrameVisionService {
  async runSegmentFrameVision(input: {
    projectDir: string;
    sourceAssetId: string;
    segment: SourceSegment;
    settings: AISettings;
  }): Promise<RemixSegmentFrameVisionDocument> {
    const { projectDir, sourceAssetId, segment, settings } = input;
    const binding = resolveDefaultLlmBinding(settings);
    const provider = binding
      ? settings.llmProviders.find((p) => p.id === binding.provider.id)
      : undefined;

    const modelName = binding?.model ?? null;
    const providerId = provider?.id ?? null;
    const generatedAt = new Date().toISOString();

    // 过滤出首中尾三帧
    const targetRoles = ['first', 'middle', 'last'];
    const targetFrames = segment.keyframes.filter((f) => targetRoles.includes(f.frameRole));

    // 计算文件哈希
    const resolvedFrames = await Promise.all(
      targetFrames.map(async (f) => {
        const absPath = resolveProjectFile(projectDir, f.imagePath);
        const imageHash = await calculateFileHash(absPath);
        return {
          frame: f,
          imageHash,
        };
      }),
    );

    // 整体 inputHash
    const inputHash = buildSegmentFrameVisionInputHash(
      segment.id,
      resolvedFrames.map((rf) => ({
        frameId: rf.frame.id,
        imageHash: rf.imageHash,
        timestampMs: rf.frame.timestampMs,
      })),
    );

    const outPath = resolveProjectFile(
      projectDir,
      getRemixSegmentFrameVisionJsonPath(sourceAssetId, segment.id),
    );

    // 尝试读取历史描述以提供细粒度缓存
    let oldDoc: RemixSegmentFrameVisionDocument | null = null;
    try {
      oldDoc = JSON.parse(await fs.readFile(outPath, 'utf8'));
    } catch {
      // 默默忽略
    }

    // 1. 判断是否支持多模态
    const supportsVision = isVisionInputSupported(provider);
    if (!supportsVision) {
      // 降级模式，置空描述，加入 warning 标识
      const resultDoc: RemixSegmentFrameVisionDocument = {
        schema: 'sceneforge-remix-segment-frame-vision',
        version: 1,
        sourceAssetId,
        segmentId: segment.id,
        generatedAt,
        inputHash,
        provider: providerId,
        model: modelName,
        frames: resolvedFrames.map((rf) => ({
          frameId: rf.frame.id,
          frameRole: rf.frame.frameRole,
          timestampMs: rf.frame.timestampMs,
          imagePath: rf.frame.imagePath,
          imageHash: rf.imageHash,
          caption: '',
          visibleCharacters: [],
          visibleActions: [],
          environment: '',
          props: [],
          lighting: '',
          composition: '',
          confidence: 0.5,
          warnings: ['当前模型不支持多模态视觉识别，使用文本上下文 fallback'],
        })),
        segmentVisualSummary: '（降级模式，无视觉总结）',
        quality: {
          needsHumanReview: true,
          warnings: ['当前模型不支持多模态视觉识别，使用文本上下文 fallback'],
        },
      };

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(resultDoc, null, 2), 'utf8');
      return resultDoc;
    }

    // 2. 多模态模式
    const finalFrames: RemixSegmentFrameVisionDocument['frames'] = [];
    const chatModel = createChatModelFromProvider(provider!, modelName!);

    for (const rf of resolvedFrames) {
      const { frame, imageHash } = rf;
      
      // 检查缓存复用
      const cached = oldDoc?.frames?.find(
        (f) =>
          f.frameId === frame.id &&
          f.imageHash === imageHash &&
          oldDoc?.model === modelName &&
          f.caption?.trim().length > 0,
      );

      if (cached) {
        finalFrames.push({
          frameId: frame.id,
          frameRole: frame.frameRole,
          timestampMs: frame.timestampMs,
          imagePath: frame.imagePath,
          imageHash,
          caption: cached.caption,
          visibleCharacters: cached.visibleCharacters ?? [],
          visibleActions: cached.visibleActions ?? [],
          environment: cached.environment ?? '',
          props: cached.props ?? [],
          lighting: cached.lighting ?? '',
          composition: cached.composition ?? '',
          confidence: cached.confidence ?? 1.0,
          warnings: [],
        });
        continue;
      }

      // 执行 vision 调用，加并发锁保护
      const frameAnalysis = await visionLimit.run(async (): Promise<RawVisionResult> => {
        const absImagePath = resolveProjectFile(projectDir, frame.imagePath);
        const img = nativeImage ? nativeImage.createFromPath(absImagePath) : null;
        let base64 = '';
        if (!img || img.isEmpty()) {
          if (!process.versions.electron) {
            const buf = await fs.readFile(absImagePath);
            base64 = buf.toString('base64');
          } else {
            throw new Error(`无法读取图片文件：${frame.imagePath}`);
          }
        } else {
          // 缩放尺寸限幅
          const { width, height } = img.getSize();
          let resized = img;
          if (width > 1024 || height > 1024) {
            resized = img.resize({ width: 1024 }); // 自动保持比例缩放
          }
          base64 = resized.toJPEG(80).toString('base64');
        }

        const response = await chatModel.invoke([
          new SystemMessage(VISION_SYSTEM_PROMPT),
          new HumanMessage({
            content: [
              { type: 'text', text: '请分析下面这个影视帧画面的所有视觉细节特征，并严格返回规定格式 of JSON。' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          }),
        ]);

        const raw = extractTextContent(response.content);
        try {
          // 清除可能存在的 markdown 代码块包裹
          const jsonText = raw.replace(/```json\s*|\s*```/g, '').trim();
          return JSON.parse(jsonText) as RawVisionResult;
        } catch (e) {
          throw new Error(`大模型多模态 JSON 解析失败：${raw}`);
        }
      }).catch((err) => {
        // 多模态调用失败时，此帧走降级警告，不中断其余帧分析
        return {
          caption: `（获取视觉描述失败: ${err instanceof Error ? err.message : String(err)}）`,
          visibleCharacters: [],
          visibleActions: [],
          environment: '',
          props: [],
          lighting: '',
          composition: '',
        };
      });

      finalFrames.push({
        frameId: frame.id,
        frameRole: frame.frameRole,
        timestampMs: frame.timestampMs,
        imagePath: frame.imagePath,
        imageHash,
        caption: frameAnalysis.caption || '（无描述）',
        visibleCharacters: frameAnalysis.visibleCharacters || [],
        visibleActions: frameAnalysis.visibleActions || [],
        environment: frameAnalysis.environment || '',
        props: frameAnalysis.props || [],
        lighting: frameAnalysis.lighting || '',
        composition: frameAnalysis.composition || '',
        confidence: frameAnalysis.caption?.startsWith('（获取视觉描述失败') ? 0.2 : 0.9,
        warnings: frameAnalysis.caption?.startsWith('（获取视觉描述失败') ? [frameAnalysis.caption] : [],
      });
    }

    // 拼接整体视觉总结
    const captions = finalFrames.map((f) => `【${f.frameRole}帧】${f.caption}`).join('；');
    const segmentVisualSummary = captions || '（无关键帧描述）';

    const warnings = finalFrames.flatMap((f) => f.warnings);
    const resultDoc: RemixSegmentFrameVisionDocument = {
      schema: 'sceneforge-remix-segment-frame-vision',
      version: 1,
      sourceAssetId,
      segmentId: segment.id,
      generatedAt,
      inputHash,
      provider: providerId,
      model: modelName,
      frames: finalFrames,
      segmentVisualSummary,
      quality: {
        needsHumanReview: warnings.length > 0,
        warnings,
      },
    };

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(resultDoc, null, 2), 'utf8');
    return resultDoc;
  }
}
