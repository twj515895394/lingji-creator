// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ComponentProps } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RemixIpcContract } from '../electron/sceneforge/remix/remix-ipc-types';
import { MOCK_CREATION_WORKSPACE_SNAPSHOT } from '../src/sceneforge/remix/mock/mock-data';
import { RemixCreationWorkspace } from '../src/sceneforge/remix/pages/RemixCreationWorkspace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(window as typeof window & { matchMedia?: (query: string) => MediaQueryList }).matchMedia =
  window.matchMedia ??
  (() =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList);

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildApiClient(options?: { trimForUploadFlow?: boolean }): RemixIpcContract {
  let snapshot = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT);
  const generatedSeedancePrompt = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT.seedancePrompts[0]);
  if (options?.trimForUploadFlow) {
    snapshot.keyframeEditPrompts = [snapshot.keyframeEditPrompts[0]];
    snapshot.editedKeyframes = [];
    snapshot.seedancePrompts = [];
  }
  return {
    listSourceAssets: async () => ({ sourceAssets: [] }),
    getSourceAsset: async () => { throw new Error('not implemented'); },
    updateSourceAssetMetadata: async () => { throw new Error('not implemented'); },
    createSourceAssetFromImport: async () => { throw new Error('not implemented'); },
    runSourceSegmentation: async () => { throw new Error('not implemented'); },
    runSourceKeyframes: async () => { throw new Error('not implemented'); },
    runSourceUnderstanding: async () => { throw new Error('not implemented'); },
    publishSourceAssetToLibrary: async () => { throw new Error('not implemented'); },
    createVariantFromSourceAsset: async () => { throw new Error('not implemented'); },
    listVariantsForSourceAsset: async () => [],
    renameVariant: async () => { throw new Error('not implemented'); },
    duplicateVariant: async () => { throw new Error('not implemented'); },
    deleteVariant: async () => { throw new Error('not implemented'); },
    getCreationWorkspace: async () => snapshot,
    updateVariantConfig: async () => snapshot,
    runRemixStrategy: async () => ({
      ...snapshot,
      creationStageStates: {
        ...snapshot.creationStageStates,
        remix_strategy: 'approved',
      },
    }),
    runRemixDesign: async () => ({
      ...snapshot,
      creationStageStates: {
        ...snapshot.creationStageStates,
        remix_design: 'approved',
      },
    }),
    runKeyframeEditPrompts: async () => snapshot,
    registerEditedKeyframe: async (input) => {
      snapshot = {
        ...snapshot,
        editedKeyframes: [
          ...snapshot.editedKeyframes.filter(
            (frame) => !(frame.segmentId === input.segmentId && frame.frameRole === input.frameRole),
          ),
          {
            id: `${input.variantId}-${input.segmentId}-${input.frameRole}-edited`,
            variantId: input.variantId,
            segmentId: input.segmentId,
            frameRole: input.frameRole,
            sourceFramePath: input.sourceFramePath,
            promptPath: input.promptPath,
            editedFramePath: input.editedFramePath,
            status: 'generated',
            qualityChecks: [],
            createdAt: '2026-06-23T12:00:00.000Z',
            updatedAt: '2026-06-23T12:00:00.000Z',
          },
        ],
      };
      return snapshot;
    },
    updateEditedKeyframeStatus: async (input) => {
      snapshot = {
        ...snapshot,
        editedKeyframes: snapshot.editedKeyframes.map((frame) =>
          frame.id === input.editedKeyframeId
            ? { ...frame, status: input.status }
            : frame,
        ),
      };
      return snapshot;
    },
    runSeedancePrompts: async () => {
      snapshot = {
        ...snapshot,
        seedancePrompts: [
          {
            ...generatedSeedancePrompt,
            id: 'seedance-generated-001',
            variantId: snapshot.variant.id,
          },
        ],
      };
      return snapshot;
    },
    exportPromptBundle: async (input) => ({
      bundlePath: input.outputPath ?? '/tmp/remix-bundle.zip',
      workspace: snapshot,
    }),
  };
}

async function renderStaticWorkspace(props: ComponentProps<typeof RemixCreationWorkspace>) {
  const container = await renderLive(<RemixCreationWorkspace {...props} />);
  return container.innerHTML;
}

async function renderLive(node: JSX.Element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ container, root });
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

afterEach(() => {
  for (const item of mounted.splice(0)) {
    act(() => item.root.unmount());
    item.container.remove();
  }
  (window as typeof window & { electronAPI?: unknown }).electronAPI = undefined;
});

describe('SceneForge Remix creation workspace', () => {
  it('renders variant config with the fixed retention matrix in step 2', async () => {
    const container = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-creation-project"
        apiClient={buildApiClient()}
        variantId="variant-001"
        initialStepId="create-variant"
      />,
    );
    const html = container.innerHTML;

    expect(html).toContain('data-testid="remix-variant-config-panel"');
    expect(html).toContain('data-testid="remix-retention-matrix-editor"');
    expect(html).toContain('剧情结构');
    expect(html).toContain('梗机制');
    expect(html).not.toContain('导入原片');
    expect(html).toContain('data-testid="remix-creation-reference-preview"');
  });

  it('renders copy-ready prompt and inspector-focused selection states', async () => {
    const promptContainer = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-creation-project"
        apiClient={buildApiClient()}
        variantId="variant-001"
        initialStepId="keyframe-prompts"
        initialSelectedPromptId="kprompt-001"
      />,
    );
    const promptHtml = promptContainer.innerHTML;
    expect(promptHtml).toContain('data-testid="remix-keyframe-prompt-list"');
    expect(promptHtml).toContain('复制提示词');
    expect(promptHtml).toContain('当前改图提示词预览');

    const editedContainer = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-creation-project"
        apiClient={buildApiClient({ trimForUploadFlow: true })}
        variantId="variant-001"
        initialStepId="edited-keyframes"
        initialSelectedEditedKeyframeId="edited-002"
      />,
    );
    const editedHtml = editedContainer.innerHTML;
    expect(editedHtml).toContain('data-testid="remix-edited-keyframe-gallery"');
    expect(editedHtml).toContain('改后关键帧');
  });

  it('renders structured seedance prompt preview and publish checklist', async () => {
    const seedanceContainer = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-creation-project"
        apiClient={buildApiClient()}
        variantId="variant-001"
        initialStepId="seedance-prompts"
        initialSelectedPromptId="seedance-001"
      />,
    );
    const seedanceHtml = seedanceContainer.innerHTML;
    expect(seedanceHtml).toContain('data-testid="remix-seedance-prompt-preview"');
    expect(seedanceHtml).toContain('画面');
    expect(seedanceHtml).toContain('环境声');

    const publishContainer = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-creation-project"
        apiClient={buildApiClient()}
        variantId="variant-001"
        initialStepId="publish-bundle"
      />,
    );
    const publishHtml = publishContainer.innerHTML;
    expect(publishHtml).toContain('data-testid="remix-publish-checklist"');
    expect(publishHtml).toContain('导出 ZIP');
    expect(publishHtml).toContain('导出到文件夹');
  });

  it('loads real workspace snapshot and allows running strategy action', async () => {
    const container = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        variantId="variant-001"
        initialStepId="strategy"
      />,
    );

    expect(container.textContent).toContain('狸猫黑帮版');
    const actionButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('生成改编策略'),
    );
    await act(async () => {
      actionButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('改编策略');
    expect(container.querySelector('[data-testid="remix-creation-inspector"]')).not.toBeNull();
  });

  it('supports uploading edited keyframes, generating prompts and exporting bundle', async () => {
    (window as typeof window & { electronAPI?: { selectMediaFile: (kind: string) => Promise<string | null>; selectRemixBundlePath: (defaultPath?: string) => Promise<string | null>; selectRemixBundleDirectory: (defaultPath?: string) => Promise<string | null>; getPathForFile: (file: File) => string } }).electronAPI = {
      selectMediaFile: async () => '/tmp/edited-frame.png',
      selectRemixBundlePath: async () => '/tmp/remix-bundle.zip',
      selectRemixBundleDirectory: async () => '/tmp/remix-bundle-dir',
      getPathForFile: () => '/tmp/edited-frame.png',
    };

    const container = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient({ trimForUploadFlow: true })}
        variantId="variant-001"
        initialStepId="edited-keyframes"
      />,
    );

    const uploadButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('选择改后关键帧'),
    );
    await act(async () => {
      uploadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const approveButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('通过'),
    );
    await act(async () => {
      approveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('当前目标');

    const seedanceNav = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Seedance'),
    );
    await act(async () => {
      seedanceNav?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const generateButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('生成视频提示词'),
    );
    expect(generateButton?.getAttribute('disabled')).toBeNull();
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const publishNav = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('发布清单'),
    );
    await act(async () => {
      publishNav?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const exportZipButton = container.querySelector('[data-testid="remix-creation-export-zip"]');
    await act(async () => {
      exportZipButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('已导出到：/tmp/remix-bundle.zip');

    const exportDirectoryButton = container.querySelector('[data-testid="remix-creation-export-directory"]');
    await act(async () => {
      exportDirectoryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('已导出到：/tmp/remix-bundle-dir');
  });
});
