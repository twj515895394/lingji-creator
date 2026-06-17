import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneForgeStudio } from '../src/sceneforge/pages/SceneForgeStudio';
import { Setup } from '../src/pages/Setup';

describe('SceneForgeStudio', () => {
  it('renders the empty Studio shell with core stage entries', () => {
    const html = renderToStaticMarkup(<SceneForgeStudio />);

    expect(html).toContain('SceneForge Studio');
    expect(html).toContain('流程阶段');
    expect(html).toContain('当前阶段工作区');
    expect(html).toContain('产物检查器');
    expect(html).toContain('审批策略');
    expect(html).toContain('Approve &amp; Continue');
    expect(html).toContain('Preview');
    expect(html).toContain('Structure');
    expect(html).toContain('Trace');
    expect(html).toContain('Raw');
    expect(html).toContain('Copy');
    expect(html).toContain('Required');
    expect(html).toContain('Optional');
    expect(html).toContain('Auto if valid');
    expect(html).toContain('Skip');
    expect(html).toContain('设定图提示词');
    expect(html).toContain('故事板提示词');
    expect(html).toContain('视频提示词包');
    expect(html).toContain('Design Prompts');
    expect(html).toContain('Storyboard Prompts');
    expect(html).toContain('Video Prompt Packs');
  });
});

describe('Setup SceneForge entry', () => {
  it('renders a SceneForge project creation entry', () => {
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

    expect(html).toContain('SceneForge');
  });
});
