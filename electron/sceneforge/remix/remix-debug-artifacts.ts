import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveProjectFile } from './remix-validators';
import {
  appendRemixProgressEvent,
  type RemixProgressStage,
} from './remix-progress-events';

function progressStageForReport(fileName: string): RemixProgressStage | 'debug' {
  if (fileName === 'shot_detection_result.json') return 'segmentation';
  if (fileName === 'clip_generation_report.json') return 'clip_generation';
  if (fileName === 'keyframe_report.json') return 'keyframes';
  if (fileName === 'runtime_diagnostics.json') return 'runtime';
  return 'debug';
}

function sourceAssetIdFromRelativePath(relativePath: string): string | null {
  const normalized = relativePath.replaceAll('\\', '/');
  const match = normalized.match(/source-assets\/([^/]+)\/debug\//);
  return match?.[1] ?? null;
}

function warnDebugArtifactFailure(action: string, error: unknown): void {
  console.warn(
    `[SceneForge Remix] ${action} failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

function redactLocalPath(value: string): string {
  const homeDir = os.homedir();
  if (homeDir && value.startsWith(homeDir)) {
    return value.replace(homeDir, '~');
  }
  return value;
}

function redactRuntimeDiagnosticsPayload(payload: unknown): unknown {
  if (typeof payload === 'string') return redactLocalPath(payload);
  if (Array.isArray(payload)) return payload.map((item) => redactRuntimeDiagnosticsPayload(item));
  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, redactRuntimeDiagnosticsPayload(value)]),
    );
  }
  return payload;
}

function normalizePayloadForReport(relativePath: string, payload: unknown): unknown {
  return relativePath.endsWith('runtime_diagnostics.json')
    ? redactRuntimeDiagnosticsPayload(payload)
    : payload;
}

async function appendProgressEventForReport(input: {
  projectDir: string;
  relativePath: string;
  filePath: string;
}): Promise<void> {
  const fileName = path.basename(input.filePath);
  const stage = progressStageForReport(fileName);
  const sourceAssetId = sourceAssetIdFromRelativePath(input.relativePath);
  if (!sourceAssetId || stage === 'debug') return;

  try {
    await appendRemixProgressEvent({
      projectDir: input.projectDir,
      sourceAssetId,
      event: {
        stage,
        status: 'succeeded',
        message: `已写入调试产物：${fileName}`,
        details: {
          reportPath: input.filePath,
        },
      },
    });
  } catch (error) {
    warnDebugArtifactFailure('append progress event', error);
  }
}

export async function writeRemixDebugJson(input: {
  projectDir: string;
  relativePath: string;
  payload: unknown;
}): Promise<string> {
  const filePath = resolveProjectFile(input.projectDir, input.relativePath);
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      `${JSON.stringify(normalizePayloadForReport(input.relativePath, input.payload), null, 2)}\n`,
      'utf8',
    );
    await appendProgressEventForReport({
      projectDir: input.projectDir,
      relativePath: input.relativePath,
      filePath,
    });
  } catch (error) {
    warnDebugArtifactFailure(`write debug artifact ${input.relativePath}`, error);
  }
  return filePath;
}

export function withDebugReportMeta<T extends Record<string, unknown>>(payload: T): T & {
  generatedAt: string;
  schemaVersion: 1;
} {
  return {
    ...payload,
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}
