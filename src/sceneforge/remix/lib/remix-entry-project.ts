import type { FileEntry } from '../../../lib/electron-api';
import type { ProjectData } from '../../../lib/project-persistence';

function isDefaultScriptState(projectData: ProjectData): boolean {
  return (
    projectData.script.templateId === 'news-broadcast'
    && projectData.script.reviewState === 'idle'
    && projectData.script.lastReviewedDocVersion === 0
    && projectData.script.annotations.length === 0
  );
}

function isDefaultAiState(projectData: ProjectData): boolean {
  return (
    projectData.aiAnalysis.analysisResult === null
    && projectData.aiAnalysis.coverCandidates.length === 0
  );
}

function isDefaultWorkflowMeta(projectData: ProjectData): boolean {
  return (
    (projectData.workflowMeta?.lastAutoParams ?? null) === null
    && (projectData.workflowMeta?.lastAutoRunAt ?? null) === null
    && (projectData.workflowMeta?.lastPodcastScriptHash ?? null) === null
  );
}

export function isUntouchedProjectShell(projectData: ProjectData): boolean {
  return (
    projectData.type === undefined
    && projectData.timeline === null
    && projectData.sceneforge === undefined
    && projectData.stylePresetId === undefined
    && isDefaultAiState(projectData)
    && isDefaultScriptState(projectData)
    && isDefaultWorkflowMeta(projectData)
  );
}

export function canBootstrapRemixAssetIngestionProject(
  projectData: ProjectData,
  topLevelEntries: FileEntry[],
): boolean {
  if (!isUntouchedProjectShell(projectData)) {
    return false;
  }

  const visibleEntries = topLevelEntries.filter((entry) => !entry.name.startsWith('.'));
  return visibleEntries.every((entry) => entry.type === 'file' && entry.name === 'project.json');
}
