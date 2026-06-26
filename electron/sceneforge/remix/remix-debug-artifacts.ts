import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveProjectFile } from './remix-validators';

function progressStageForReport(fileName: string): string {
  if (fileName === 'shot_detection_result.json') return 'segmentation';
  if (fileName === 'clip_generation_report.json') return 'clip_generation';
  if (fileName === 'keyframe_report.json') return 'keyframes';
  if (fileName === 'runtime_diagnostics.json') return 'runtime';
  return 'debug';
}

async function appendProgressEventForReport(filePath: string): Promise<void> {
  const fileName = path.basename(filePath);
  const event = {
    stage: progressStageForReport(fileName),
    status: 'succeeded',
    message: `已写入调试产物：${fileName}`,
    reportPath: filePath,
    timestamp: new Date().toISOString(),
  };
  await fs.appendFile(
    path.join(path.dirname(filePath), 'progress_events.jsonl'),
    `${JSON.stringify(event)}\n`,
    'utf8',
  );
}

export async function writeRemixDebugJson(input: {
  projectDir: string;
  relativePath: string;
  payload: unknown;
}): Promise<string> {
  const filePath = resolveProjectFile(input.projectDir, input.relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(input.payload, null, 2)}\n`, 'utf8');
  await appendProgressEventForReport(filePath);
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
