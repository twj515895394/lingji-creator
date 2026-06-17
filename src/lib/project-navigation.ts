import type { AppPage } from './electron-api';
import type { ProjectData } from './project-persistence';

export function resolveProjectLandingPage(projectData?: ProjectData | null): AppPage {
  if (projectData?.type === 'sceneforge') {
    return 'sceneforge-studio';
  }
  return 'script-workbench';
}
