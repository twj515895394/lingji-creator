import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import {
  listMissingPerformanceMarkdownSections,
  normalizePerformanceDirectionMarkdown,
  PERFORMANCE_DIRECTION_SECTIONS,
} from './performance-direction-section-headings';
import { validatePerformanceDirectionSemantic } from './semantic-support-stages';
import { extractPerformanceTopicAnchorFromScript } from './performance-topic-anchor';
import { validateSingleArtifactSupportStage } from './validators.support-prep';

export async function validatePerformanceStage(projectDir: string) {
  const errors = await validateSingleArtifactSupportStage(projectDir, 'performance');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'performance.performance_direction');
  const normalized = normalizePerformanceDirectionMarkdown(content);
  const missingSections = listMissingPerformanceMarkdownSections(
    normalized,
    PERFORMANCE_DIRECTION_SECTIONS,
  );
  if (missingSections.length > 0) {
    errors.push({
      code: 'SCENE_PERFORMANCE_DIRECTION_MISSING_MARKERS',
      level: 'error',
      message: `Performance 阶段缺少正式表演表 section：${missingSections.join('、')}`,
      suggestion:
        '请补齐 character_performance_profiles、beat_performance_notes、action_continuity_chains、emotion_continuity_chains、continuity_rules、storyboard_handoff、risk_notes 与 next_action。',
    });
  }

  let topicAnchor = null;
  try {
    const scriptArtifact = await readSceneArtifact(projectDir, 'script.script_draft');
    if (scriptArtifact.content?.trim()) {
      topicAnchor = extractPerformanceTopicAnchorFromScript(scriptArtifact.content);
    }
  } catch {
    topicAnchor = null;
  }

  const semantic = validatePerformanceDirectionSemantic(normalized, topicAnchor);
  const semanticErrors: SceneValidationError[] = semantic.issues.map((issue) => ({
    code: issue.code,
    level: 'error',
    message: issue.message,
    suggestion:
      '请补齐角色表演画像、beat 级表演细节、连续性规则与 storyboard handoff，确保下游无需重发明表演逻辑后再提交。',
  }));
  return [...errors, ...semanticErrors];
}