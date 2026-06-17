import { ipcMain } from 'electron';
import { SceneForgeService, type SceneSubmitStageDraftInput } from './service';
import type { SceneApprovalPolicy, SceneStageId } from './types';
import type { SceneGetStageContextOptions } from './scene-ipc-types';

const service = new SceneForgeService();

export function registerSceneForgeIpc(): void {
  ipcMain.handle('sceneforge:create-project', async (_event, projectDir: string) => {
    return service.createProject(projectDir);
  });

  ipcMain.handle('sceneforge:get-project-state', async (_event, projectDir: string) => {
    return service.getProjectState(projectDir);
  });

  ipcMain.handle(
    'sceneforge:get-stage-context',
    async (
      _event,
      projectDir: string,
      stage: SceneStageId,
      options?: SceneGetStageContextOptions,
    ) => {
      return service.getStageContext(projectDir, stage, options);
    },
  );

  ipcMain.handle(
    'sceneforge:submit-stage-draft',
    async (_event, input: SceneSubmitStageDraftInput) => {
      return service.submitStageDraft(input);
    },
  );

  ipcMain.handle(
    'sceneforge:validate-stage',
    async (_event, projectDir: string, stage: SceneStageId) => {
      return service.validateStage(projectDir, stage);
    },
  );

  ipcMain.handle(
    'sceneforge:approve-stage',
    async (_event, projectDir: string, stage: SceneStageId) => {
      return service.approveStage(projectDir, stage);
    },
  );

  ipcMain.handle(
    'sceneforge:request-revision',
    async (_event, projectDir: string, stage: SceneStageId, note: string) => {
      return service.requestRevision(projectDir, stage, note);
    },
  );

  ipcMain.handle(
    'sceneforge:set-approval-policy',
    async (
      _event,
      projectDir: string,
      stage: SceneStageId,
      policy: SceneApprovalPolicy,
    ) => {
      return service.setApprovalPolicy(projectDir, stage, policy);
    },
  );

  ipcMain.handle('sceneforge:list-artifacts', async (_event, projectDir: string) => {
    return service.listArtifacts(projectDir);
  });

  ipcMain.handle(
    'sceneforge:read-artifact',
    async (_event, projectDir: string, artifactId: string) => {
      return service.readArtifact(projectDir, artifactId);
    },
  );

  ipcMain.handle('sceneforge:export-prompt-pack', async (_event, projectDir: string) => {
    return service.exportPromptPack(projectDir);
  });
}
