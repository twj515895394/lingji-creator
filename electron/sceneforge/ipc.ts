import { ipcMain } from 'electron';
import { SceneForgeService, type SceneSubmitStageDraftInput } from './service';
import type { SceneApprovalPolicy, SceneStageId } from './types';
import type {
  SceneAnalyzeTopicGateIpcInput,
  SceneCheckTopicIntentIpcInput,
  SceneGetStageContextOptions,
  SceneRunStageIpcInput,
  SceneStageRunProgressPayload,
  SceneUpdateStyleSelectionIpcInput,
} from './scene-ipc-types';

const service = new SceneForgeService();

export function registerSceneForgeIpc(): void {
  ipcMain.handle('sceneforge:create-project', async (_event, projectDir: string) => {
    return service.createProject(projectDir);
  });

  ipcMain.handle('sceneforge:get-project-state', async (_event, projectDir: string) => {
    return service.getProjectState(projectDir);
  });

  ipcMain.handle('sceneforge:list-assets', async () => {
    return service.listAvailableAssets();
  });

  ipcMain.handle(
    'sceneforge:update-style-selection',
    async (_event, input: SceneUpdateStyleSelectionIpcInput) => {
      return service.updateStyleSelection(input);
    },
  );

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
    'sceneforge:check-topic-intent',
    async (_event, input: SceneCheckTopicIntentIpcInput) => {
      return service.checkTopicIntent(input);
    },
  );

  ipcMain.handle(
    'sceneforge:analyze-topic-gate',
    async (_event, input: SceneAnalyzeTopicGateIpcInput) => {
      return service.analyzeTopicGate(input);
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
    'sceneforge:set-current-stage',
    async (_event, projectDir: string, stage: SceneStageId) => {
      return service.setCurrentStage(projectDir, stage);
    },
  );

  ipcMain.handle('sceneforge:complete-project', async (_event, projectDir: string) => {
    return service.completeProject(projectDir);
  });

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

  ipcMain.handle('sceneforge:run-stage', async (event, input: SceneRunStageIpcInput) => {
    return service.runStage(input, {
      onProgress: (progress: SceneStageRunProgressPayload) => {
        event.sender.send('sceneforge:stage-run-progress', progress);
      },
    });
  });
}
