import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const VIDEO_REQUIRED_ARTIFACTS = ['video_prompt_pack_cn', 'video_prompt_review', 'video_prompt_trace'] as const;
const VIDEO_OPTIONAL_ARTIFACTS = ['video_prompt_pack', 'video_prompt_pack_en'] as const;
const VIDEO_REVIEW_REQUIRED_MARKERS = [
  'review_status',
  'review_round',
  'issues_found',
  'auto_fixes_applied',
  'final_delivery_ready',
] as const;
const VIDEO_TRACE_REQUIRED_MARKERS = [
  'actual_inputs_used',
  'pack_mapping',
  'segment_trace',
  'optional_input_effectiveness',
  'continuity_sources',
  'open_risks',
] as const;

const VIDEO_PACK_REQUIRED_MARKERS = [
  'video_prompt_pack_plan',
  'global_execution_preamble',
  '故事板关键帧参考规则',
  '项目级全局锁定规则',
  'segment_sound_execution',
] as const;
const VIDEO_PACK_FORBIDDEN_MARKERS = [
  'pack_audio_execution_plan',
  'project_level_global_rules',
  'prompt_trace',
  '## video_prompt_review',
  '## video_prompt_trace',
  '可直接复制使用块',
] as const;

const VIDEO_SOUND_REQUIRED_MARKERS = ['BGM', 'Foley-SFX', 'Ambience', 'Silence'] as const;

const VIDEO_COPY_READY_BLOCK_MARKERS = [
  '故事板关键帧参考规则',
  '项目级全局锁定规则',
] as const;

const VIDEO_STORYBOARD_REFERENCE_OPENERS = ['将"控制故事板 Pack', '将“控制故事板 Pack'] as const;
const VIDEO_PROJECT_LOCK_RULE_ITEMS = [
  '主场景',
  '角色锁定',
  '不重复角色',
  '画面可读性',
  '风格锁定',
  '灯光锁定',
  '负向边界',
] as const;
const VIDEO_NEXT_HANDOFF_MARKERS = [
  'next_handoff',
  'next handoff',
  'next-handoff',
  '下一段交接',
  '下一段承接',
  '下一步承接',
  '后续承接',
  '衔接到下一段',
  '交给下一段',
  '全片终点',
  '收束到终点',
] as const;
const VOICE_CONTINUITY_HINTS = ['voice_identity_lock', 'speaker_voice_notes', 'segment_voice_continuity', '人声', '台词', '呼吸', '笑声'] as const;
const VIDEO_SHOT_TIMECODE_PATTERN =
  /(?:\*\*)?(?:C|Shot)\s*\d+\s*\[\d{2}:\d{2}(?:\.\d+)?\s*[-–]\s*\d{2}:\d{2}(?:\.\d+)?\](?:\*\*)?/i;
const VIDEO_TECH_CONTROL_MIN_CHARS = 80;
const VIDEO_CONTINUITY_MARKERS = ['continuity_in', 'continuity out', 'continuity_out', '承接', '连续性输入', '连续性输出', '衔接'] as const;
const VIDEO_BLOCKING_MARKERS = ['blocking', '动作设计', '动作控制', '动作', '走位', '站位', '调度'] as const;
const VIDEO_BLOCKING_FALLBACK_PATTERN =
  /角色|人物|主体|镜头(?:内)?(?:由|从)|位于|保持在|转向|面向|靠近|远离|前进|后退|起身|停下|抬手|转头|直视|对视/i;
const VIDEO_PROP_STATE_MARKERS = ['prop state', '道具状态', '角色状态', '物件状态', '状态'] as const;
const VIDEO_PROP_STATE_FALLBACK_PATTERN =
  /道具|物件|器物|装备|服饰|持有|携带|落位|待机|静止|运动|切换|保持.*(?:待机|静止|开启|关闭|原位)|进入.*准备/i;
const VIDEO_DIRECTOR_PROMPT_MIN_CHARS = 120;
const COPY_BLOCK_ID_PATTERN = /^pack-\d{2}$/;
const VIDEO_COPY_BLOCK_PATTERN = /<copy-block\b([^>]*)>([\s\S]*?)<\/copy-block>/gi;

type SceneCopyBlock = {
  type: string;
  id: string;
};

function toMissingErrorCode(artifactKey: string): string {
  return `SCENE_VIDEO_PROMPTS_MISSING_${artifactKey.toUpperCase()}`;
}

function extractSegmentNumbers(content: string): number[] {
  return Array.from(
    new Set(
      [...content.matchAll(/Segment\s*0*(\d+)/gi)].map((match) => Number.parseInt(match[1] ?? '', 10)).filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);
}

function extractVguNumbers(content: string): number[] {
  return Array.from(
    new Set(
      [...content.matchAll(/VGU[-\s_]*0*(\d+)/gi)].map((match) => Number.parseInt(match[1] ?? '', 10)).filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);
}

function extractPackNumbers(content: string): number[] {
  return Array.from(
    new Set(
      [...content.matchAll(/(?:视频提示词\s*第|控制故事板\s*Pack\s*|风格故事板\s*Pack\s*|Pack\s*0*)(\d+)/gi)]
        .map((match) => Number.parseInt(match[1] ?? '', 10))
        .filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);
}

function hasStoryboardPackPrimaryAuxReferences(content: string): boolean {
  if (VIDEO_STORYBOARD_REFERENCE_OPENERS.some((marker) => content.includes(marker))) {
    return true;
  }
  const hasControlRef =
    /控制故事板\s*Pack\s*0*\d+/i.test(content) ||
    /Control-Oriented Storyboard Board\s*Pack\s*0*\d+/i.test(content) ||
    (/动作与连续性主参考/u.test(content) &&
      /控制故事板|Control-Oriented Storyboard Board/u.test(content));
  const hasStyleRef =
    /风格故事板\s*Pack\s*0*\d+/i.test(content) ||
    /Style\s*&\s*Rendering Storyboard Board\s*Pack\s*0*\d+/i.test(content) ||
    (/渲染与氛围辅助参考/u.test(content) &&
      /风格故事板|Style\s*&\s*Rendering Storyboard Board/u.test(content));
  return hasControlRef && hasStyleRef;
}

function countShotTimecodes(content: string): number {
  return [...content.matchAll(new RegExp(VIDEO_SHOT_TIMECODE_PATTERN.source, 'gi'))].length;
}

function hasChineseLedBody(content: string): boolean {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const asciiLetters = (content.match(/[A-Za-z]/g) ?? []).length;
  return chineseChars >= 40 && chineseChars >= asciiLetters * 0.25;
}

function extractBlockBody(content: string, heading: string): string {
  const index = content.indexOf(heading);
  if (index < 0) return '';
  const rest = content.slice(index + heading.length);
  const nextMatch = rest.match(/\n【[^】]+】|\n##\s|\n###\s/);
  if (!nextMatch || nextMatch.index === undefined) {
    return rest.trim();
  }
  return rest.slice(0, nextMatch.index).trim();
}

function extractCopyBlockAttr(attrs: string, name: 'type' | 'id'): string {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseCopyBlocks(content: string): SceneCopyBlock[] {
  return [...content.matchAll(VIDEO_COPY_BLOCK_PATTERN)].map((match) => {
    const attrs = match[1] ?? '';
    return {
      type: extractCopyBlockAttr(attrs, 'type'),
      id: extractCopyBlockAttr(attrs, 'id'),
    };
  });
}

export async function validateVideoPromptsStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];
  const contentsByArtifact = new Map<string, string>();
  let missingPrimaryPack = false;

  for (const artifactKey of VIDEO_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `video_prompts.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'video_prompts' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toMissingErrorCode(artifactKey),
        level: 'error',
        message: `Video Prompts 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      if (artifactKey === 'video_prompt_pack_cn') {
        missingPrimaryPack = true;
      }
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_VIDEO_PROMPTS_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Video Prompts 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
      if (artifactKey === 'video_prompt_pack_cn') {
        missingPrimaryPack = true;
      }
      continue;
    }
    contentsByArtifact.set(artifactKey, content);
  }

  if (missingPrimaryPack) {
    return errors;
  }

  for (const artifactKey of VIDEO_OPTIONAL_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `video_prompts.${artifactKey}`);
    if (!artifact || artifact.kind !== 'final' || artifact.role !== 'core_generation_asset' || !artifact.coreAsset) {
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (content.trim()) {
      contentsByArtifact.set(artifactKey, content);
    }
  }

  const combined = [...contentsByArtifact.values()].join('\n');
  if (!/Segment\s*\d+/i.test(combined)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_SEGMENT_STRUCTURE',
      level: 'error',
      message: 'Video Prompts 缺少 Segment 基本结构。',
      suggestion: '请至少包含一个 Segment 段落。',
    });
  }

  const cnPack = contentsByArtifact.get('video_prompt_pack_cn') ?? '';
  const reviewPack = contentsByArtifact.get('video_prompt_review') ?? '';
  const tracePack = contentsByArtifact.get('video_prompt_trace') ?? '';
  const mainPack = contentsByArtifact.get('video_prompt_pack') ?? '';
  const enPack = contentsByArtifact.get('video_prompt_pack_en') ?? '';
  const primaryPack = cnPack || mainPack || enPack;

  const missingReviewMarkers = VIDEO_REVIEW_REQUIRED_MARKERS.filter(
    (marker) => !reviewPack.includes(marker),
  );
  if (missingReviewMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_REVIEW_MISSING_MARKERS',
      level: 'error',
      message: `Video Prompts 缺少正式 review 记录字段：${missingReviewMarkers.join('、')}`,
      suggestion:
        '请单独输出 video_prompt_review，并补齐 review_status、review_round、issues_found、auto_fixes_applied、final_delivery_ready。',
    });
  }

  const missingTraceMarkers = VIDEO_TRACE_REQUIRED_MARKERS.filter(
    (marker) => !tracePack.includes(marker),
  );
  if (missingTraceMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_TRACE_MISSING_MARKERS',
      level: 'error',
      message: `Video Prompts 缺少正式 trace 记录字段：${missingTraceMarkers.join('、')}`,
      suggestion:
        '请单独输出 video_prompt_trace，并补齐 actual_inputs_used、pack_mapping、segment_trace、optional_input_effectiveness、continuity_sources、open_risks。',
    });
  }

  const missingPackMarkers = VIDEO_PACK_REQUIRED_MARKERS.filter(
    (marker) => !primaryPack.includes(marker),
  );
  if (missingPackMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_PACK_MARKERS',
      level: 'error',
      message: `Video Prompts 缺少正式 pack 关键 section：${missingPackMarkers.join('、')}`,
      suggestion:
        '请补齐 video_prompt_pack_plan、global_execution_preamble、故事板关键帧参考规则、项目级全局锁定规则、Segment 技术控制说明、segment_sound_execution 和 Segment 导演长版提示词。',
    });
  }

  const forbiddenLegacyMarkers = VIDEO_PACK_FORBIDDEN_MARKERS.filter(
    (marker) => primaryPack.includes(marker),
  );
  if (forbiddenLegacyMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_LEGACY_PACK_STRUCTURE',
      level: 'error',
      message: `video_prompt_pack_cn 仍混入旧结构残留：${forbiddenLegacyMarkers.join('、')}`,
      suggestion:
        '请把 review / trace / 设计解释类旧结构移出主 pack，不要再保留 pack_audio_execution_plan、project_level_global_rules、prompt_trace、video_prompt_review、video_prompt_trace 或 可直接复制使用块容器。',
    });
  }

  const missingSoundMarkers = VIDEO_SOUND_REQUIRED_MARKERS.filter(
    (marker) => !primaryPack.includes(marker),
  );
  if (missingSoundMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_AUDIO_EXECUTION',
      level: 'error',
      message: `Video Prompts 缺少声音执行层：${missingSoundMarkers.join('、')}`,
      suggestion: '请在 segment_sound_execution 中明确补齐 BGM、Foley-SFX、Ambience、Silence。',
    });
  }

  const missingCopyReadyMarkers = VIDEO_COPY_READY_BLOCK_MARKERS.filter(
    (marker) => !primaryPack.includes(marker),
  );
  if (missingCopyReadyMarkers.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_COPY_READY_BLOCKS',
      level: 'error',
      message: `Video Prompts 缺少主交付执行块：${missingCopyReadyMarkers.join('、')}`,
      suggestion:
        '请直接在主 pack 中提供故事板关键帧参考规则、项目级全局锁定规则、Segment 技术控制说明和 Segment 导演长版提示词，不要再挂旧的“可直接复制使用块”容器。',
    });
  }

  const audioArtifact = artifacts.find((item) => item.id === 'audio.audio_design');
  if (audioArtifact) {
    const { content: audioContent } = await readSceneArtifact(projectDir, audioArtifact.id);
    const requiresVoiceBlock = VOICE_CONTINUITY_HINTS.some((marker) => audioContent.includes(marker));
    if (requiresVoiceBlock && !primaryPack.includes('#### Voice')) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_MISSING_VOICE_LAYER',
        level: 'error',
        message: 'Audio 已锁定人声连续性，但 video_prompt_pack_cn 缺少 Voice 声音层。',
        suggestion: '请在涉及台词/呼吸/笑声/说话人连续性的 segment_sound_execution 中新增 `#### Voice`，明确说话人身份、音色、节奏与段间一致性。',
      });
    }
  }

  if (!hasChineseLedBody(cnPack)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_CN_NOT_CHINESE_LED',
      level: 'error',
      message: 'video_prompt_pack_cn 不是中文主导正文，当前英文占比过高或中文结构过轻。',
      suggestion: '请用中文承担主体结构、技术控制说明和导演长版提示词；英文仅保留少量专业锚词。',
    });
  }

  const hasPackCoverage = /Pack\s*0*\d+/i.test(cnPack) && /Segment\s*0*\d+/i.test(cnPack);
  if (!hasPackCoverage) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_PACK_COVERAGE',
      level: 'error',
      message: 'Video Prompts 缺少 storyboard pack / segment 覆盖范围说明。',
      suggestion:
        '请在 video_prompt_pack_plan 中明确写出本包覆盖哪些 storyboard packs、哪些 segments，以及为何这样分包。',
    });
  }

  const copyBlocks = parseCopyBlocks(cnPack);
  if (copyBlocks.length === 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_COPY_BLOCKS',
      level: 'error',
      message: 'video_prompt_pack_cn 缺少 pack 级 copy-block。',
      suggestion:
        '请为每个正式 Pack 包上 `<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">...</copy-block>`。',
    });
  } else {
    const invalidTypeBlock = copyBlocks.find((block) => block.type !== 'video-pack');
    if (invalidTypeBlock) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_INVALID_COPY_BLOCK_TYPE',
        level: 'error',
        message: `video_prompt_pack_cn 存在非法 copy-block type：${invalidTypeBlock.type || '空值'}`,
        suggestion: '请把 video_prompt_pack_cn 的 copy-block type 统一改为 `video-pack`。',
      });
    }
    const invalidIdBlock = copyBlocks.find((block) => !COPY_BLOCK_ID_PATTERN.test(block.id));
    if (invalidIdBlock) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_INVALID_COPY_BLOCK_ID',
        level: 'error',
        message: `video_prompt_pack_cn 存在非法 copy-block id：${invalidIdBlock.id || '空值'}`,
        suggestion: '请把 video_prompt_pack_cn 的 copy-block id 改成 `pack-01` 这类两位数格式。',
      });
    }
  }

  if (!hasStoryboardPackPrimaryAuxReferences(cnPack)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_STORYBOARD_PACK_REFERENCES',
      level: 'error',
      message: 'Video Prompts 缺少“控制故事板 Pack XX / 风格故事板 Pack XX”主辅参考声明。',
      suggestion:
        '请在【故事板关键帧参考规则】中显式写出控制/风格故事板 Pack 的主辅参考（可用「将“控制故事板 Pack XX”作为…主参考；将“风格故事板 Pack XX”作为…辅助参考」，或用「动作与连续性主参考: 控制故事板 Pack XX」「渲染与氛围辅助参考: 风格故事板 Pack XX」）。',
    });
  }

  if (!/VGU[-\s_]*0*\d+/i.test(cnPack)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_VGU_TRACE',
      level: 'error',
      message: 'Video Prompts 缺少 VGU 继承标记。',
      suggestion: '请在 Segment 技术控制说明中明确写出本段承接的 VGU，例如 VGU-01、VGU-02。',
    });
  }

  if (!primaryPack.includes('Segment 总时间轴') || !VIDEO_SHOT_TIMECODE_PATTERN.test(primaryPack)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_TIMECODE_FLOW',
      level: 'error',
      message: 'Video Prompts 缺少 Segment 总时间轴或逐镜头时间码流。',
      suggestion:
        '请在导演长版提示词中补齐 Segment 总时间轴与逐镜头时间码，例如 Segment 总时间轴：00:00-00:10，以及 C01 [00:00-00:02] / Shot 17 [00:26–00:27.5] 这类镜头时间码。',
    });
  }

  const projectLockBody =
    extractBlockBody(cnPack, '【项目级全局锁定规则】') ||
    extractBlockBody(cnPack, '## 项目级全局锁定规则');
  const missingProjectLockItems = VIDEO_PROJECT_LOCK_RULE_ITEMS.filter(
    (marker) => !projectLockBody.includes(marker),
  );
  if (missingProjectLockItems.length > 0) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_PROJECT_LOCK_RULE_ITEMS',
      level: 'error',
      message: `Video Prompts 的项目级全局锁定规则缺少关键条目：${missingProjectLockItems.join('、')}`,
      suggestion: '请在 `【项目级全局锁定规则】` 中至少覆盖主场景、角色锁定、不重复角色、画面可读性、风格锁定、灯光锁定、负向边界。',
    });
  }

  const technicalControlBody = extractBlockBody(cnPack, '【Segment 01 技术控制说明】') || extractBlockBody(cnPack, '### Segment 01 技术控制说明');
  const technicalControlChars = technicalControlBody.replace(/\s+/g, '').length;
  const hasContinuityMarker = VIDEO_CONTINUITY_MARKERS.some((marker) => technicalControlBody.includes(marker));
  const hasBlockingMarker =
    VIDEO_BLOCKING_MARKERS.some((marker) => technicalControlBody.includes(marker)) ||
    VIDEO_BLOCKING_FALLBACK_PATTERN.test(technicalControlBody);
  const hasPropStateMarker =
    VIDEO_PROP_STATE_MARKERS.some((marker) => technicalControlBody.includes(marker)) ||
    VIDEO_PROP_STATE_FALLBACK_PATTERN.test(technicalControlBody);
  const hasNextHandoffMarker = VIDEO_NEXT_HANDOFF_MARKERS.some(
    (marker) => technicalControlBody.includes(marker),
  );
  const missingTechnicalDetails = [
    ...(!hasContinuityMarker ? ['continuity'] : []),
    ...(!hasBlockingMarker ? ['blocking'] : []),
    ...(!hasPropStateMarker ? ['prop state'] : []),
    ...(!hasNextHandoffMarker ? ['next_handoff'] : []),
  ];
  if (technicalControlChars < VIDEO_TECH_CONTROL_MIN_CHARS || missingTechnicalDetails.length > 0) {
    const reasons = [
      ...(technicalControlChars < VIDEO_TECH_CONTROL_MIN_CHARS ? ['正文过短'] : []),
      ...missingTechnicalDetails,
    ];
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_TECHNICAL_CONTROL_DETAILS',
      level: 'error',
      message: `Video Prompts 的技术控制说明展开不足：${reasons.join('、')}`,
      suggestion: '请让技术控制说明用完整自然语言写出承接输入、动作控制、状态连续和后续交接；不要求固定写成 blocking / prop state / next_handoff 这些字面量，但要把这些结构说清楚。',
    });
  }

  const directorPromptBody = extractBlockBody(cnPack, '【Segment 01 导演长版提示词】') || extractBlockBody(cnPack, '### Segment 01 导演长版提示词');
  const directorPromptShotCount = countShotTimecodes(directorPromptBody);
  const directorPromptChars = directorPromptBody.replace(/\s+/g, '').length;
  if (directorPromptShotCount === 0 || directorPromptChars < VIDEO_DIRECTOR_PROMPT_MIN_CHARS) {
    const reasons: string[] = [];
    if (directorPromptShotCount === 0) reasons.push('缺少逐镜头时间码正文');
    if (directorPromptChars < VIDEO_DIRECTOR_PROMPT_MIN_CHARS) reasons.push('正文过短');
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_DIRECTOR_PROMPT_DETAILS',
      level: 'error',
      message: `Video Prompts 的导演长版提示词展开不足：${reasons.join('、')}`,
      suggestion: '请让导演长版提示词按时间轴逐镜头展开，并用完整自然语言写够镜头正文；需要覆盖镜头维度，但不要求固定措辞或案例词表。',
    });
  }

  const storyboardArtifact = artifacts.find((item) => item.id === 'storyboard.storyboard_prompt_pack');
  if (storyboardArtifact) {
    const { content: storyboardContent } = await readSceneArtifact(projectDir, storyboardArtifact.id);
    const storyboardPacks = extractPackNumbers(storyboardContent);
    const videoPacks = extractPackNumbers(cnPack);
    if (
      storyboardPacks.length > 0 &&
      videoPacks.length > 0 &&
      (storyboardPacks.length !== videoPacks.length ||
        storyboardPacks.some((pack, index) => pack !== videoPacks[index]))
    ) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_PACK_MISMATCH_WITH_STORYBOARD',
        level: 'error',
        message: 'Video Prompts 的 Pack 数量或顺序与 storyboard 主包不一致。',
        suggestion: '请让 `video_prompt_pack_cn` 严格继承 storyboard 已确认的 Pack 数量、顺序与覆盖范围，不要擅自压缩或扩包。',
      });
    }

    const storyboardSegments = extractSegmentNumbers(storyboardContent);
    const videoSegments = extractSegmentNumbers(cnPack);
    if (
      storyboardSegments.length > 0 &&
      videoSegments.length > 0 &&
      (storyboardSegments.length !== videoSegments.length ||
        storyboardSegments.some((segment, index) => segment !== videoSegments[index]))
    ) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_SEGMENT_MISMATCH_WITH_STORYBOARD',
        level: 'error',
        message: 'Video Prompts 的 Segment 范围与 storyboard 主包不一致。',
        suggestion: '请让 video_prompt_pack_plan 与各 Segment 标题严格继承 storyboard 已确认的 Segment 范围与顺序。',
      });
    }

    const storyboardVgus = extractVguNumbers(storyboardContent);
    const videoVgus = extractVguNumbers(cnPack);
    if (
      storyboardVgus.length > 0 &&
      videoVgus.length > 0 &&
      !videoVgus.every((vgu) => storyboardVgus.includes(vgu))
    ) {
      errors.push({
        code: 'SCENE_VIDEO_PROMPTS_VGU_MISMATCH_WITH_STORYBOARD',
        level: 'error',
        message: 'Video Prompts 引用了 storyboard 未确认的 VGU 编号。',
        suggestion: '请只继承 storyboard 主包已确认的 VGU 编号，并保持 pack 规划、shot continuity 与 VGU 对齐。',
      });
    }
  }

  if (/YAML|参数表|key-value|compiled prompt|编译 Prompt/i.test(combined) && !combined.includes('自然语言')) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_FORMAT_DRIFT',
      level: 'warning',
      message: 'Video Prompts 出现参数表/编译稿倾向，可能偏离正式导演级 pack 体裁。',
      suggestion: '请优先输出自然语言技术控制说明与可直接复制的导演长版提示词，不要退化成参数表或编译摘要。',
    });
  }

  return errors;
}
