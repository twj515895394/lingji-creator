/**
 * Required 上游未满足时禁止 Run（Direct LLM / ACP / 阶段运行）。
 * 使用本地最小类型，避免 renderer types 与 electron SceneStageContext 分叉。
 */

export interface SceneRequiredContextInput {
  id: string;
  fromStage: string;
  artifactKey: string;
  satisfied?: boolean;
}

export interface SceneMissingRequiredInput {
  id: string;
  fromStage: string;
  artifactKey: string;
}

/** 将 IPC 返回的 stageContext.requiredInputs 规范为阻塞判定结构 */
export function normalizeRequiredInputsForBlocking(
  requiredInputs: Array<{
    satisfied?: boolean;
    policyInputId?: string;
    id?: string;
    fromStage?: string;
    artifactKey?: string;
  }>,
): SceneRequiredContextInput[] {
  return requiredInputs.map((input) => ({
    id: input.policyInputId ?? input.id ?? 'unknown',
    fromStage: input.fromStage ?? '',
    artifactKey: input.artifactKey ?? '',
    satisfied: input.satisfied,
  }));
}

export function listMissingRequiredStageInputs(context: {
  requiredInputs: SceneRequiredContextInput[];
}): SceneMissingRequiredInput[] {
  return context.requiredInputs
    .filter((input) => input.satisfied !== true)
    .map((input) => ({
      id: input.id,
      fromStage: input.fromStage,
      artifactKey: input.artifactKey,
    }));
}

export function hasBlockingMissingRequiredInputs(context: {
  requiredInputs: SceneRequiredContextInput[];
}): boolean {
  return listMissingRequiredStageInputs(context).length > 0;
}

/** 供 Studio 展示的简短中文说明 */
export function formatMissingRequiredInputsMessage(
  missing: SceneMissingRequiredInput[],
): string {
  if (missing.length === 0) {
    return '';
  }
  const lines = missing.map(
    (m) => `缺少必需产物：${m.fromStage} / ${m.artifactKey}`,
  );
  return `无法运行：请先补齐上游阶段产物。\n${lines.join('\n')}`;
}