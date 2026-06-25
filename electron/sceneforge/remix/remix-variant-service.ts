import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getRemixVariantAudioPlanPath,
  getRemixVariantDesignJsonPath,
  getRemixVariantDesignMarkdownPath,
  getRemixVariantDir,
  getRemixVariantEditedKeyframePath,
  getRemixVariantKeyframePromptPath,
  getRemixVariantStrategyJsonPath,
  getRemixVariantStrategyMarkdownPath,
} from './remix-artifact-paths';
import type {
  CreateVariantFromSourceAssetInput,
  DeleteVariantInput,
  DuplicateVariantInput,
  RenameVariantInput,
  UpdateVariantConfigInput,
} from './remix-ipc-types';
import type {
  KeyframeEditPrompt,
  RetentionMatrix,
  SeedancePrompt,
} from '../../../src/sceneforge/remix/types';
import {
  buildVariantSummary,
  buildSourceAssetSummary,
  listStoredVariants,
  readStoredSourceAsset,
  readStoredVariant,
  slugifyRemixId,
  type StoredVariantDocument,
  writeStoredSourceAsset,
  writeStoredVariant,
} from './remix-store';

const DEFAULT_RETENTION_MATRIX: RetentionMatrix = {
  plotStructure: 'keep',
  characterRelationship: 'replace_identity',
  dialogueMeaning: 'rewrite',
  dialogueRhythm: 'keep',
  performanceAction: 'keep',
  cameraComposition: 'soft_keep',
  sceneEnvironment: 'replace',
  visualStyle: 'new_style',
  memeMechanism: 'enhance',
};

export interface RemixVariantServiceOptions {
  now?: () => Date;
}

export class RemixVariantService {
  private readonly now;

  constructor(options: RemixVariantServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  private buildVariantDocument(
    sourceAssetId: string,
    variantId: string,
    input: CreateVariantFromSourceAssetInput,
  ): StoredVariantDocument {
    const timestamp = this.now().toISOString();
    return {
      schema: 'sceneforge-remix-variant',
      version: 1,
      variant: {
        id: variantId,
        sourceAssetId,
        name: input.name,
        concept: input.concept,
        referenceStrength: input.referenceStrength ?? 'strong',
        retentionMatrix: input.retentionMatrix ?? DEFAULT_RETENTION_MATRIX,
        defaultGenerationMode: input.defaultGenerationMode ?? 'keyframes_plus_source_clip',
        segmentGenerationModeOverrides: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        currentStage: null,
        stageStatuses: {
          remix_strategy: 'not_started',
          remix_design: 'not_started',
          remix_keyframe_edit_prompts: 'not_started',
          edited_keyframes_review: 'not_started',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
        strategyMarkdownPath: getRemixVariantStrategyMarkdownPath(variantId),
        strategyJsonPath: getRemixVariantStrategyJsonPath(variantId),
        designMarkdownPath: getRemixVariantDesignMarkdownPath(variantId),
        designJsonPath: getRemixVariantDesignJsonPath(variantId),
      },
      creationStageStates: {
        remix_strategy: 'not_started',
        remix_design: 'not_started',
        remix_keyframe_edit_prompts: 'not_started',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
      keyframeEditPrompts: [],
      editedKeyframes: [],
      seedancePrompts: [],
    };
  }

  async create(projectDir: string, input: CreateVariantFromSourceAssetInput): Promise<StoredVariantDocument> {
    const sourceDocument = await readStoredSourceAsset(projectDir, input.sourceAssetId);
    if (sourceDocument.sourceAsset.status !== 'published_to_library') {
      throw new Error('这份素材尚未保存入库，不能创建二创版本。请先完成处理并保存入库。');
    }

    const variantId = [
      'variant',
      slugifyRemixId(input.name, 'remix'),
      this.now().getTime().toString(36),
    ].join('-');
    const document = this.buildVariantDocument(input.sourceAssetId, variantId, input);

    sourceDocument.sourceAsset.variantCount += 1;
    sourceDocument.sourceAsset.updatedAt = this.now().toISOString();
    await writeStoredSourceAsset(projectDir, sourceDocument);
    await writeStoredVariant(projectDir, document);
    return document;
  }

  async update(projectDir: string, input: UpdateVariantConfigInput): Promise<StoredVariantDocument> {
    const document = await readStoredVariant(projectDir, input.variantId);
    document.variant = {
      ...document.variant,
      name: input.name ?? document.variant.name,
      concept: input.concept ?? document.variant.concept,
      referenceStrength: input.referenceStrength ?? document.variant.referenceStrength,
      retentionMatrix: input.retentionMatrix ?? document.variant.retentionMatrix,
      defaultGenerationMode: input.defaultGenerationMode ?? document.variant.defaultGenerationMode,
      segmentGenerationModeOverrides:
        input.segmentGenerationModeOverrides ?? document.variant.segmentGenerationModeOverrides,
      updatedAt: this.now().toISOString(),
    };
    await writeStoredVariant(projectDir, document);
    return document;
  }

  async listForSourceAsset(projectDir: string, sourceAssetId: string) {
    const variants = await listStoredVariants(projectDir);
    return variants
      .filter((document) => document.variant.sourceAssetId === sourceAssetId)
      .map((document) => buildVariantSummary(document.variant))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async rename(projectDir: string, input: RenameVariantInput) {
    const document = await readStoredVariant(projectDir, input.variantId);
    document.variant.name = input.name.trim();
    document.variant.updatedAt = this.now().toISOString();
    await writeStoredVariant(projectDir, document);
    return this.listForSourceAsset(projectDir, document.variant.sourceAssetId);
  }

  async duplicate(projectDir: string, input: DuplicateVariantInput) {
    const sourceDocument = await readStoredVariant(projectDir, input.variantId);
    const duplicatedVariantId = [
      'variant',
      slugifyRemixId(input.name?.trim() || `${sourceDocument.variant.name}-copy`, 'remix'),
      this.now().getTime().toString(36),
    ].join('-');
    const duplicatedName = input.name?.trim() || `${sourceDocument.variant.name} Copy`;
    const timestamp = this.now().toISOString();
    const duplicatedDocument: StoredVariantDocument = {
      ...sourceDocument,
      variant: {
        ...sourceDocument.variant,
        id: duplicatedVariantId,
        name: duplicatedName,
        createdAt: timestamp,
        updatedAt: timestamp,
        strategyMarkdownPath: getRemixVariantStrategyMarkdownPath(duplicatedVariantId),
        strategyJsonPath: getRemixVariantStrategyJsonPath(duplicatedVariantId),
        designMarkdownPath: getRemixVariantDesignMarkdownPath(duplicatedVariantId),
        designJsonPath: getRemixVariantDesignJsonPath(duplicatedVariantId),
      },
      keyframeEditPrompts: sourceDocument.keyframeEditPrompts.map((prompt) =>
        this.clonePromptForDuplicate(duplicatedVariantId, prompt),
      ),
      editedKeyframes: sourceDocument.editedKeyframes.map((frame) =>
        this.cloneEditedKeyframeForDuplicate(duplicatedVariantId, frame, timestamp),
      ),
      seedancePrompts: sourceDocument.seedancePrompts.map((prompt) =>
        this.cloneSeedancePromptForDuplicate(duplicatedVariantId, prompt),
      ),
    };

    await fs.cp(
      path.join(projectDir, getRemixVariantDir(input.variantId)),
      path.join(projectDir, getRemixVariantDir(duplicatedVariantId)),
      { recursive: true },
    );
    await writeStoredVariant(projectDir, duplicatedDocument);

    const sourceAssetDocument = await readStoredSourceAsset(projectDir, sourceDocument.variant.sourceAssetId);
    sourceAssetDocument.sourceAsset.variantCount += 1;
    sourceAssetDocument.sourceAsset.updatedAt = timestamp;
    await writeStoredSourceAsset(projectDir, sourceAssetDocument);
    return this.listForSourceAsset(projectDir, sourceDocument.variant.sourceAssetId);
  }

  async delete(projectDir: string, input: DeleteVariantInput) {
    const document = await readStoredVariant(projectDir, input.variantId);
    await fs.rm(path.join(projectDir, getRemixVariantDir(input.variantId)), {
      recursive: true,
      force: true,
    });
    const sourceDocument = await readStoredSourceAsset(projectDir, document.variant.sourceAssetId);
    sourceDocument.sourceAsset.variantCount = Math.max(0, sourceDocument.sourceAsset.variantCount - 1);
    sourceDocument.sourceAsset.updatedAt = this.now().toISOString();
    await writeStoredSourceAsset(projectDir, sourceDocument);
    return this.listForSourceAsset(projectDir, document.variant.sourceAssetId);
  }

  private clonePromptForDuplicate(variantId: string, prompt: KeyframeEditPrompt): KeyframeEditPrompt {
    return {
      ...prompt,
      id: `${variantId}-${prompt.segmentId}-${prompt.frameRole}-prompt`,
      variantId,
      promptPath: getRemixVariantKeyframePromptPath(variantId, prompt.segmentId, prompt.frameRole),
      createdAt: this.now().toISOString(),
    };
  }

  private cloneEditedKeyframeForDuplicate(
    variantId: string,
    frame: StoredVariantDocument['editedKeyframes'][number],
    timestamp: string,
  ): StoredVariantDocument['editedKeyframes'][number] {
    return {
      ...frame,
      id: `${variantId}-${frame.segmentId}-${frame.frameRole}-edited`,
      variantId,
      promptPath: getRemixVariantKeyframePromptPath(variantId, frame.segmentId, frame.frameRole),
      editedFramePath: getRemixVariantEditedKeyframePath(variantId, frame.segmentId, frame.frameRole),
      updatedAt: timestamp,
      createdAt: timestamp,
    };
  }

  private cloneSeedancePromptForDuplicate(variantId: string, prompt: SeedancePrompt): SeedancePrompt {
    return {
      ...prompt,
      id: `${variantId}-${prompt.segmentId}-seedance`,
      variantId,
      audioPlanPath: getRemixVariantAudioPlanPath(variantId),
    };
  }

  async getWorkspace(projectDir: string, variantId: string) {
    const variantDocument = await readStoredVariant(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    return {
      sourceAsset: buildSourceAssetSummary(sourceDocument.sourceAsset),
      sourceAssetDetails: sourceDocument.sourceAsset,
      variant: variantDocument.variant,
      keyframeEditPrompts: variantDocument.keyframeEditPrompts,
      editedKeyframes: variantDocument.editedKeyframes,
      seedancePrompts: variantDocument.seedancePrompts,
      creationStageStates: variantDocument.creationStageStates,
    };
  }
}
