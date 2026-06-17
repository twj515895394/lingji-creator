import fs from 'node:fs/promises';
import path from 'node:path';
import { loadProjectFile } from '../../project-file';
import type { SceneStageId } from '../types';
import { listSceneArtifacts, readSceneArtifact, type SceneArtifact } from '../artifacts/scene-artifact-store';
import { readSceneState } from '../pipeline/scene-state-machine';

const EXPORT_DIR = path.join('sceneforge', 'exports', 'prompt_pack');

const CORE_EXPORTS: Array<{
  stage: Extract<SceneStageId, 'design' | 'storyboard' | 'video_prompts'>;
  artifactId: string;
  fileName: string;
  heading: string;
}> = [
  {
    stage: 'design',
    artifactId: 'design.design_prompts',
    fileName: 'design_prompts.md',
    heading: 'Design Prompts',
  },
  {
    stage: 'storyboard',
    artifactId: 'storyboard.storyboard_prompt_pack',
    fileName: 'storyboard_prompts.md',
    heading: 'Storyboard Prompts',
  },
  {
    stage: 'video_prompts',
    artifactId: 'video_prompts.video_prompt_pack',
    fileName: 'video_prompts.md',
    heading: 'Video Prompts',
  },
];

export interface ScenePromptPackExportFile {
  fileName: string;
  path: string;
}

export interface ScenePromptPackExportResult {
  exportDir: string;
  manifestPath: string;
  artifactIds: string[];
  files: ScenePromptPackExportFile[];
}

function findEligibleArtifact(
  artifacts: SceneArtifact[],
  artifactId: string,
): SceneArtifact | null {
  const artifact = artifacts.find((item) => item.id === artifactId);
  if (
    !artifact ||
    artifact.kind !== 'final' ||
    artifact.role !== 'core_generation_asset' ||
    !artifact.coreAsset
  ) {
    return null;
  }
  return artifact;
}

async function updateProjectLastExportPath(projectDir: string, exportDir: string): Promise<void> {
  const data = await loadProjectFile(projectDir);
  if (data.type !== 'sceneforge' || !data.sceneforge) {
    return;
  }
  const nextData = {
    ...data,
    updatedAt: new Date().toISOString(),
    sceneforge: {
      ...data.sceneforge,
      lastExportPath: exportDir,
    },
  };
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(nextData, null, 2), 'utf-8');
}

export async function exportScenePromptPack(projectDir: string): Promise<ScenePromptPackExportResult> {
  const state = await readSceneState(projectDir);
  const artifacts = await listSceneArtifacts(projectDir);
  const exportDir = path.join(projectDir, EXPORT_DIR);
  const manifestPath = path.join(exportDir, 'manifest.json');
  const exportedArtifacts: Array<{ artifact: SceneArtifact; fileName: string; heading: string; content: string }> = [];

  for (const item of CORE_EXPORTS) {
    if (state.stages[item.stage]?.status !== 'approved') {
      continue;
    }
    const artifact = findEligibleArtifact(artifacts, item.artifactId);
    if (!artifact) {
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    exportedArtifacts.push({ artifact, fileName: item.fileName, heading: item.heading, content });
  }

  await fs.mkdir(exportDir, { recursive: true });
  const files: ScenePromptPackExportFile[] = [];

  for (const item of exportedArtifacts) {
    const filePath = path.join(exportDir, item.fileName);
    await fs.writeFile(filePath, item.content, 'utf-8');
    files.push({ fileName: item.fileName, path: filePath });
  }

  const finalPromptPackPath = path.join(exportDir, 'final_prompt_pack.md');
  const finalPromptPack = [
    '# SceneForge Prompt Pack',
    '',
    ...exportedArtifacts.flatMap((item) => [
      `## ${item.heading}`,
      '',
      item.content.trim(),
      '',
    ]),
  ].join('\n');
  await fs.writeFile(finalPromptPackPath, finalPromptPack, 'utf-8');
  files.push({ fileName: 'final_prompt_pack.md', path: finalPromptPackPath });

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    artifacts: exportedArtifacts.map((item) => ({
      id: item.artifact.id,
      stage: item.artifact.stage,
      title: item.artifact.title,
      sourcePath: item.artifact.path,
      fileName: item.fileName,
    })),
    files: [...files, { fileName: 'manifest.json', path: manifestPath }],
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  files.push({ fileName: 'manifest.json', path: manifestPath });

  await updateProjectLastExportPath(projectDir, exportDir);

  return {
    exportDir,
    manifestPath,
    artifactIds: exportedArtifacts.map((item) => item.artifact.id),
    files,
  };
}
