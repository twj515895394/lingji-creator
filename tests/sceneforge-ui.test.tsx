import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StageRunPanel } from '../src/sceneforge/components/stage-run/StageRunPanel';
import { SceneStageInputsPanel } from '../src/sceneforge/components/studio/SceneStageInputsPanel';
import { SceneStyleSelectorPanel } from '../src/sceneforge/components/studio/SceneStyleSelectorPanel';
import { SceneStageFlowActions } from '../src/sceneforge/components/workspace/SceneStageFlowActions';
import { ScenePrepSupportWorkspace } from '../src/sceneforge/components/workspace/ScenePrepSupportWorkspace';
import { SceneForgeStudio } from '../src/sceneforge/pages/SceneForgeStudio';
import { useSceneForgeStudioLayout } from '../src/sceneforge/hooks/useSceneForgeStudioLayout';
import { Setup } from '../src/pages/Setup';

function LayoutProbe() {
  const layout = useSceneForgeStudioLayout();
  return (
    <div>
      <span data-inspector-width={layout.inspectorWidth} />
      <span data-inspector-max={layout.inspectorMax} />
    </div>
  );
}

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
    expect(html).not.toContain('data-testid="scene-style-selector"');
    expect(html).toContain('分析选题');
    expect(html).toContain('scene-gate-analysis-panel');
    expect(html).toContain('确认风格并继续');
    expect(html).not.toContain('data-testid="scene-stage-flow-actions"');
    expect(html).not.toContain('当前简报没有评分数据');
    expect(html).not.toContain('Agent 推进');
    expect(html).not.toContain('项目上下文资产');
    expect(html).not.toContain('填充 MVP 占位（测试用）');
    expect(html).not.toContain('data-testid="scene-workspace-copy"');
  });

  it('renders the core stage runner controls', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
        sceneGetStageContext: vi.fn().mockResolvedValue({
          stage: 'design',
          requiredInputs: [],
          optionalInputs: [],
          outputContract: { requiredArtifacts: [] },
          forbiddenActions: [],
          warnings: [],
          handoffRefs: [],
        }),
      },
    });
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

  it('renders an explicit Continue & Run action without replacing Continue', () => {
    const html = renderToStaticMarkup(
      <SceneStageFlowActions
        canValidate={true}
        validatePassed={true}
        canContinue={true}
        canContinueAndRun={true}
        nextStageTitle="分镜提示词"
        onValidate={vi.fn()}
        onContinue={vi.fn()}
        onContinueAndRun={vi.fn()}
      />,
    );

    expect(html).toContain('Continue');
    expect(html).toContain('Continue &amp; Run');
    expect(html).toContain('分镜提示词');
    expect(html).toContain('生成结果仍需手动提交');
    expect(html).toContain('data-testid="scene-continue-and-run"');
  });

  it('shows a support light-confirmation hint without changing Continue semantics', () => {
    const html = renderToStaticMarkup(
      <SceneStageFlowActions
        stageMode="support_light"
        canValidate={true}
        validatePassed={true}
        canContinue={true}
        onValidate={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(html).toContain('Continue');
    expect(html).toContain('当前阶段为轻确认路径');
  });

  it('shows an injected next-stage run result in the draft review', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
        sceneSubmitStageDraft: vi.fn(),
        sceneGetStageContext: vi.fn().mockResolvedValue({
          stage: 'storyboard',
          requiredInputs: [],
          optionalInputs: [],
          outputContract: { requiredArtifacts: [] },
          forbiddenActions: [],
          warnings: [],
          handoffRefs: [],
        }),
      },
    });
    try {
      const html = renderToStaticMarkup(
        <StageRunPanel
          projectDir="/tmp/sceneforge-project"
          stage="storyboard"
          stageTitle="分镜提示词"
          draftSubmitLabel="提交草案并继续到下一阶段"
          initialRunResult={{
            runnerType: 'direct_llm',
            stage: 'storyboard',
            artifacts: {
              storyboard_prompt_pack: '# 自动生成草案',
            },
            requiredArtifacts: ['storyboard_prompt_pack'],
          }}
        />,
      );

      expect(html).toContain('生成草案');
      expect(html).toContain('分镜提示词包 (storyboard_prompt_pack)');
      expect(html).toContain('自动生成草案');
      expect(html).toContain('重新生成草案');
      expect(html).toContain('提交草案并继续到下一阶段');
      expect(html).toContain('data-testid="scene-draft-refinement-panel"');
      expect(html).toContain('一次性补充意见');
      expect(html).toContain('补充优化');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows a dedicated request revision action for submitted stages', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
        sceneRequestRevision: vi.fn(),
        sceneGetStageContext: vi.fn().mockResolvedValue({
          stage: 'design',
          requiredInputs: [],
          optionalInputs: [],
          outputContract: { requiredArtifacts: [] },
          forbiddenActions: [],
          warnings: [],
          handoffRefs: [],
        }),
      },
    });
    try {
      const html = renderToStaticMarkup(
        <StageRunPanel
          projectDir="/tmp/sceneforge-project"
          stage="design"
          stageTitle="设定图提示词"
          currentStatus="approved"
          revisionNote="请收紧构图与镜头语言。"
        />,
      );

      expect(html).toContain('data-testid="scene-reopen-regenerate-button"');
      expect(html).toContain('撤回并重生成');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not inject a run result into a different stage panel', () => {
    vi.stubGlobal('window', { electronAPI: { sceneRunStage: vi.fn() } });
    try {
      const html = renderToStaticMarkup(
        <StageRunPanel
          projectDir="/tmp/sceneforge-project"
          stage="design"
          stageTitle="设定图提示词"
          initialRunResult={{
            runnerType: 'direct_llm',
            stage: 'storyboard',
            artifacts: { storyboard_prompt_pack: '# 不应显示' },
            requiredArtifacts: ['storyboard_prompt_pack'],
          }}
        />,
      );

      expect(html).not.toContain('storyboard_prompt_pack');
      expect(html).not.toContain('不应显示');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps performance Direct LLM and manual Markdown paths together', () => {
    vi.stubGlobal('window', { electronAPI: { sceneRunStage: vi.fn() } });
    try {
      const html = renderToStaticMarkup(
        <ScenePrepSupportWorkspace
          projectDir="/tmp/sceneforge-project"
          stage="performance"
          stageTitle="表演指导"
        />,
      );

      expect(html).toContain('data-testid="scene-stage-run-panel"');
      expect(html).toContain('Direct LLM');
      expect(html).toContain('表演指导');
      expect(html).toContain('提交草案');
      expect(html).toContain('textarea');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows continue-oriented submit copy when a support stage auto-advances', () => {
    vi.stubGlobal('window', { electronAPI: { sceneRunStage: vi.fn() } });
    try {
      const html = renderToStaticMarkup(
        <ScenePrepSupportWorkspace
          projectDir="/tmp/sceneforge-project"
          stage="performance"
          stageTitle="表演指导"
          autoAdvanceAfterSubmit={true}
        />,
      );

      expect(html).toContain('校验通过后会直接进入下一阶段');
      expect(html).toContain('提交并继续');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('hides the project style selector after gate style is confirmed and no extra asset is needed', () => {
    const html = renderToStaticMarkup(
      <SceneStyleSelectorPanel
        assetLibrary={undefined}
      />,
    );

    expect(html).toBe('');
  });

  it('renders stage inputs and project assets as separate semantic panels', () => {
    const html = renderToStaticMarkup(
      <>
        <SceneStageInputsPanel
          stageContext={{
            stage: 'script',
            requiredInputs: [
              {
                stage: 'story',
                artifactId: 'story.story_direction',
                path: '',
                title: '故事方向',
                content: '',
                delivery: 'handoff',
                policyInputId: 'story_direction',
                satisfied: true,
                fromStage: 'story',
                artifactKey: 'story_direction',
                priorityOrder: 4,
              },
              {
                stage: 'design',
                artifactId: 'design.design_prompts',
                path: '',
                title: '设定图提示词',
                content: '',
                delivery: 'handoff',
                policyInputId: 'design_prompts',
                satisfied: true,
                fromStage: 'design',
                artifactKey: 'design_prompts',
                priorityOrder: 6,
              },
              {
                stage: 'design',
                artifactId: 'design.master_reference_prompt',
                path: '',
                title: '总参考图提示词',
                content: '',
                delivery: 'handoff',
                policyInputId: 'design_master',
                satisfied: true,
                fromStage: 'design',
                artifactKey: 'master_reference_prompt',
                priorityOrder: 6,
              },
            ],
            optionalInputs: [],
            referencePriority: {
              rule: '后阶段优先于前阶段。',
              currentInputsHighestFirst: [],
            },
            outputContract: { requiredArtifacts: [] },
            forbiddenActions: [],
            warnings: [],
            handoffRefs: [],
            assetLibrary: undefined,
          }}
        />
        <SceneStyleSelectorPanel
          assetLibrary={{
            selectedAssets: ['style.pixar_like', 'cinematic.shot_language'],
            snippets: [
              {
                id: 'style.pixar_like',
                title: 'Pixar-like 3D',
                type: 'style_profile',
                text: '风格摘要',
              },
            ],
          }}
        />
      </>,
    );

    expect(html).toContain('本阶段输入');
    expect(html).toContain('上游阶段产物，不含项目级参考资产');
    expect(html).toContain('阻塞型上游输入');
    expect(html).toContain('阻塞 3');
    expect(html).toContain('补充 0');
    expect(html).toContain('全部就绪');
    expect(html).toContain('补充型上游输入');
    expect(html.indexOf('design.design_prompts')).toBeLessThan(html.indexOf('story.story_direction'));
    expect(html).toContain('design.master_reference_prompt');
    expect(html).toContain('跨阶段参考资产');
    expect(html).toContain('当前阶段生效');
    expect(html).toContain('Pixar-like 3D');
    expect(html).not.toContain('项目上下文资产');
  });

  it('expands stage inputs by default when required upstream is missing', () => {
    const html = renderToStaticMarkup(
      <SceneStageInputsPanel
        stageContext={{
          stage: 'video_prompts',
          requiredInputs: [
            {
              stage: 'storyboard',
              artifactId: 'storyboard.storyboard_prompt_pack',
              path: '',
              title: '故事板提示词包',
              content: '',
              delivery: 'handoff',
              policyInputId: 'storyboard_prompt_pack',
              satisfied: false,
              fromStage: 'storyboard',
              artifactKey: 'storyboard_prompt_pack',
              priorityOrder: 6,
            },
          ],
          optionalInputs: [],
          referencePriority: {
            rule: '后阶段优先于前阶段。',
            currentInputsHighestFirst: [],
          },
          outputContract: { requiredArtifacts: [] },
          forbiddenActions: [],
          warnings: [],
          handoffRefs: [],
          assetLibrary: undefined,
        }}
      />,
    );

    expect(html).toContain('缺失 1');
    expect(html).toContain('data-default-open="true"');
  });

  it('gives the inspector a wider default layout budget', () => {
    vi.stubGlobal('window', {
      innerWidth: 1600,
      localStorage: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    try {
      const html = renderToStaticMarkup(<LayoutProbe />);
      expect(html).toContain('data-inspector-width="360"');
      expect(html).toContain('data-inspector-max="560"');
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
        onMediaImport={noopAsync}
        onImportProject={() => undefined}
        onCreateSceneForgeProject={noopAsync}
        onOpenRemixMode={noopAsync}
      />,
    );

    expect(html).toContain('视频内容创作工坊');
    expect(html).toContain('Remix Mode');
  });
});
