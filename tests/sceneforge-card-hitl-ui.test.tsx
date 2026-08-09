import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneAdaptationDirectionPanel } from '../src/sceneforge/components/workspace/SceneAdaptationDirectionPanel';
import { SceneGateAnalysisPanel } from '../src/sceneforge/components/workspace/SceneGateAnalysisPanel';
import { SceneGateBriefForm } from '../src/sceneforge/components/workspace/SceneGateBriefForm';
import { SceneGateConfirmPanel } from '../src/sceneforge/components/workspace/SceneGateConfirmPanel';
import { SceneGateScoreCards } from '../src/sceneforge/components/workspace/SceneGateScoreCards';
import { SceneTopicIntentCheckPanel } from '../src/sceneforge/components/workspace/SceneTopicIntentCheckPanel';
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

  it('keeps confirm disabled until the user has actually filled the brief fields', () => {
    const html = renderToStaticMarkup(
      <SceneGateBriefForm
        projectDir="/tmp/project"
        initialMarkdown=""
        canSave={false}
        onDraftChange={vi.fn()}
        onConfirmDraft={vi.fn()}
        onSubmitted={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('确认选题描述');
    expect(html).toContain('保存选题简报');
    expect(html).toMatch(/确认选题描述<\/button>/);
    expect(html).toMatch(/保存选题简报<\/button>/);
    expect(html).toMatch(/disabled=""/);
  });

  it('renders missing intent dimensions and suggestions when the check fails', () => {
    const html = renderToStaticMarkup(
      <SceneTopicIntentCheckPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="# 选题简报\n\n## 创作意图\n做个有意思的视频"
        initialCheckMarkdown={`# 创作意图检查

status: needs_more
intent_hash: abc123
summary: 当前描述还不足以稳定推导整段视频方向。

## 缺失项
- id: narrative_hook | label: 改编角度 / 叙事抓手 | reason: 没有说明从哪个冲突或切口切入

## 补充建议
- dimension_id: narrative_hook | tip: 你最想放大的冲突、反差或情绪点是什么？
- dimension_id: narrative_hook | tip: 如果只能保留一个记忆点，希望观众记住什么？
`}
        onChecked={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('还不能分析选题');
    expect(html).toContain('改编角度 / 叙事抓手');
    expect(html).toContain('你最想放大的冲突、反差或情绪点是什么？');
  });

  it('shows a stale hint when topic intent needs to be rechecked', () => {
    const html = renderToStaticMarkup(
      <SceneTopicIntentCheckPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="# 选题简报\n\n## 创作意图\n做个有意思的视频"
        initialCheckMarkdown={`# 创作意图检查

status: pass
intent_hash: deadbeef
summary: 当前创作意图已经足够明确，可以进入选题分析。
`}
        stale={true}
        onChecked={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('你刚修改了选题描述，请重新确认');
    expect(html).toContain('选题描述已确认');
    expect(html).toContain('当前创作意图已经足够明确，可以进入选题分析。');
  });

  it('shows optional advice after the topic intent passes', () => {
    const html = renderToStaticMarkup(
      <SceneTopicIntentCheckPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="# 选题简报\n\n## 创作意图\n两个人在街头球场斗牛，最后完成绝杀扣篮。"
        initialCheckMarkdown={`# 创作意图检查

status: pass
intent_hash: pass123
summary: 当前创作意图已经足够明确，可以进入选题分析。

## 缺失项
- 无

## 补充建议
- dimension_id: expression_goal | tip: 可以补一句想让观众感到热血还是轻松，让后续节奏更稳。
- dimension_id: style_direction | tip: 如果你已经有大致画面倾向，也可以顺手补一句，但这不是当前必填。
`}
        onChecked={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('选题描述已确认');
    expect(html).toContain('这些信息不是当前必填，但补上后能让后续故事方向更稳。');
    expect(html).toContain('情感方向');
    expect(html).toContain('风格倾向');
    expect(html).toContain('这不是当前必填');
  });

  it('keeps previous suggestion cards visible after edit until the next confirm starts', () => {
    const html = renderToStaticMarkup(
      <SceneTopicIntentCheckPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="# 选题简报\n\n## 创作意图\n做个有意思的视频"
        initialCheckMarkdown={`# 创作意图检查

status: needs_more
intent_hash: abc123
summary: 当前描述还不足以稳定推导整段视频方向。

## 缺失项
- id: narrative_hook | label: 改编角度 / 叙事抓手 | reason: 没有说明从哪个冲突或切口切入

## 补充建议
- dimension_id: narrative_hook | tip: 你最想放大的冲突、反差或情绪点是什么？
`}
        stale={true}
        onChecked={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('你刚修改了选题描述，请重新确认');
    expect(html).toContain('还不能分析选题');
    expect(html).toContain('改编角度 / 叙事抓手');
    expect(html).toContain('你最想放大的冲突、反差或情绪点是什么？');
  });

  it('explains why topic analysis is still locked before the intent check passes', () => {
    const html = renderToStaticMarkup(
      <SceneGateAnalysisPanel
        projectDir="/tmp/project"
        topicBriefMarkdown="# 选题简报\n\n## 创作意图\n做个有意思的视频"
        intentCheckStatus="needs_more"
        intentCheckStale={false}
        onAnalyzed={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(html).toContain('请先确认选题描述，通过后再保存并分析');
    expect(html).toContain('分析选题');
  });
});
