import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneAdaptationDirectionPanel } from '../src/sceneforge/components/workspace/SceneAdaptationDirectionPanel';
import { SceneGateAnalysisPanel } from '../src/sceneforge/components/workspace/SceneGateAnalysisPanel';
import { SceneGateConfirmPanel } from '../src/sceneforge/components/workspace/SceneGateConfirmPanel';
import { SceneGateScoreCards } from '../src/sceneforge/components/workspace/SceneGateScoreCards';
import { useSceneStageRunSessionStore } from '../src/sceneforge/store/scene-stage-run-session';

describe('SceneForge intake direction cards', () => {
  it('renders selectable direction cards with the current selection', () => {
    const html = renderToStaticMarkup(
      <SceneAdaptationDirectionPanel
        projectDir="/tmp/project"
        status="pending"
        directions={[
          { id: 'a', title: '悬疑重构', summary: '保留核心诡计' },
          { id: 'b', title: '温情改编', summary: '弱化冲突' },
        ]}
        selectedId="b"
        onConfirmed={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('悬疑重构');
    expect(html).toContain('温情改编');
    expect(html).toContain('保留核心诡计');
    expect(html).toMatch(/checked="" value="b"/);
    expect(html).toContain('确认改编方向');
  });

  it('shows an advanced Markdown fallback when no direction exists', () => {
    const html = renderToStaticMarkup(
      <SceneAdaptationDirectionPanel
        projectDir="/tmp/project"
        status="pending"
        directions={[]}
        onConfirmed={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('请在高级 Markdown 中补充改编方向');
    expect(html).not.toContain('确认改编方向');
  });

  it('shows a confirmed summary and reselect action', () => {
    const html = renderToStaticMarkup(
      <SceneAdaptationDirectionPanel
        projectDir="/tmp/project"
        status="selected"
        directions={[{ id: 'a', title: '悬疑重构', summary: '保留核心诡计' }]}
        selectedId="a"
        onConfirmed={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('当前改编方向');
    expect(html).toContain('悬疑重构');
    expect(html).toContain('重新选择');
  });
});

describe('SceneForge topic gate cards', () => {
  it('renders score labels and raw values, including an honest empty state', () => {
    const populated = renderToStaticMarkup(
      <SceneGateScoreCards
        scoreState={{
          items: [
            { label: '传播潜力', value: '8/10' },
            { label: '制作可行性', value: '高' },
          ],
          rawSection: '- 传播潜力: 8/10',
        }}
      />,
    );
    const empty = renderToStaticMarkup(
      <SceneGateScoreCards scoreState={{ items: [], rawSection: null }} />,
    );

    expect(populated).toContain('传播潜力');
    expect(populated).toContain('8/10');
    expect(populated).toContain('制作可行性');
    expect(empty).toContain('当前简报没有评分数据');
  });

  it('renders decision consequences and style family as cards', () => {
    const html = renderToStaticMarkup(
      <SceneGateConfirmPanel
        projectDir="/tmp/project"
        gateState={{
          decision: 'go',
          styleOptions: [{ id: 'cinema', label: '电影感', family: 'live_action' }],
          selectedStyleId: 'cinema',
          styleConfirmed: false,
        }}
        onSubmitted={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('继续制作');
    expect(html).toContain('先观望');
    expect(html).toContain('放弃选题');
    expect(html).toContain('认可这个选题');
    expect(html).toContain('暂不往下推进');
    expect(html).toContain('不再投入这个方向');
    expect(html).toContain('live_action');
  });

  it('keeps the confirmed gate summary editable', () => {
    const html = renderToStaticMarkup(
      <SceneGateConfirmPanel
        projectDir="/tmp/project"
        gateState={{
          decision: 'go',
          styleOptions: [{ id: 'cinema', label: '电影感', family: 'live_action' }],
          selectedStyleId: 'cinema',
          styleConfirmed: true,
        }}
        topicBriefMarkdown="total_duration_sec: 60\nsegment_duration_sec: 8"
        onSubmitted={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('电影感');
    expect(html).toContain('修改风格与决策');
  });

  it('shows a busy hint in topic analysis while the stage is running', () => {
    useSceneStageRunSessionStore.getState().reset();
    useSceneStageRunSessionStore.getState().upsertSession({
      projectDir: '/tmp/project',
      stage: 'topic_gate',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: '正在分析选题，请稍候。',
      error: null,
    });

    const html = renderToStaticMarkup(
      <SceneGateAnalysisPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="summary: test"
        busy={true}
        onAnalyzed={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('正在分析选题');
    expect(html).toContain('当前阶段已进入执行中');
    useSceneStageRunSessionStore.getState().reset();
  });
});
