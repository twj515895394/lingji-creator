import { ipcMain } from 'electron';
import type {
  CreateSourceAssetFromImportInput,
  CreateVariantFromSourceAssetInput,
  DeleteSourceAssetInput,
  DeleteVariantInput,
  DuplicateVariantInput,
  ListSourceAssetsInput,
  ListVariantsForSourceAssetInput,
  RegisterEditedKeyframeInput,
  RenameVariantInput,
  RemixSourceAssetRefInput,
  RemixVariantRefInput,
  RunSourceAssetStageInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
} from './remix-ipc-types';
import { RemixService } from './remix-service';

const service = new RemixService();

export function registerSceneForgeRemixIpc(): void {
  ipcMain.handle('sceneForgeRemix:listSourceAssets', async (_event, input: ListSourceAssetsInput) => {
    return service.listSourceAssets(input);
  });

  ipcMain.handle(
    'sceneForgeRemix:getSourceAsset',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.getSourceAsset(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:deleteSourceAsset',
    async (_event, input: DeleteSourceAssetInput) => {
      return service.deleteSourceAsset(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateSourceAssetMetadata',
    async (_event, input: UpdateSourceAssetMetadataInput) => {
      return service.updateSourceAssetMetadata(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:createSourceAssetFromImport',
    async (_event, input: CreateSourceAssetFromImportInput) => {
      return service.createSourceAssetFromImport(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceSegmentation',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceSegmentation(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceKeyframes',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceKeyframes(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceUnderstanding',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceUnderstanding(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:publishSourceAssetToLibrary',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.publishSourceAssetToLibrary(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:createVariantFromSourceAsset',
    async (_event, input: CreateVariantFromSourceAssetInput) => {
      return service.createVariantFromSourceAsset(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:listVariantsForSourceAsset',
    async (_event, input: ListVariantsForSourceAssetInput) => {
      return service.listVariantsForSourceAsset(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:renameVariant',
    async (_event, input: RenameVariantInput) => {
      return service.renameVariant(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:duplicateVariant',
    async (_event, input: DuplicateVariantInput) => {
      return service.duplicateVariant(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:deleteVariant',
    async (_event, input: DeleteVariantInput) => {
      return service.deleteVariant(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:getCreationWorkspace',
    async (_event, input: RemixVariantRefInput) => {
      return service.getCreationWorkspace(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateVariantConfig',
    async (_event, input: UpdateVariantConfigInput) => {
      return service.updateVariantConfig(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runRemixStrategy',
    async (_event, input: RemixVariantRefInput) => {
      return service.runRemixStrategy(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runRemixDesign',
    async (_event, input: RemixVariantRefInput) => {
      return service.runRemixDesign(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runKeyframeEditPrompts',
    async (_event, input: RemixVariantRefInput) => {
      return service.runKeyframeEditPrompts(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:registerEditedKeyframe',
    async (_event, input: RegisterEditedKeyframeInput) => {
      return service.registerEditedKeyframe(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateEditedKeyframeStatus',
    async (_event, input: UpdateEditedKeyframeStatusInput) => {
      return service.updateEditedKeyframeStatus(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSeedancePrompts',
    async (_event, input: RemixVariantRefInput) => {
      return service.runSeedancePrompts(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:exportPromptBundle',
    async (_event, input: RemixVariantRefInput) => {
      return service.exportPromptBundle(input);
    },
  );
}
