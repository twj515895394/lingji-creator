import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemixDebugDir } from './remix-artifact-paths';
import { resolveProjectFile } from './remix-validators';

export type RemixProgressStage = 'segmentation' | 'clip_generation' | 'keyframes' | 'runtime';
export type RemixProgressStatus = 'started' | 'running' | 'succeeded' | 'failed' | 'fallback';

export interface RemixProgressEvent {
  stage: RemixProgressStage;
  status: RemixProgressStatus;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
}

export async function appendRemixProgressEvent(input: {
  projectDir: string;
  sourceAssetId: string;
  event: RemixProgressEvent;
}): Promise<string> {
  const filePath = resolveProjectFile(
    input.projectDir,
    path.posix.join(getRemixDebugDir(input.sourceAssetId), 'progress_events.jsonl'),
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(
    filePath,
    `${JSON.stringify({ ...input.event, sourceAssetId: input.sourceAssetId, timestamp: new Date().toISOString() })}\n`,
    'utf8',
  );
  return filePath;
}
