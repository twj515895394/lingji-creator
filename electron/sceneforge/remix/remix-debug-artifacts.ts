import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveProjectFile } from './remix-validators';

export async function writeRemixDebugJson(input: {
  projectDir: string;
  relativePath: string;
  payload: unknown;
}): Promise<string> {
  const filePath = resolveProjectFile(input.projectDir, input.relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(input.payload, null, 2)}\n`, 'utf8');
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
