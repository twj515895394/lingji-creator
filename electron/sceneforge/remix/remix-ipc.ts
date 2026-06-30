import { app, ipcMain } from 'electron';
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
  RunSourceSegmentationInput,
  RunSourceAssetStageInput,
  UpdateSourceSegmentsInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
  SegmentKeyframeActionInput,
} from './remix-ipc-types';
import { RemixService } from './remix-service';
import { loadRemixUnderstandingAISettings } from './remix-ai-settings';
import { registerSceneForgeRemixSegmentClipIpc } from './segment-clips/segment-clip-ipc';

const service = new RemixService({
  understandingServiceOptions: {
    loadAISettings: async () => loadRemixUnderstandingAISettings(app.getPath('userData')),
  },
});

export function registerSceneForgeRemixIpc(): void {
  registerSceneForgeRemixSegmentClipIpc();

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
    async (_event, input: RunSourceSegmentationInput) => {
      return service.runSourceSegmentation(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceAudio',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceAudio(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceKeyframes',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceKeyframes(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:addSegmentMiddleKeyframe',
    async (_event, input: SegmentKeyframeActionInput) => {
      return service.addSegmentMiddleKeyframe(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:deleteSegmentMiddleKeyframe',
    async (_event, input: SegmentKeyframeActionInput) => {
      return service.deleteSegmentMiddleKeyframe(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceTranscript',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceTranscript(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSourceUnderstanding',
    async (_event, input: RunSourceAssetStageInput) => {
      return service.runSourceUnderstanding(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:rerunSegmentUnderstanding',
    async (_event, input: SegmentKeyframeActionInput) => {
      return service.rerunSegmentUnderstanding(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:rerunSegmentTranscript',
    async (_event, input: SegmentKeyframeActionInput) => {
      return service.rerunSegmentTranscript(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:rerunOriginalStoryRollup',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.rerunOriginalStoryRollup(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:getSourceUnderstandingWorkbench',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.getSourceUnderstandingWorkbench(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:validateUnderstandingFreshness',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.validateUnderstandingFreshness(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:runSegmentFrameVision',
    async (
      _event,
      input: {
        projectDir: string;
        sourceAssetId: string;
        segmentId: string;
      },
    ) => {
      return service.runSegmentFrameVision(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:exportUnderstandingReport',
    async (
      _event,
      input: {
        projectDir: string;
        sourceAssetId: string;
        format?: 'markdown';
      },
    ) => {
      return service.exportUnderstandingReport(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:rerunStaleSegmentUnderstandings',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.rerunStaleSegmentUnderstandings(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:getSegmentTranscriptCorrection',
    async (_event, input: { projectDir: string; sourceAssetId: string; segmentId: string }) => {
      return service.getSegmentTranscriptCorrection(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateSegmentTranscriptCorrection',
    async (
      _event,
      input: {
        projectDir: string;
        sourceAssetId: string;
        segmentId: string;
        correctedText: string;
        markConfirmed?: boolean;
      },
    ) => {
      return service.updateSegmentTranscriptCorrection(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateSegmentPositiveVideoPrompt',
    async (
      _event,
      input: {
        projectDir: string;
        sourceAssetId: string;
        segmentId: string;
        positiveText: string;
        negativeText?: string | null;
      },
    ) => {
      return service.updateSegmentPositiveVideoPrompt(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:confirmAllSegmentTranscripts',
    async (
      _event,
      input: {
        projectDir: string;
        sourceAssetId: string;
      },
    ) => {
      return service.confirmAllSegmentTranscripts(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:updateSourceSegments',
    async (_event, input: UpdateSourceSegmentsInput) => {
      return service.updateSourceSegments(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:getSegmentationDiagnostics',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.getSegmentationDiagnostics(input);
    },
  );

  ipcMain.handle(
    'sceneForgeRemix:validateSourceAssetMedia',
    async (_event, input: RemixSourceAssetRefInput) => {
      return service.validateSourceAssetMedia(input);
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
