import type { AppPage } from './electron-api';
import type { ProjectData } from './project-persistence';

export function resolveProjectLandingPage(projectData?: ProjectData | null): AppPage {
  if (projectData?.type === 'sceneforge') {
    if (projectData.sceneforge?.pipelineId === 'reference_remake') {
      return 'sceneforge-remix-assets';
    }
    return 'sceneforge-studio';
  }
  return 'script-workbench';
}
