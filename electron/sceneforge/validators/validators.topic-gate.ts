import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const REQUIRED = ['topic_brief'] as const;
const TOPIC_BRIEF_MARKERS = ['创作意图', '成片规格', '决策', '风格候选'] as const;

function findArtifactContent(
  artifacts: Awaited<ReturnType<typeof listSceneArtifacts>>,
  id: string,
) {
  return artifacts.find((item) => item.id === id);
}

function missingError(artifactKey: string): SceneValidationError {
  return {
    code: `SCENE_GATE_MISSING_${artifactKey.toUpperCase()}`,
    level: 'error',
    message: `Topic Gate 缺少产物：${artifactKey}`,
    suggestion: `请在工坊提交 ${artifactKey} 后重新校验。`,
  };
}

export async function validateTopicGateStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of REQUIRED) {
    const artifact = findArtifactContent(artifacts, `topic_gate.${artifactKey}`);
    if (!artifact || artifact.stage !== 'topic_gate' || artifact.kind !== 'final') {
      errors.push(missingError(artifactKey));
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_GATE_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Topic Gate 产物为空：${artifactKey}`,
        suggestion: '请补充选题说明、评分或风格确认内容。',
      });
      continue;
    }

    const missingMarkers = TOPIC_BRIEF_MARKERS.filter((marker) => !content.includes(marker));
    if (missingMarkers.length > 0) {
      errors.push({
        code: 'SCENE_GATE_TOPIC_BRIEF_MISSING_SECTIONS',
        level: 'error',
        message: `Topic Gate 缺少必要 section：${missingMarkers.join('、')}`,
        suggestion:
          '请至少补齐「创作意图 / 成片规格 / 决策 / 风格候选」四个区块；可直接使用当前表单或默认模板生成标准结构。',
      });
    }

    if (!/decision\s*[：:：]?\s*(?:\n\s*)?(go|observe|drop)\b/i.test(content) && !/##\s*决策\s*\n\s*(go|observe|drop)\b/i.test(content)) {
      errors.push({
        code: 'SCENE_GATE_TOPIC_BRIEF_INVALID_DECISION',
        level: 'error',
        message: 'Topic Gate 的决策字段无效或缺失。',
        suggestion: '请在「## 决策」中填写 go、observe 或 drop 之一。',
      });
    }

    if (!/total_duration_sec:\s*\d+/i.test(content) || !/segment_duration_sec:\s*\d+/i.test(content)) {
      errors.push({
        code: 'SCENE_GATE_TOPIC_BRIEF_MISSING_DURATION',
        level: 'error',
        message: 'Topic Gate 缺少成片总时长或单段时长。',
        suggestion: '请在「## 成片规格」中填写 total_duration_sec 和 segment_duration_sec。',
      });
    }

    if (!/##\s*风格候选/i.test(content) || !/-\s*id:\s*.+\|\s*label:\s*.+/i.test(content)) {
      errors.push({
        code: 'SCENE_GATE_TOPIC_BRIEF_MISSING_STYLE_OPTIONS',
        level: 'error',
        message: 'Topic Gate 未提供可确认的风格候选。',
        suggestion: '请在「## 风格候选」下至少保留一条 `id / label / family` 候选。',
      });
    }
  }

  const gateConfirmations = findArtifactContent(artifacts, 'topic_gate.gate_confirmations');
  if (gateConfirmations && gateConfirmations.stage === 'topic_gate' && gateConfirmations.kind === 'final') {
    const { content } = await readSceneArtifact(projectDir, gateConfirmations.id);
    if (!content.trim()) {
      errors.push({
        code: 'SCENE_GATE_EMPTY_GATE_CONFIRMATIONS',
        level: 'error',
        message: 'Topic Gate 的确认产物为空：gate_confirmations',
        suggestion: '请重新提交风格与决策确认。',
      });
    } else {
      if (!/decision:\s*(go|observe|drop)\b/i.test(content)) {
        errors.push({
          code: 'SCENE_GATE_CONFIRMATIONS_INVALID_DECISION',
          level: 'error',
          message: 'Topic Gate 确认产物缺少有效 decision。',
          suggestion: '请重新确认继续策略，确保写入 go、observe 或 drop。',
        });
      }
      if (!/style_id:\s*\S+/i.test(content) || !/style_confirmed:\s*true/i.test(content)) {
        errors.push({
          code: 'SCENE_GATE_CONFIRMATIONS_MISSING_STYLE_CONFIRMATION',
          level: 'error',
          message: 'Topic Gate 确认产物未完整记录风格确认结果。',
          suggestion: '请通过「确认风格并继续」重新提交，写入 style_id 与 style_confirmed: true。',
        });
      }
    }
  }

  return errors;
}
