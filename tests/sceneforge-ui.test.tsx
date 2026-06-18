import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StageRunPanel } from '../src/sceneforge/components/stage-run/StageRunPanel';
import { SceneForgeStudio } from '../src/sceneforge/pages/SceneForgeStudio';
import { Setup } from '../src/pages/Setup';

describe('SceneForgeStudio', () => {
  it('renders the Studio shell with pipeline and inspector', () => {
    const html = renderToStaticMarkup(<SceneForgeStudio />);

    expect(html).toContain('视频内容创作工坊');
    expect(html).toContain('创作流水线');
    expect(html).toContain('流程阶段');
    expect(html).toContain('当前阶段工作区');
    expect(html).toContain('产物检查器');
    expect(html).toContain('选题闸门');
    expect(html).toContain('设定图提示词');
    expect(html).toContain('分镜提示词');
    expect(html).toContain('视频提示词');
    expect(html).toContain('data-testid="scene-pipeline-sidebar"');
    expect(html).toContain('Validate');
    expect(html).toContain('Continue');
    expect(html).toContain('data-testid="scene-stage-flow-actions"');
  });

  it('renders the core stage runner controls', () => {
    vi.stubGlobal('window', { electronAPI: { sceneRunStage: vi.fn() } });
    try {
      const html = renderToStaticMarkup(
        <StageRunPanel projectDir="/tmp/sceneforge-project" stage="design" stageTitle="设定图提示词" />,
      );

      expect(html).toContain('执行方式');
      expect(html).toContain('data-testid="scene-stage-run-panel"');
      expect(html).toContain('data-testid="scene-runner-select"');
      expect(html).toContain('data-testid="scene-run-stage-button"');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Setup SceneForge entry', () => {
  it('renders video workshop creation entry', () => {
    const noopAsync = async () => undefined;
    const html = renderToStaticMarkup(
      <Setup
        busy={false}
        errorMessage={null}
        projectName=""
        recentProjects={[]}
        onComplete={noopAsync}
        onOpenRecentProject={noopAsync}
        onImportScript={noopAsync}
        onOpenSettings={() => undefined}
        onDouyinImport={noopAsync}
        onImportProject={() => undefined}
        onCreateSceneForgeProject={noopAsync}
      />,
    );

    expect(html).toContain('视频内容创作工坊');
  });
});
