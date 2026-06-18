import { readSceneArtifact } from '../artifacts/scene-artifact-store';

/** 与 renderer `scene-hitl-markdown` 解析规则对齐（主进程副本，避免跨边界 import） */

const ADAPTATION_HEADING = /^##\s*改编方向\s*$/im;

function parseDirections(content: string): { id: string }[] {
  const match = content.match(ADAPTATION_HEADING);
  if (!match || match.index === undefined) return [];
  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  const section = sectionEnd >= 0 ? after.slice(0, sectionEnd) : after;
  const out: { id: string }[] = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const idMatch = body.match(/(?:^|\|)\s*id:\s*([^|]+)/i);
    if (idMatch) out.push({ id: idMatch[1].trim() });
    else if (body.length > 2) out.push({ id: `line-${out.length}` });
  }
  return out;
}

function adaptationSelected(content: string | undefined): boolean {
  if (!content?.trim()) return false;
  return /status:\s*selected/i.test(content) && /selected_id:\s*\S+/i.test(content);
}

export async function intakeRequiresAdaptationSelection(projectDir: string): Promise<boolean> {
  try {
    const { content } = await readSceneArtifact(projectDir, 'source_intake.source_material');
    return parseDirections(content).length > 0;
  } catch {
    return false;
  }
}

export async function validateIntakeAdaptationGate(projectDir: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  const required = await intakeRequiresAdaptationSelection(projectDir);
  if (!required) return { ok: true };
  try {
    const { content } = await readSceneArtifact(projectDir, 'source_intake.adaptation_selection');
    if (adaptationSelected(content)) return { ok: true };
    return {
      ok: false,
      message: '源材料含改编方向列表，请先确认选择一项改编方向后再校验本阶段。',
    };
  } catch {
    return {
      ok: false,
      message: '源材料含改编方向列表，请提交「改编方向确认」产物后再校验。',
    };
  }
}

export function gateStyleConfirmed(gateConfirmations: string | undefined): boolean {
  return /style_confirmed:\s*true/i.test(gateConfirmations ?? '');
}