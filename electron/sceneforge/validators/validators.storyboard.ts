import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const STORYBOARD_REQUIRED_ARTIFACTS = [
  'storyboard_prompt_pack',
  'control_board_prompts',
  'style_board_prompts',
  'master_board_prompt',
] as const;

const STORYBOARD_PACK_REQUIRED_MARKERS = [
  'storyboard_prompt_pack',
  'beat_skeleton',
  'storyboard_content_breakdown',
  'cinematic_language_plan',
  'video_generation_units',
  'shot_continuity_plan',
  'continuity_control_system',
  'storyboard_prompt_pack_plan',
  'storyboard_quality_check',
  'design_reconciliation_review',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** snake_case marker 或 `## 1. Beat Skeleton (中文)` 等 Title Case 章节标题 */
function storyboardPackMarkerPresent(content: string, marker: string): boolean {
  if (content.includes(marker)) {
    return true;
  }
  const titleCase = marker
    .split('_')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');
  const escapedSnake = escapeRegExp(marker);
  const escapedTitle = escapeRegExp(titleCase);
  const headingPattern = new RegExp(
    `^##\\s+(?:\\d+\\.\\s*)?(?:${escapedSnake}|${escapedTitle})(?:\\s|\\(|$)`,
    'im',
  );
  if (headingPattern.test(content)) {
    return true;
  }
  if (marker === 'storyboard_prompt_pack') {
    if (/^#\s+Storyboard Prompt Pack\b/im.test(content)) {
      return true;
    }
  }
  return false;
}

const CONTROL_BOARD_REQUIRED_MARKERS = ['Control-Oriented Storyboard Board'] as const;

const STYLE_BOARD_REQUIRED_MARKERS = ['Style & Rendering Storyboard Board'] as const;

const STORYBOARD_PACK_PLAN_REQUIRED_MARKERS = ['总镜头数', '单包', '多包', 'Pack'] as const;
const COPY_BLOCK_ID_PATTERN = /^pack-\d{2}$/;
const STORYBOARD_COPY_BLOCK_PATTERN = /<copy-block\b([^>]*)>([\s\S]*?)<\/copy-block>/gi;
const SEGMENT_DENSITY_RULES: Record<
  number,
  {
    hard: [number, number];
    pacing: Record<'lyrical' | 'balanced' | 'kinetic', [number, number]>;
  }
> = {
  5: { hard: [3, 8], pacing: { lyrical: [3, 5], balanced: [4, 6], kinetic: [5, 8] } },
  6: { hard: [4, 9], pacing: { lyrical: [4, 6], balanced: [5, 7], kinetic: [6, 9] } },
  8: { hard: [5, 10], pacing: { lyrical: [5, 7], balanced: [6, 8], kinetic: [7, 10] } },
  10: { hard: [6, 12], pacing: { lyrical: [6, 8], balanced: [6, 10], kinetic: [7, 12] } },
  15: { hard: [8, 16], pacing: { lyrical: [8, 11], balanced: [10, 13], kinetic: [12, 16] } },
};

type SceneCopyBlock = {
  type: string;
  id: string;
  label: string;
  body: string;
};

type StoryboardSegmentPlan = {
  segmentNumber: number;
  start: number;
  end: number;
  pacingProfile: 'lyrical' | 'balanced' | 'kinetic';
  shotCount: number;
};

function toMissingErrorCode(artifactKey: string): string {
  return `SCENE_STORYBOARD_MISSING_${artifactKey.toUpperCase()}`;
}

function extractCopyBlockAttr(attrs: string, name: 'type' | 'id' | 'label'): string {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseCopyBlocks(content: string): SceneCopyBlock[] {
  return [...content.matchAll(STORYBOARD_COPY_BLOCK_PATTERN)].map((match) => {
    const attrs = match[1] ?? '';
    return {
      type: extractCopyBlockAttr(attrs, 'type'),
      id: extractCopyBlockAttr(attrs, 'id'),
      label: extractCopyBlockAttr(attrs, 'label'),
      body: (match[2] ?? '').trim(),
    };
  });
}

function hasPackHeading(body: string): boolean {
  return /^##\s*Pack\s+\d+\s*:/im.test(body);
}

function mentionsStoryboardArrowRule(content: string): boolean {
  const hasRedArrow =
    content.includes('红色人物运动箭头') ||
    content.includes('红色箭头') ||
    content.includes('红色道具运动箭头') ||
    /红色.{0,12}箭头/u.test(content);
  const hasBlueArrow =
    content.includes('蓝色摄影机运动箭头') ||
    content.includes('蓝色镜头运动箭头') ||
    content.includes('蓝色摄影机运动') ||
    (content.includes('蓝色') && content.includes('摄影机')) ||
    /蓝色.{0,12}(摄影机|镜头).{0,12}箭头/u.test(content) ||
    /画面内无摄影机运动/u.test(content);
  const mentionsInsideFrame =
    content.includes('画面区内部') ||
    content.includes('画面内部') ||
    content.includes('分镜画面区内部') ||
    content.includes('画面区内') ||
    content.includes('画面内控制标注') ||
    /画面内/u.test(content) ||
    /标在.{0,24}画面/u.test(content) ||
    /画面.{0,16}标出/u.test(content);
  return hasRedArrow && hasBlueArrow && mentionsInsideFrame;
}

function hasBoardDescriptionDensity(content: string): boolean {
  const dimensionHits = [
    /(?:景别|特写|近景|中景|远景|全景|大特写|中近景|中远景|广角|建立镜头)/u,
    /(?:机位|仰拍|俯拍|低角度|高角度|侧面镜头|正面镜头)/u,
    /(?:构图|画面重心|构图重心|透视|向心透视)/u,
    /(?:空间关系|空间层次|前中后景|前景|背景景|层次感|纵深)/u,
    /(?:主体姿态|表演状态|表演|视线|眼神|表情|姿态)/u,
    /(?:光线|光影|光线方向|逆光|轮廓光|斜射|侧光)/u,
    /(?:材质|环境细节|空气感|质感|纹理)/u,
    /(?:镜头运动结果|镜头运动|摄影机运动|跟拍|横移|平移|推入|下摇|环绕|固定机位|后退跟拍)/u,
    /(?:叙事目的|叙事重点|此镜头旨在|此镜头用于|此镜头展示|此镜头强调|此镜头作为)/u,
  ].filter((pattern) => pattern.test(content));
  return dimensionHits.length >= 5;
}

function hasBoardControlSections(content: string): boolean {
  return [
    'Panel Layout',
    'Beat Line',
    'Camera Path',
    'Action Path',
    'Continuity Rules',
    'Color Legend',
  ].every((marker) => content.includes(marker));
}

function extractShotCount(content: string): number | null {
  const patterns = [
    /总镜头数\s*[:：]\s*(\d+)/i,
    /总镜头数\s*[\(（]total_shots[\)）]\s*\*{0,2}\s*[:：]\s*(\d+)/i,
    /总镜头数\s*[\(（]total_shots[\)）]\s*[:：]\s*(\d+)/i,
    /\btotal_shots\b\s*\*{0,2}\s*[:：]\s*(\d+)/i,
    /总镜头数\s*[\(（]total_shots[\)）][^\d]{0,24}(\d+)\s*个镜头/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? '', 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function extractSegmentDurationSeconds(content: string): number | null {
  const patterns = [
    /`?segment_duration_seconds`?\s*[:：]\s*(\d+(?:\.\d+)?)/i,
    /`?segment_duration_seconds`?\s*锁定为\s*(\d+(?:\.\d+)?)/i,
    /`?segment_duration_seconds`?\s*为\s*(\d+(?:\.\d+)?)\s*秒/i,
    /分段时长\s*[:：]\s*(\d+(?:\.\d+)?)\s*s?/i,
    /segment\s*duration\s*[:：]\s*(\d+(?:\.\d+)?)\s*s?/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match) continue;
    const value = Number.parseFloat(match[1] ?? '');
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function normalizePacingProfile(raw: string): StoryboardSegmentPlan['pacingProfile'] | null {
  const lowered = raw.toLowerCase();
  if (lowered.includes('lyrical')) return 'lyrical';
  if (lowered.includes('balanced')) return 'balanced';
  if (lowered.includes('kinetic')) return 'kinetic';
  return null;
}

function extractStoryboardSegmentPlansFromTable(content: string): StoryboardSegmentPlan[] {
  const rowPattern =
    /\|\s*\*{0,2}Segment\s*(\d+)\*{0,2}\s*\|\s*(\d+(?:\.\d+)?)\s*s?\s*-\s*(\d+(?:\.\d+)?)\s*s?\s*\|\s*(\d+(?:\.\d+)?)\s*s?\s*\|\s*([^|]+)\|\s*(\d+)\s*\|/gi;
  return [...content.matchAll(rowPattern)]
    .map((match) => {
      const pacingProfile = normalizePacingProfile(match[5] ?? '');
      return {
        segmentNumber: Number.parseInt(match[1] ?? '', 10),
        start: Number.parseFloat(match[2] ?? ''),
        end: Number.parseFloat(match[3] ?? ''),
        pacingProfile: pacingProfile ?? 'balanced',
        shotCount: Number.parseInt(match[6] ?? '', 10),
      };
    })
    .filter(
      (plan) =>
        Number.isFinite(plan.segmentNumber) &&
        Number.isFinite(plan.start) &&
        Number.isFinite(plan.end) &&
        plan.end > plan.start &&
        Number.isFinite(plan.shotCount) &&
        plan.shotCount > 0,
    );
}

function extractStoryboardSegmentPlansFromProse(content: string): StoryboardSegmentPlan[] {
  const linePattern =
    /\*\*Segment\s*(\d+)\s*\*{0,2}\s*[:：][^\n]*?时间区间\s*`?(\d+(?:\.\d+)?)\s*s?\s*-\s*(\d+(?:\.\d+)?)\s*s?`?[^\n]*?节奏类型\s*`?(lyrical|balanced|kinetic)`?[^\n]*?镜头数\s*`?(\d+)`?/gi;
  return [...content.matchAll(linePattern)]
    .map((match) => ({
      segmentNumber: Number.parseInt(match[1] ?? '', 10),
      start: Number.parseFloat(match[2] ?? ''),
      end: Number.parseFloat(match[3] ?? ''),
      pacingProfile: (match[4] ?? 'balanced').toLowerCase() as StoryboardSegmentPlan['pacingProfile'],
      shotCount: Number.parseInt(match[5] ?? '', 10),
    }))
    .filter(
      (plan) =>
        Number.isFinite(plan.segmentNumber) &&
        Number.isFinite(plan.start) &&
        Number.isFinite(plan.end) &&
        plan.end > plan.start &&
        Number.isFinite(plan.shotCount) &&
        plan.shotCount > 0,
    );
}

function extractStoryboardSegmentPlansFromHeadings(content: string): StoryboardSegmentPlan[] {
  const headingPattern =
    /(?:^|\n)\s*(?:-\s*)?\*{0,2}Segment\s*(\d+)\s*(?:\([^)]*?(\d+(?:\.\d+)?)\s*s?\s*-\s*(\d+(?:\.\d+)?)\s*s?[^)]*\))?/gi;
  const shotBySegment = new Map<number, number>();
  for (const match of content.matchAll(
    /\*\*Segment\s*(\d+)\s*\*{0,2}[^\n]*?镜头数\s*`?(\d+)`?/gi,
  )) {
    const segmentNumber = Number.parseInt(match[1] ?? '', 10);
    const shotCount = Number.parseInt(match[2] ?? '', 10);
    if (Number.isFinite(segmentNumber) && Number.isFinite(shotCount) && shotCount > 0) {
      shotBySegment.set(segmentNumber, shotCount);
    }
  }
  const plans: StoryboardSegmentPlan[] = [];
  for (const match of content.matchAll(headingPattern)) {
    const segmentNumber = Number.parseInt(match[1] ?? '', 10);
    const start = Number.parseFloat(match[2] ?? '');
    const end = Number.parseFloat(match[3] ?? '');
    const shotCount = shotBySegment.get(segmentNumber);
    if (
      !Number.isFinite(segmentNumber) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      shotCount == null
    ) {
      continue;
    }
    plans.push({
      segmentNumber,
      start,
      end,
      pacingProfile: 'balanced',
      shotCount,
    });
  }
  return plans;
}

function extractStoryboardSegmentPlansFromNestedBullets(content: string): StoryboardSegmentPlan[] {
  const segmentBlocks = [
    ...content.matchAll(
      /\*{0,2}Segment\s*(\d+)\s*\*{0,2}\s*[:：][\s\S]*?(?=\*{0,2}Segment\s*\d+\s*\*{0,2}\s*[:：]|##\s|\n---\n|$)/gi,
    ),
  ];
  const plans: StoryboardSegmentPlan[] = [];
  for (const block of segmentBlocks) {
    const segmentNumber = Number.parseInt(block[1] ?? '', 10);
    const body = block[0] ?? '';
    const timeMatch = body.match(
      /`?time_range`?\s*[:：]\s*(\d+(?:\.\d+)?)\s*s?\s*-\s*(\d+(?:\.\d+)?)\s*s?/i,
    );
    const pacingMatch = body.match(
      /`?pacing_profile`?\s*[:：]\s*(lyrical|balanced|kinetic)/i,
    );
    const shotMatch = body.match(/`?shot_count`?\s*[:：]\s*(\d+)/i);
    if (!timeMatch || !shotMatch || !Number.isFinite(segmentNumber)) continue;
    const pacingProfile = (pacingMatch?.[1] ?? 'balanced').toLowerCase() as StoryboardSegmentPlan['pacingProfile'];
    const start = Number.parseFloat(timeMatch[1] ?? '');
    const end = Number.parseFloat(timeMatch[2] ?? '');
    const shotCount = Number.parseInt(shotMatch[1] ?? '', 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || shotCount <= 0) continue;
    plans.push({ segmentNumber, start, end, pacingProfile, shotCount });
  }
  return plans;
}

function extractStoryboardSegmentPlansFromBullets(content: string): StoryboardSegmentPlan[] {
  return [...content.matchAll(/Segment\s*0*(\d+)(?:[\s\S]*?)`?time_range`?\s*[:：]\s*(\d+(?:\.\d+)?)s?\s*-\s*(\d+(?:\.\d+)?)s(?:[\s\S]*?)`?pacing_profile`?\s*[:：]\s*(lyrical|balanced|kinetic)(?:[\s\S]*?)`?shot_count`?\s*[:：]\s*(\d+)/gi)]
    .map((match) => ({
      segmentNumber: Number.parseInt(match[1] ?? '', 10),
      start: Number.parseFloat(match[2] ?? ''),
      end: Number.parseFloat(match[3] ?? ''),
      pacingProfile: (match[4] ?? '').toLowerCase() as StoryboardSegmentPlan['pacingProfile'],
      shotCount: Number.parseInt(match[5] ?? '', 10),
    }))
    .filter(
      (plan) =>
        Number.isFinite(plan.segmentNumber) &&
        Number.isFinite(plan.start) &&
        Number.isFinite(plan.end) &&
        plan.end > plan.start &&
        Number.isFinite(plan.shotCount) &&
        plan.shotCount > 0,
    );
}

function extractStoryboardSegmentPlans(content: string): StoryboardSegmentPlan[] {
  const byNumber = new Map<number, StoryboardSegmentPlan>();
  for (const plan of [
    ...extractStoryboardSegmentPlansFromBullets(content),
    ...extractStoryboardSegmentPlansFromNestedBullets(content),
    ...extractStoryboardSegmentPlansFromTable(content),
    ...extractStoryboardSegmentPlansFromProse(content),
    ...extractStoryboardSegmentPlansFromHeadings(content),
  ]) {
    byNumber.set(plan.segmentNumber, plan);
  }
  return [...byNumber.values()].sort((a, b) => a.segmentNumber - b.segmentNumber);
}

function hasStoryboardRhythmSignals(content: string): boolean {
  return (
    extractSegmentDurationSeconds(content) != null ||
    /segment_duration_seconds/i.test(content) ||
    /Segment\s*\d+/i.test(content)
  );
}

function inferSegmentDurationSecondsFromPlans(
  plans: StoryboardSegmentPlan[],
): number | null {
  if (plans.length === 0) return null;
  const durations = plans
    .map((plan) => Number.parseFloat((plan.end - plan.start).toFixed(3)))
    .filter((duration) => Number.isFinite(duration) && duration > 0);
  if (durations.length !== plans.length) {
    return null;
  }
  const [firstDuration] = durations;
  if (firstDuration == null) {
    return null;
  }
  const sameDuration = durations.every((duration) => Math.abs(duration - firstDuration) < 0.001);
  return sameDuration ? firstDuration : null;
}

function crossesSegmentBoundary(
  plan: Pick<StoryboardSegmentPlan, 'start' | 'end'>,
  segmentDurationSeconds: number,
): boolean {
  const startBucket = Math.floor(plan.start / segmentDurationSeconds);
  const endBucket = Math.floor((plan.end - 0.0001) / segmentDurationSeconds);
  return startBucket !== endBucket;
}

export async function validateStoryboardStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of STORYBOARD_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `storyboard.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'storyboard' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toMissingErrorCode(artifactKey),
        level: 'error',
        message: `Storyboard 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_STORYBOARD_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Storyboard 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
      continue;
    }

    if (artifactKey === 'storyboard_prompt_pack') {
      const missingMarkers = STORYBOARD_PACK_REQUIRED_MARKERS.filter(
        (marker) => !storyboardPackMarkerPresent(content, marker),
      );
      if (missingMarkers.length > 0) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_MISSING_SYSTEM_MARKERS',
          level: 'error',
          message: `Storyboard 主包缺少关键导演级 marker：${missingMarkers.join('、')}`,
          suggestion:
            '请补齐 beat_skeleton、video_generation_units、shot_continuity_plan、storyboard_prompt_pack_plan、storyboard_quality_check 和 design_reconciliation_review 等正式 section。',
        });
      }
      const hasShotCount = content.includes('总镜头数') || /total_shots/i.test(content);
      const hasPackDecision = content.includes('单包') || content.includes('多包');
      const hasChinese = /[\u4e00-\u9fff]/.test(content);
      if (!hasShotCount || !hasPackDecision) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_MISSING_PACK_PLAN_RULES',
          level: 'error',
          message: 'Storyboard 主包缺少总镜头数或单包/多包拆包决策。',
          suggestion:
            '请在 storyboard_prompt_pack_plan 中明确总镜头数、是否单包或多包，以及每个 pack 覆盖的镜头范围。',
        });
      }

      const segmentPlans = extractStoryboardSegmentPlans(content);
      const segmentDurationSeconds =
        extractSegmentDurationSeconds(content) ??
        inferSegmentDurationSecondsFromPlans(segmentPlans);

      if (segmentPlans.length === 0 && !hasStoryboardRhythmSignals(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_MISSING_RHYTHM_CONTRACT',
          level: 'error',
          message: 'Storyboard 主包缺少 segment_duration_seconds 或逐段节奏规划行。',
          suggestion:
            '请在 storyboard_prompt_pack_plan 中显式写出 segment_duration_seconds，并为每个 Segment 给出 time_range、pacing_profile、shot_count 与 boundary_lock。',
        });
      } else if (segmentPlans.length > 0 && segmentDurationSeconds) {
        const totalShots = extractShotCount(content);
        const summedShots = segmentPlans.reduce((sum, plan) => sum + plan.shotCount, 0);
        if (totalShots != null && totalShots !== summedShots) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_SHOT_COUNT_MISMATCH',
            level: 'error',
            message: 'Storyboard 主包的总镜头数与分段 shot_count 汇总不一致。',
            suggestion:
              '请让 storyboard_prompt_pack_plan 中的总镜头数与各 Segment 的 shot_count 之和保持一致。',
          });
        }

        const invalidBoundaryPlan = segmentPlans.find((plan) =>
          crossesSegmentBoundary(plan, segmentDurationSeconds),
        );
        if (invalidBoundaryPlan) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_SEGMENT_BOUNDARY_CROSSED',
            level: 'error',
            message: `Storyboard 存在跨段 Segment 规划：Segment ${String(invalidBoundaryPlan.segmentNumber).padStart(2, '0')} 的 time_range 跨越了已锁定段界。`,
            suggestion:
              '请让每个 Segment 的 time_range 完整落在单一段界内；例如 10 秒分段下，不得出现 9s-13s 这类跨段区间。',
          });
        }

        const densityErrorPlan = segmentPlans.find((plan) => {
          const duration = Math.round(plan.end - plan.start);
          const rule = SEGMENT_DENSITY_RULES[duration];
          if (!rule) return false;
          const [minHard, maxHard] = rule.hard;
          return plan.shotCount < minHard || plan.shotCount > maxHard;
        });
        if (densityErrorPlan) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_INVALID_SHOT_DENSITY',
            level: 'warning',
            message: `Storyboard 的 Segment ${String(densityErrorPlan.segmentNumber).padStart(2, '0')} 镜头密度不在推荐硬区间内。`,
            suggestion:
              '建议让每个 Segment 的 shot_count 落在对应段长的硬区间内：5s=3-8，6s=4-9，8s=5-10，10s=6-12，15s=8-16；若叙事上刻意低密度，可保留并在 quality_check 中说明。',
          });
        }

        const pacingMismatchPlan = segmentPlans.find((plan) => {
          const duration = Math.round(plan.end - plan.start);
          const rule = SEGMENT_DENSITY_RULES[duration];
          if (!rule) return false;
          const [minPreferred, maxPreferred] = rule.pacing[plan.pacingProfile];
          return plan.shotCount < minPreferred || plan.shotCount > maxPreferred;
        });
        if (pacingMismatchPlan) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_PACING_MISMATCH',
            level: 'warning',
            message: `Storyboard 的 Segment ${String(pacingMismatchPlan.segmentNumber).padStart(2, '0')} 镜头密度与 pacing_profile 不匹配。`,
            suggestion:
              '请让 lyrical 靠低密度、balanced 靠中密度、kinetic 靠高密度；不要让抒情段过碎，也不要让高速动作段镜头过少。',
          });
        }
      } else if (hasStoryboardRhythmSignals(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_RHYTHM_CONTRACT_PARTIAL',
          level: 'warning',
          message:
            'Storyboard 主包已写出分段节奏信息，但未能完整解析为机器可校验的 Segment 行；已跳过段界与镜头密度硬校验。',
          suggestion:
            '建议在 storyboard_prompt_pack_plan 中补充表格或列表：每个 Segment 的 time_range、pacing_profile（lyrical/balanced/kinetic）、shot_count；并写出 segment_duration_seconds 或「锁定为 N 秒」。',
        });
      }
      if (!hasChinese) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_NOT_CHINESE_LED',
          level: 'error',
          message: 'Storyboard 主包不是中文主导内容。',
          suggestion: '请以中文为主重写 storyboard_prompt_pack；英文只保留必要专业术语，除非用户明确要求全英文。',
        });
      }
      const copyBlocks = parseCopyBlocks(content);
      if (copyBlocks.length === 0) {
        errors.push({
          code: 'SCENE_STORYBOARD_PACK_MISSING_COPY_BLOCKS',
          level: 'error',
          message: 'storyboard_prompt_pack 缺少 pack 级 copy-block。',
          suggestion:
            '请为每个正式 Pack 包上 `<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">...</copy-block>`。',
        });
      } else {
        const invalidTypeBlock = copyBlocks.find((block) => block.type !== 'storyboard-pack');
        if (invalidTypeBlock) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_INVALID_COPY_BLOCK_TYPE',
            level: 'error',
            message: `storyboard_prompt_pack 存在非法 copy-block type：${invalidTypeBlock.type || '空值'}`,
            suggestion: '请把 storyboard_prompt_pack 的 copy-block type 统一改为 `storyboard-pack`。',
          });
        }
        const invalidIdBlock = copyBlocks.find((block) => !COPY_BLOCK_ID_PATTERN.test(block.id));
        if (invalidIdBlock) {
          errors.push({
            code: 'SCENE_STORYBOARD_PACK_INVALID_COPY_BLOCK_ID',
            level: 'error',
            message: `storyboard_prompt_pack 存在非法 copy-block id：${invalidIdBlock.id || '空值'}`,
            suggestion: '请把 storyboard_prompt_pack 的 copy-block id 改成 `pack-01` 这类两位数格式。',
          });
        }
      }
    }

    if (artifactKey === 'control_board_prompts') {
      const missingMarkers = CONTROL_BOARD_REQUIRED_MARKERS.filter(
        (marker) => !content.includes(marker),
      );
      const copyBlocks = parseCopyBlocks(content);
      const invalidIdBlock = copyBlocks.find((block) => !COPY_BLOCK_ID_PATTERN.test(block.id));
      const invalidPackBody = copyBlocks.find((block) => !hasPackHeading(block.body));
      if (missingMarkers.length > 0 || copyBlocks.length === 0 || invalidIdBlock || invalidPackBody) {
        errors.push({
          code: 'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_FORMAT',
          level: 'error',
          message:
            copyBlocks.length === 0
              ? '控制板提示词缺少 pack 级 copy-block 包裹。'
              : invalidIdBlock
                ? `控制板提示词存在非法 copy-block id：${invalidIdBlock.id || '空值'}`
                : invalidPackBody
                  ? '控制板提示词的 copy-block 正文缺少 `## Pack N:` 分包标题。'
                  : `控制板提示词缺少正式整板结构 marker：${missingMarkers.join('、')}`,
          suggestion:
            '请按新 storyboard board contract 重写 control_board_prompts：每个 Pack 用 `<copy-block ...>` 包裹，使用 `pack-01` 这类 id，并在块内以 `## Pack 1:` 起头，同时保留 `Control-Oriented Storyboard Board` 标题。',
        });
      }
      if (!mentionsStoryboardArrowRule(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_ARROW_RULES',
          level: 'error',
          message: '控制板提示词缺少红蓝箭头画面内标注规则。',
          suggestion:
            '请明确红色人物运动箭头与蓝色摄影机运动箭头都应画在分镜画面区内部，底部轨道栏只做补充说明。',
        });
      }
      if (!hasBoardDescriptionDensity(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_CONTROL_PROMPT_THIN_VISUAL_DESCRIPTION',
          level: 'error',
          message: '控制板提示词的画面区专业描述维度不足，内容退化得过薄。',
          suggestion:
            '请让画面区逐格覆盖景别、机位、构图、空间层次、表演状态、光线、材质/环境细节、镜头运动结果、叙事目的等大多数维度，不要只剩箭头规则。',
        });
      }
      if (!hasBoardControlSections(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_CONTROL_PROMPT_MISSING_CONTROL_SECTIONS',
          level: 'error',
          message: '控制板提示词缺少导演级控制区关键 section。',
          suggestion:
            '请补齐 Panel Layout、Beat Line、Camera Path、Action Path、Continuity Rules、Color Legend 等控制区 section。',
        });
      }
      if (!/[\u4e00-\u9fff]/.test(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_CONTROL_PROMPT_NOT_CHINESE_LED',
          level: 'error',
          message: '控制板提示词不是中文主导内容。',
          suggestion: '请以中文为主重写 control_board_prompts；英文仅保留必要专业术语。',
        });
      }
    }

    if (artifactKey === 'style_board_prompts') {
      const missingMarkers = STYLE_BOARD_REQUIRED_MARKERS.filter(
        (marker) => !content.includes(marker),
      );
      const copyBlocks = parseCopyBlocks(content);
      const invalidIdBlock = copyBlocks.find((block) => !COPY_BLOCK_ID_PATTERN.test(block.id));
      const invalidPackBody = copyBlocks.find((block) => !hasPackHeading(block.body));
      if (missingMarkers.length > 0 || copyBlocks.length === 0 || invalidIdBlock || invalidPackBody) {
        errors.push({
          code: 'SCENE_STORYBOARD_STYLE_PROMPT_MISSING_FORMAT',
          level: 'error',
          message:
            copyBlocks.length === 0
              ? '风格板提示词缺少 pack 级 copy-block 包裹。'
              : invalidIdBlock
                ? `风格板提示词存在非法 copy-block id：${invalidIdBlock.id || '空值'}`
                : invalidPackBody
                  ? '风格板提示词的 copy-block 正文缺少 `## Pack N:` 分包标题。'
                  : `风格板提示词缺少正式整板结构 marker：${missingMarkers.join('、')}`,
          suggestion:
            '请按新 storyboard board contract 重写 style_board_prompts：每个 Pack 用 `<copy-block ...>` 包裹，使用 `pack-01` 这类 id，并在块内以 `## Pack 1:` 起头，同时保留 `Style & Rendering Storyboard Board` 标题。',
        });
      }
      if (!/[\u4e00-\u9fff]/.test(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_STYLE_PROMPT_NOT_CHINESE_LED',
          level: 'error',
          message: '风格板提示词不是中文主导内容。',
          suggestion: '请以中文为主重写 style_board_prompts；英文仅保留必要专业术语。',
        });
      }
      if (!mentionsStoryboardArrowRule(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_STYLE_PROMPT_MISSING_ARROW_RULES',
          level: 'error',
          message: '风格板提示词缺少红蓝箭头画面内标注规则。',
          suggestion:
            '请明确红色人物运动箭头与蓝色摄影机运动箭头仍然标在分镜画面区内部，风格板只能美化呈现，不能删除这些控制箭头。',
        });
      }
      if (!hasBoardDescriptionDensity(content)) {
        errors.push({
          code: 'SCENE_STORYBOARD_STYLE_PROMPT_THIN_VISUAL_DESCRIPTION',
          level: 'error',
          message: '风格板提示词的画面区专业描述维度不足，内容退化得过薄。',
          suggestion:
            '请让风格板画面区除了风格、光影、材质、色彩外，还覆盖景别、构图、空间层次、主体表演状态、空气感与叙事重点，不要只剩风格词和箭头规则。',
        });
      }
    }
  }

  return errors;
}
