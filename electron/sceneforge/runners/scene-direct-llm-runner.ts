import path from 'node:path';
import type { AISettings } from '../../../src/types/ai';
import { parseLLMJsonResponse } from '../../../src/lib/llm';
import { addAppLog } from '../../app-logger';
import type { SceneStageId } from '../types';
import type { SceneStageContext } from '../pipeline/scene-context-builder';
import { loadSceneStagePack } from '../pipeline/scene-stage-pack';
import { stageSupportsRunner } from '../pipeline/scene-stage-run-capabilities';
import {
  formatLlmInvokeErrorMessage,
  migrateToProviders,
  resolveDefaultLlmBinding,
} from '../../../src/lib/llm/provider-utils';
import {
  buildDirectLlmArtifactJsonInstruction,
  renderSceneStagePrompts,
} from '../pipeline/scene-prompt-renderer';
import {
  estimateScenePromptTokens,
  SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS,
} from '../pipeline/scene-prompt-token-gate';
import type { SceneStageRunner, SceneStageRunnerInput, SceneStageRunnerResult } from '../pipeline/scene-stage-runner';
import { buildPerformanceLockedBlockFromStageContext } from '../validators/performance-topic-anchor';
import {
  hasChineseLedStoryBody,
  STORY_CHINESE_RETRY_USER_APPENDIX,
} from '../validators/story-chinese-led';

export type SceneDirectLlmGenerateText = (
  settings: AISettings,
  systemPrompt: string,
  userMessage: string,
) => Promise<string>;

export type SceneDirectLlmLoadSettings = () => Promise<AISettings | null>;

const SCENE_DIRECT_LLM_PHASE_TIMEOUT_MS = 6 * 60_000;

export interface SceneDirectLlmRunnerDeps {
  loadSettings: SceneDirectLlmLoadSettings;
  generateText: SceneDirectLlmGenerateText;
  phaseTimeoutMs?: number;
}

interface SceneDirectLlmPhaseInput {
  input: SceneStageRunnerInput;
  settings: AISettings;
  systemPrompt: string;
  userPrompt: string;
  requiredArtifacts: string[];
  phaseLabel: string;
  additionalUserSections?: string[];
  overrideUserPrompt?: string;
}

interface SceneDirectLlmPhaseProgress {
  phaseKey: string;
  phaseLabel: string;
  current: number;
  total: number;
}

export class SceneDirectLlmRunnerError extends Error {
  code:
    | 'SCENE_DIRECT_LLM_NO_SETTINGS'
    | 'SCENE_DIRECT_LLM_NO_MODEL'
    | 'SCENE_DIRECT_LLM_INVOKE_FAILED'
    | 'SCENE_DIRECT_LLM_PARSE_FAILED'
    | 'SCENE_DIRECT_LLM_MISSING_ARTIFACTS'
    | 'SCENE_DIRECT_LLM_PROMPT_TOO_LARGE'
    | 'SCENE_DIRECT_LLM_PHASE_TIMEOUT'
    | 'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE';

  constructor(
    code:
      | 'SCENE_DIRECT_LLM_NO_SETTINGS'
      | 'SCENE_DIRECT_LLM_NO_MODEL'
      | 'SCENE_DIRECT_LLM_INVOKE_FAILED'
      | 'SCENE_DIRECT_LLM_PARSE_FAILED'
      | 'SCENE_DIRECT_LLM_MISSING_ARTIFACTS'
      | 'SCENE_DIRECT_LLM_PROMPT_TOO_LARGE'
      | 'SCENE_DIRECT_LLM_PHASE_TIMEOUT'
      | 'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE',
    message: string,
  ) {
    super(message);
    this.name = 'SceneDirectLlmRunnerError';
    this.code = code;
  }
}

function assertDirectLlmStage(stage: SceneStageId): void {
  if (!stageSupportsRunner(stage, 'direct_llm')) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE',
      `direct_llm runner is not enabled for stage: ${stage}`,
    );
  }
}

function parseArtifactsFromLlm(
  raw: string,
  requiredKeys: string[],
): Record<string, string> {
  let parsed: Record<string, unknown>;
  try {
    const result = parseLLMJsonResponse(raw);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('LLM response must be a JSON object');
    }
    parsed = result as Record<string, unknown>;
  } catch (error) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_PARSE_FAILED',
      error instanceof Error ? `LLM JSON parse failed: ${error.message}` : 'LLM JSON parse failed',
    );
  }

  const artifacts: Record<string, string> = {};
  const missingKeys: string[] = [];
  for (const key of requiredKeys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) {
      artifacts[key] = value;
    } else {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_MISSING_ARTIFACTS',
      `LLM JSON is missing required artifacts: ${missingKeys.join(', ')}`,
    );
  }
  return artifacts;
}

function logPromptDebug(
  input: SceneStageRunnerInput,
  systemPrompt: string,
  finalUserPrompt: string,
  requiredArtifacts: string[],
  phaseLabel: string,
  promptEstimate: {
    totalTokens: number;
    systemTokens: number;
    userTokens: number;
    encodingName: string;
  },
): void {
  const payload = {
    project: path.basename(input.projectDir),
    projectDir: input.projectDir,
    stage: input.stage,
    runnerType: 'direct_llm',
    requiredArtifacts,
    phaseLabel,
    contextWarnings:
      input.stageContext && typeof input.stageContext === 'object'
        ? (input.stageContext as SceneStageContext).warnings
        : [],
    promptEstimate,
    systemPromptLength: systemPrompt.length,
    userPromptLength: finalUserPrompt.length,
    systemPrompt,
    userPrompt: finalUserPrompt,
  };

  addAppLog(
    'info',
    'sceneforge-llm-prompt',
    `LLM prompt 快照：${path.basename(input.projectDir)} ${input.stage} ${phaseLabel} (direct_llm)`,
    JSON.stringify(payload, null, 2),
  );
}

function logLlmRawFailure(
  input: SceneStageRunnerInput,
  raw: string,
  requiredArtifacts: string[],
  phaseLabel: string,
  error: SceneDirectLlmRunnerError,
): void {
  const payload = {
    project: path.basename(input.projectDir),
    projectDir: input.projectDir,
    stage: input.stage,
    runnerType: 'direct_llm',
    requiredArtifacts,
    phaseLabel,
    errorCode: error.code,
    errorMessage: error.message,
    rawLength: raw.length,
    rawPreview: raw.slice(0, 4000),
  };

  addAppLog(
    'warn',
    'sceneforge-llm-raw-failure',
    `LLM 原始返回未通过解析：${path.basename(input.projectDir)} ${input.stage} ${phaseLabel} (direct_llm)`,
    JSON.stringify(payload, null, 2),
  );
}

function logLlmTimeout(
  input: SceneStageRunnerInput,
  requiredArtifacts: string[],
  phaseLabel: string,
  timeoutMs: number,
): void {
  const payload = {
    project: path.basename(input.projectDir),
    projectDir: input.projectDir,
    stage: input.stage,
    runnerType: 'direct_llm',
    requiredArtifacts,
    phaseLabel,
    timeoutMs,
  };

  addAppLog(
    'warn',
    'sceneforge-llm-timeout',
    `LLM 调用超时：${path.basename(input.projectDir)} ${input.stage} ${phaseLabel} (direct_llm)`,
    JSON.stringify(payload, null, 2),
  );
}

function withPhaseTimeout<T>(
  timeoutMs: number,
  input: SceneStageRunnerInput,
  phaseLabel: string,
  requiredArtifacts: string[],
  task: Promise<T>,
): Promise<T> {
  const timeoutLabel =
    timeoutMs >= 60_000
      ? `${Math.round(timeoutMs / 60_000)} 分钟`
      : `${Math.max(1, Math.round(timeoutMs / 1000))} 秒`;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      logLlmTimeout(input, requiredArtifacts, phaseLabel, timeoutMs);
      reject(
        new SceneDirectLlmRunnerError(
          'SCENE_DIRECT_LLM_PHASE_TIMEOUT',
          `LLM 在 ${phaseLabel} 阶段超过 ${timeoutLabel} 仍未返回。请重试，或检查当前 Provider / 模型是否卡住。`,
        ),
      );
    }, timeoutMs);

    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function buildScopedSystemPrompt(systemPrompt: string, requiredArtifacts: string[]): string {
  return [
    systemPrompt,
    '## Current Call Output Scope',
    [
      `For this call, return only these top-level artifacts: ${requiredArtifacts.join(', ')}.`,
      'Artifacts outside this list are out of scope for this call unless they are explicitly provided as locked upstream context.',
      'Do not stop after the first key. Finish every required top-level key for the current call.',
    ].join('\n'),
  ].join('\n\n');
}

function extractMarkdownSection(source: string, sectionName: string): string | null {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `(^##\\s+(?:\\d+\\.\\s*)?${escaped}\\s*[\\r\\n]+)([\\s\\S]*?)(?=^##\\s+(?:\\d+\\.\\s*)?[A-Za-z0-9_]+\\s*|$)`,
    'm',
  );
  const match = source.match(regex);
  if (!match) return null;
  const body = match[2]?.trim();
  if (!body) return null;
  return `## ${sectionName}\n\n${body}`;
}

function buildStoryboardLockedSummary(storyboardPromptPack: string): string {
  const sectionOrder = [
    'beat_skeleton',
    'storyboard_content_breakdown',
    'cinematic_language_plan',
    'shot_continuity_plan',
    'continuity_control_system',
    'storyboard_prompt_pack_plan',
    'design_reconciliation_review',
  ];
  const sections = sectionOrder
    .map((section) => extractMarkdownSection(storyboardPromptPack, section))
    .filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    return [
      '# Locked Storyboard Summary',
      '未能从 `storyboard_prompt_pack` 中提取标准 section，已回退为完整已定稿主包，后续 artifact 只能继承，不要重写叙事规划。',
      storyboardPromptPack,
    ].join('\n\n');
  }

  return [
    '# Locked Storyboard Summary',
    '以下内容已经在上一轮定稿。后续 artifact 只能继承，不要重写叙事规划。',
    ...sections,
  ].join('\n\n');
}

function reportProgress(
  input: SceneStageRunnerInput,
  progress: SceneDirectLlmPhaseProgress,
): void {
  input.onProgress?.({
    projectDir: input.projectDir,
    stage: input.stage,
    runnerType: 'direct_llm',
    phaseKey: progress.phaseKey,
    phaseLabel: progress.phaseLabel,
    current: progress.current,
    total: progress.total,
  });
}

function ensureStoryboardBoardTitle(
  content: string,
  marker: string,
): string {
  if (content.includes(marker)) {
    return content;
  }

  return `## ${marker}\n\n${content}`;
}

function buildStoryHardRules(): string {
  return [
    '## Story Direction Hard Rules（与系统提示「硬性规则：中文为主」一致）',
    '- `story_direction` 必须是**中文主导** Markdown：logline、story_premise、每个 beat 的 title 与 beat_summary、角色/场景/道具功能说明、emotional_arc、ending_payoff、risk_notes、next_action 均用**简体中文**撰写。',
    '- 允许保留 snake_case section 键名、`beat_id`（如 beat_01）、以及 function 括号内的短英文标签（如 Setup、Climax），每项不超过 3 个英文词。',
    '- **禁止**整篇英文故事方向；**禁止**英文 logline；**禁止** `### Beat N: English Title`；**禁止**英文 beat_summary 段落。',
    '- 违反语言规则时，本次调用结果无效，必须按用户提示中的强制纠正说明重写。',
  ].join('\n');
}

function storyDirectionNeedsChineseRetry(
  stage: SceneStageId,
  artifacts: Record<string, string>,
): boolean {
  return stage === 'story' && !hasChineseLedStoryBody(artifacts.story_direction ?? '');
}

function buildVideoPromptsHardRules(): string {
  return [
    '## Video Prompts Hard Rules',
    '- `video_prompt_pack_cn` 必须是中文主导正文；中文必须承担主体结构、technical control 与导演长版提示词的正文。',
    '- `video_prompt_review` 必须单独返回，不要把 review 字段混进 `video_prompt_pack_cn` 正文。',
    '- `video_prompt_trace` 必须单独返回，不要把 trace 字段混进 `video_prompt_pack_cn` 正文。',
    '- 禁止输出“英文 compiled prompt + 中文备注”“英文长 Prompt + 中文摘要”“参数表 + 编译稿”这类退化形态。',
    '- 不要把标题级摘要、单行标签或空泛 optional 输入扩写成新规则；若补充输入缺少具体内容，应忽略它，而不是自行补脑。',
    '- 若 storyboard 已规划多个 Pack，必须按相同顺序输出多个正式 Pack 块，不能擅自压缩成一个总包。',
    '- 必须按正式主 pack 结构输出：video_prompt_pack_plan -> global_execution_preamble -> 故事板关键帧参考规则 -> 项目级全局锁定规则 -> Segment -> Segment 技术控制说明 -> segment_sound_execution -> Segment 导演长版提示词。',
    '- 主 pack 中禁止保留旧残留结构：pack_audio_execution_plan、project_level_global_rules、prompt_trace、video_prompt_review、video_prompt_trace、可直接复制使用块。',
    '- `【故事板关键帧参考规则】` 必须明确“控制故事板 Pack XX”为动作与连续性主参考，“风格故事板 Pack XX”为渲染与氛围辅助参考。',
    '- `【Segment X 技术控制说明】` 必须写成自然语言控制说明，不得写成 YAML、参数表或 key-value 清单。',
    '- `【项目级全局锁定规则】` 必须逐条写出主场景、角色锁定、不重复角色、画面可读性、风格锁定、灯光锁定、负向边界。',
    '- `【Segment X 技术控制说明】` 正文必须明确出现 VGU、continuity_in、continuity_out、blocking、prop state、next_handoff。',
    '- `【Segment X 导演长版提示词】` 必须把景别、机位、构图、动作、情绪、道具状态、声音承接、负向边界写进时间码正文，不能只写短句。',
    '- 若 audio / script / performance 已锁定台词、人声、呼吸、笑声或说话人连续性，segment_sound_execution 中必须额外提供 `Voice` 小节。',
  ].join('\n');
}

function extractPackCoverageHints(content: string): string[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const matches = lines.filter((line) => /Pack\s*0*\d+/i.test(line));
  return Array.from(new Set(matches)).slice(0, 12);
}

function extractDetectedPackNumbers(content: string): number[] {
  return Array.from(
    new Set(
      [...content.matchAll(/(?:视频提示词\s*第|控制故事板\s*Pack\s*|风格故事板\s*Pack\s*|Pack\s*0*)(\d+)/gi)]
        .map((match) => Number.parseInt(match[1] ?? '', 10))
        .filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);
}

function buildVideoPromptsPackStructureRules(stageContext: SceneStageContext): string {
  const storyboardPack = stageContext.requiredInputs.find(
    (input) => input.artifactId === 'storyboard.storyboard_prompt_pack',
  );
  if (!storyboardPack?.content) {
    return '';
  }

  const detectedPacks = extractDetectedPackNumbers(storyboardPack.content);
  if (detectedPacks.length <= 1) {
    return '';
  }

  const packLabels = detectedPacks.map((pack) => `第${String(pack).padStart(2, '0')}包`);
  const coverageHints = extractPackCoverageHints(storyboardPack.content);
  const lines = [
    '## Locked Multi-Pack Structure',
    `已从 storyboard.storyboard_prompt_pack 中检测到多包结构：${packLabels.join('、')}。`,
    `本轮必须在 \`video_prompt_pack_cn\` 中按相同顺序输出 ${detectedPacks.length} 个正式视频包，禁止压缩成单包。`,
    `正式包标题必须至少包含：${packLabels.join('、')}。`,
    '每个视频包都必须只覆盖其对应 storyboard pack 的 Segment / Shot 范围，不得跨包吞并。',
    '同时在 `video_prompt_trace` 的 `pack_mapping` 中逐条列出 storyboard Pack -> video Pack 的一一映射。',
  ];

  if (coverageHints.length > 0) {
    lines.push('', 'Storyboard 中已锁定的 pack 线索：', ...coverageHints.map((line) => `- ${line}`));
  }

  return lines.join('\n');
}

async function invokeDirectLlmPhase(
  deps: SceneDirectLlmRunnerDeps,
  phase: SceneDirectLlmPhaseInput,
): Promise<Record<string, string>> {
  const scopedSystemPrompt = buildScopedSystemPrompt(
    phase.systemPrompt,
    phase.requiredArtifacts,
  );
  const jsonHint = buildDirectLlmArtifactJsonInstruction(phase.requiredArtifacts);
  const scopedUserPrompt = [
    phase.overrideUserPrompt ?? phase.userPrompt,
    ...(phase.additionalUserSections ?? []),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const finalUserPrompt = `${scopedUserPrompt}\n\n${jsonHint}`;
  const migrated = migrateToProviders(phase.settings);
  const binding = resolveDefaultLlmBinding(migrated);
  if (!binding) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_NO_MODEL',
      '未设置默认模型。请在「设置 → AI」中填写默认模型，或在 Provider 的模型列表中添加至少一个模型。',
    );
  }

  const promptEstimate = estimateScenePromptTokens({
    model: binding.model,
    systemPrompt: scopedSystemPrompt,
    userPrompt: finalUserPrompt,
  });
  logPromptDebug(
    phase.input,
    scopedSystemPrompt,
    finalUserPrompt,
    phase.requiredArtifacts,
    phase.phaseLabel,
    {
      totalTokens: promptEstimate.totalTokens,
      systemTokens: promptEstimate.systemTokens,
      userTokens: promptEstimate.userTokens,
      encodingName: promptEstimate.encodingName,
    },
  );
  if (promptEstimate.totalTokens > SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_PROMPT_TOO_LARGE',
      [
        `本次发送给 LLM 的提示词过大：${promptEstimate.totalTokens} tokens，已超过上限 ${SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS}。`,
        `Stage: ${phase.input.stage}`,
        `Model: ${binding.model}`,
        `Encoding: ${promptEstimate.encodingName}`,
        `System: ${promptEstimate.systemTokens} tokens`,
        `User: ${promptEstimate.userTokens} tokens`,
        '请减少上游上下文、草案内容或一次性补充意见后重试。',
      ].join('\n'),
    );
  }

  let raw: string;
  try {
    raw = await withPhaseTimeout(
      deps.phaseTimeoutMs ?? SCENE_DIRECT_LLM_PHASE_TIMEOUT_MS,
      phase.input,
      phase.phaseLabel,
      phase.requiredArtifacts,
      deps.generateText(migrated, scopedSystemPrompt, finalUserPrompt),
    );
  } catch (error) {
    if (error instanceof SceneDirectLlmRunnerError) {
      throw error;
    }
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_INVOKE_FAILED',
      formatLlmInvokeErrorMessage(error),
    );
  }

  try {
    return parseArtifactsFromLlm(raw, phase.requiredArtifacts);
  } catch (error) {
    if (error instanceof SceneDirectLlmRunnerError) {
      logLlmRawFailure(
        phase.input,
        raw,
        phase.requiredArtifacts,
        phase.phaseLabel,
        error,
      );
    }
    throw error;
  }
}

export function createDirectLlmStageRunner(deps: SceneDirectLlmRunnerDeps): SceneStageRunner {
  return {
    type: 'direct_llm',
    async run(input: SceneStageRunnerInput): Promise<SceneStageRunnerResult> {
      assertDirectLlmStage(input.stage);
      const stageContext = input.stageContext as SceneStageContext;
      const pack = await loadSceneStagePack(input.stage);
      const { systemPrompt, userPrompt } = renderSceneStagePrompts(pack, stageContext, {
        currentDraftArtifacts: input.currentDraftArtifacts,
        refinementPrompt: input.refinementPrompt,
      });

      const settings = await deps.loadSettings();
      if (!settings) {
        throw new SceneDirectLlmRunnerError(
          'SCENE_DIRECT_LLM_NO_SETTINGS',
          '未找到应用 LLM 设置，请先在设置中配置 Provider。',
        );
      }

      const migrated = migrateToProviders(settings);
      if (migrated.llmProviders.length === 0) {
        throw new SceneDirectLlmRunnerError(
          'SCENE_DIRECT_LLM_NO_SETTINGS',
          '未配置任何 LLM Provider。请打开「设置 → AI」添加 Provider 并设为默认。',
        );
      }

      if (input.stage === 'storyboard') {
        reportProgress(input, {
          phaseKey: 'phase-1-storyboard-pack',
          phaseLabel: '生成分镜主包',
          current: 1,
          total: 4,
        });
        const storyboardPromptPack = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: ['storyboard_prompt_pack'],
          phaseLabel: 'phase-1-storyboard-pack',
          additionalUserSections: [
            [
              '## Current Call Scope',
              '本轮只生成 `storyboard_prompt_pack`。',
              '不要生成 `control_board_prompts`、`style_board_prompts`、`master_board_prompt`。',
              '先把分镜分包规划、beat 对齐、连续性链和 design_reconciliation_review 定稿。',
              '主包中的 section 与正式 Pack copy-block 要各司其职：section 只负责总结规划、连续性和审查信息，不要把每个 Pack 的可执行正文再原样重复展开一遍。',
            ].join('\n'),
          ],
        });

        const lockedStoryboardPromptPack = storyboardPromptPack.storyboard_prompt_pack;
        const lockedStoryboardSummary = buildStoryboardLockedSummary(
          lockedStoryboardPromptPack,
        );
        reportProgress(input, {
          phaseKey: 'phase-2-control-board',
          phaseLabel: '生成控制板提示词',
          current: 2,
          total: 4,
        });
        const controlBoardPrompts = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: ['control_board_prompts'],
          phaseLabel: 'phase-2-control-board',
          overrideUserPrompt: [
            '# Storyboard Follow-Up User Prompt',
            '你正在基于已定稿 storyboard 继续生成单一 artifact。',
            '不要重复输出 stage context，不要重写 storyboard 规划。',
            '只继承下面的锁定摘要，并产出当前 call scope 指定的唯一 artifact。',
          ].join('\n\n'),
          additionalUserSections: [
            lockedStoryboardSummary,
            [
              '## Control Board Hard Rules',
              '- `control_board_prompts` 必须是中文主导内容；禁止输出“可直接复制的英文主 Prompt”“Copy-Pasteable Master Prompt”“Prompt (EN)”这类英文主导结构。',
              '- 每个 Pack 的正式整板正文中，必须原样包含标题：`Control-Oriented Storyboard Board`。',
              '- 每个 Pack 都必须整体包在 `<copy-block type="storyboard-pack" id="pack-01" label="控制板提示词 第01包">...</copy-block>` 这类显式标签里，并在块内以 `## Pack 1:` 起头。',
              '- 每个 Pack 都必须拆成两个明确部分：`画面区` 与 `控制区`。',
              '- `画面区` 负责逐格描述画面内容，并明确写出红蓝标注如何出现在画面内部。',
              '- `画面区` 不能退化成一句画面概述加一串箭头说明；每格至少要覆盖大多数以下专业维度：景别、机位角度、构图重心、主体姿态与表演状态、空间关系、前中后景层次、光线来源/方向、关键材质或环境细节、镜头运动带来的视觉结果、镜头的叙事目的。',
              '- 红色人物运动箭头与蓝色摄影机运动箭头是覆盖在专业画面描述之上的控制标注，不能替代主体画面描述本身。',
              '- `控制区` 负责 `Panel Layout`、`Beat Line`、`Camera Path`、`Action Path`、`Rhythm Track`、`State Track`、`Continuity Rules`、`Color Legend` 等导演控制信息。',
              '- 必须逐 Pack、逐格明确写出：`红色人物运动箭头`、`蓝色摄影机运动箭头`。',
              '- 必须明确写出：红色人物运动箭头与蓝色摄影机运动箭头都标在分镜画面区内部，不能只放在底部控制区。',
              '- 若为多 Pack，必须显式写出 Pack 交界镜头或衔接策略，说明上一包收束镜头如何平滑接入下一包起始镜头，并保持角色朝向、视线、运动方向、场景轴线、速度感与光线条件连续。',
              '- 若某格无人运动或无镜头运动，必须显式写出“人物静止”或“固定机位”。',
              '- 不允许退化成 shotlist、表格摘要、英文主 prompt 加中文备注的形式。',
            ].join('\n'),
            [
              '## Current Call Scope',
              '本轮不要重新规划故事板，也不要返回 `storyboard_prompt_pack`。',
              '请严格基于上面的已定稿 `storyboard_prompt_pack`，本轮只生成 `control_board_prompts`。',
              '确保 control board 与已定稿的 pack 数、shot 范围、continuity 规则完全一致。',
            ].join('\n'),
          ],
        });
        reportProgress(input, {
          phaseKey: 'phase-3-style-board',
          phaseLabel: '生成风格板提示词',
          current: 3,
          total: 4,
        });
        const styleBoardPrompts = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: ['style_board_prompts'],
          phaseLabel: 'phase-3-style-board',
          overrideUserPrompt: [
            '# Storyboard Follow-Up User Prompt',
            '你正在基于已定稿 storyboard 继续生成单一 artifact。',
            '不要重复输出 stage context，不要重写 storyboard 规划。',
            '只继承下面的锁定摘要，并产出当前 call scope 指定的唯一 artifact。',
          ].join('\n\n'),
          additionalUserSections: [
            lockedStoryboardSummary,
            [
              '## Style Board Hard Rules',
              '- `style_board_prompts` 必须是中文主导内容；禁止输出“Pack Master Style Prompt”“Master Style Prompt”“Style Reference Anchor”这类英文主导 prompt 块。',
              '- 每个 Pack 的正式整板正文中，必须原样包含标题：`Style & Rendering Storyboard Board`。',
              '- 每个 Pack 都必须整体包在 `<copy-block type="storyboard-pack" id="pack-01" label="风格板提示词 第01包">...</copy-block>` 这类显式标签里，并在块内以 `## Pack 1:` 起头。',
              '- 每个 Pack 都必须显式拆成“画面区”和“控制区”两部分；不能只给英文 prompt 加一张风格表。',
              '- `画面区` 负责逐格描述风格画面、光影、材质、色彩、镜头空气感与渲染重点。',
              '- `画面区` 不能退化成“风格词 + 箭头规则”的简略条目；每格除风格、光影、材质、色彩外，还要覆盖景别、构图、空间层次、主体表演状态、关键环境细节与镜头叙事重点。',
              '- `控制区` 负责 `Panel Layout`、`Lighting Strategy`、`Material Strategy`、`Color Script`、`Depth & Lens`、`Texture & FX`、`Continuity Rules`、`Color Legend` 等风格控制信息。',
              '- 风格板也必须逐格继承并显式说明：`红色人物运动箭头` 与 `蓝色摄影机运动箭头` 仍然标在分镜画面区内部；风格板只能在不破坏可读性的前提下美化这些箭头，不得删除、隐藏或改到控制区外。',
              '- 风格板必须严格继承已定稿 storyboard 的角色年龄、服装、道具、场景与镜头范围，不得擅自改成新的角色造型、服装款式、滑板样式或场景类型。',
              '- 不允许输出新的题材设定，不允许把滑板奶奶改写成其他人物，也不允许把午后街道改写成 skatepark、实验室或其他场景。',
              '- 若为多 Pack，必须显式写出 Pack 交界镜头或风格衔接策略，保证上下包之间的角色朝向、视线、运动方向、场景轴线、速度感、光线条件和空气透视连续，不像切进一个全新段落。',
              '- 不允许退化成英文主 prompt + 中文补充说明的形式。',
            ].join('\n'),
            [
              '## Current Call Scope',
              '本轮不要重新规划故事板，也不要返回 `storyboard_prompt_pack`。',
              '请严格基于上面的已定稿 `storyboard_prompt_pack`，本轮只生成 `style_board_prompts`。',
              '确保 style board 与已定稿的 pack 数、shot 范围、continuity 规则完全一致，且不与 control board 逻辑冲突。',
            ].join('\n'),
          ],
        });
        reportProgress(input, {
          phaseKey: 'phase-4-master-board',
          phaseLabel: '生成总控主板锚点',
          current: 4,
          total: 4,
        });
        const masterBoardPrompt = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: ['master_board_prompt'],
          phaseLabel: 'phase-4-master-board',
          overrideUserPrompt: [
            '# Storyboard Follow-Up User Prompt',
            '你正在基于已定稿 storyboard 继续生成单一 artifact。',
            '不要重复输出 stage context，不要重写 storyboard 规划。',
            '只继承下面的锁定摘要，并产出当前 call scope 指定的唯一 artifact。',
          ].join('\n\n'),
          additionalUserSections: [
            lockedStoryboardSummary,
            [
              '## Current Call Scope',
              '本轮不要重新规划故事板，也不要返回 `storyboard_prompt_pack`。',
              '请严格基于上面的已定稿 `storyboard_prompt_pack`，本轮只生成 `master_board_prompt`。',
              '该产物必须提炼项目级连续性、整板意图、最终板式约束，并服务于后续出板与视频阶段继承。',
            ].join('\n'),
          ],
        });

        return {
          runnerType: 'direct_llm',
          stage: input.stage,
          artifacts: {
            ...storyboardPromptPack,
            control_board_prompts: ensureStoryboardBoardTitle(
              controlBoardPrompts.control_board_prompts,
              'Control-Oriented Storyboard Board',
            ),
            style_board_prompts: ensureStoryboardBoardTitle(
              styleBoardPrompts.style_board_prompts,
              'Style & Rendering Storyboard Board',
            ),
            ...masterBoardPrompt,
          },
          requiredArtifacts: [...pack.outputContract.requiredArtifacts],
        };
      }

      if (input.stage === 'video_prompts') {
        const artifacts = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: pack.outputContract.requiredArtifacts,
          phaseLabel: 'single-phase-video-prompts',
          additionalUserSections: [
            buildVideoPromptsHardRules(),
            buildVideoPromptsPackStructureRules(stageContext),
          ].filter(Boolean),
        });

        return {
          runnerType: 'direct_llm',
          stage: input.stage,
          artifacts,
          requiredArtifacts: [...pack.outputContract.requiredArtifacts],
        };
      }

      const performanceLocked =
        input.stage === 'performance'
          ? buildPerformanceLockedBlockFromStageContext(stageContext.requiredInputs)
          : '';

      const storyHardRules = input.stage === 'story' ? buildStoryHardRules() : '';

      const artifacts = await invokeDirectLlmPhase(deps, {
        input,
        settings,
        systemPrompt,
        userPrompt,
        requiredArtifacts: pack.outputContract.requiredArtifacts,
        phaseLabel: 'single-phase',
        additionalUserSections: [
          ...(performanceLocked ? [performanceLocked] : []),
          ...(storyHardRules ? [storyHardRules] : []),
        ].filter(Boolean),
      });

      if (storyDirectionNeedsChineseRetry(input.stage, artifacts)) {
        const retriedArtifacts = await invokeDirectLlmPhase(deps, {
          input,
          settings,
          systemPrompt,
          userPrompt,
          requiredArtifacts: pack.outputContract.requiredArtifacts,
          phaseLabel: 'single-phase-story-chinese-retry',
          additionalUserSections: [
            ...(storyHardRules ? [storyHardRules] : []),
            STORY_CHINESE_RETRY_USER_APPENDIX,
          ],
        });
        if (storyDirectionNeedsChineseRetry(input.stage, retriedArtifacts)) {
          throw new SceneDirectLlmRunnerError(
            'SCENE_DIRECT_LLM_INVOKE_FAILED',
            'Story 阶段连续两次生成仍未满足“中文主导”硬性规则。请更换模型或收紧上游参考后重试。',
          );
        }
        return {
          runnerType: 'direct_llm',
          stage: input.stage,
          artifacts: retriedArtifacts,
          requiredArtifacts: [...pack.outputContract.requiredArtifacts],
        };
      }

      return {
        runnerType: 'direct_llm',
        stage: input.stage,
        artifacts,
        requiredArtifacts: [...pack.outputContract.requiredArtifacts],
      };
    },
  };
}
