import { describe, expect, it, vi } from 'vitest';
import { MOCK_LLM_SETTINGS } from './sceneforge-mock-llm-settings';
import {
  createDirectLlmStageRunner,
  SceneDirectLlmRunnerError,
} from '../electron/sceneforge/runners/scene-direct-llm-runner';
import type { SceneStageContext } from '../electron/sceneforge/pipeline/scene-context-builder';
import type { SceneStageId } from '../electron/sceneforge/types';

const REQUIRED_ARTIFACTS = {
  design: [
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
  ],
  storyboard: [
    'storyboard_prompt_pack',
    'control_board_prompts',
    'style_board_prompts',
    'master_board_prompt',
  ],
  video_prompts: ['video_prompt_pack_cn', 'video_prompt_review', 'video_prompt_trace'],
  performance: ['performance_direction'],
  audio: ['audio_design'],
  reference: ['reference_notes'],
  story: ['story_direction'],
  assets: ['asset_plan'],
  script: ['script_draft'],
} as const;

function makeContext(stage: keyof typeof REQUIRED_ARTIFACTS): SceneStageContext {
  return {
    stage,
    requiredInputs: [],
    optionalInputs: [],
    referencePriority: {
      rule: '后阶段优先于前阶段。',
      currentInputsHighestFirst: [],
    },
    outputContract: {
      requiredArtifacts: [...REQUIRED_ARTIFACTS[stage]],
    },
    forbiddenActions: [],
    warnings: [],
    handoffRefs: [],
  };
}

function makeVideoPromptsMultiPackContext(): SceneStageContext {
  return {
    ...makeContext('video_prompts'),
    requiredInputs: [
      {
        artifactId: 'storyboard.storyboard_prompt_pack',
        title: '故事板提示词包',
        delivery: 'full',
        source: 'artifact',
        priorityOrder: 1,
        priorityNote: 'storyboard locked',
        content: [
          '## storyboard_prompt_pack_plan',
          '总镜头数：19。多包。',
          'Pack 1 覆盖 Shot 01-06。',
          'Pack 2 覆盖 Shot 07-12。',
          'Pack 3 覆盖 Shot 13-19。',
        ].join('\n'),
        fromStage: 'storyboard',
        artifactKey: 'storyboard_prompt_pack',
        path: '/tmp/storyboard_prompt_pack.md',
      },
    ],
  };
}

function makeArtifacts(stage: keyof typeof REQUIRED_ARTIFACTS): Record<string, string> {
  if (stage === 'story') {
    return {
      story_direction: `## story_development_summary
围绕返家受压到反击翻盘建立四拍故事骨架。

## logline
返家少年在街口受压后，用一次干净反击夺回主动权。

## story_premise
故事聚焦返家瞬间被压制，再通过升级动作完成情绪翻盘。

## duration_target
target_total_duration_seconds: 45
rationale: 四个 beat 足够完成建立、升级、高潮与收束。

## story_beats
- beat_id: beat_01
  title: 返家建立
  function: 中文（Setup）
  beat_summary: 建立主角返家状态、街口氛围与潜在压迫关系。
- beat_id: beat_02
  title: 对手施压
  function: 中文（Escalation）
  beat_summary: 对手公开压场，逼迫主角作出反应。
- beat_id: beat_03
  title: 正面对撞
  function: 中文（Climax）
  beat_summary: 主角抓住机会完成干净反击，把节奏拉回主动。
- beat_id: beat_04
  title: 余波收束
  function: 中文（Payoff）
  beat_summary: 冲突落地后，主角以更稳姿态结束返家考验。

## character_functions
主角负责承压并翻盘，对手负责制造公开压迫，围观者负责放大局面重量。

## core_scene_functions
街口负责建立公共压力，院门口负责承接动作收束。

## key_prop_functions
球体负责触发动作反击，院门负责形成回家与收束意象。

## emotional_arc
从克制压抑推进到被迫应战，再走向爆发后的稳态收束。

## hero_moment_candidates
主角在众人视线下完成一次干净反击的瞬间。

## ending_payoff
主角靠动作重新拿回体面与空间。

## story_risk_notes
需要避免 beat 之间只有情绪没有动作因果。

## next_action
进入 assets 阶段，把人物、场景与关键道具拆成可执行资产需求。`,
    };
  }
  return Object.fromEntries(
    REQUIRED_ARTIFACTS[stage].map((key) => [key, `# ${key}`]),
  );
}

const MOCK_LLM_SETTINGS_REF = MOCK_LLM_SETTINGS;

function createRunner(
  raw: string,
  loadSettings = async () => MOCK_LLM_SETTINGS_REF,
) {
  return createDirectLlmStageRunner({
    loadSettings,
    generateText: vi.fn().mockResolvedValue(raw),
  });
}

const DIRECT_LLM_STAGES: Array<keyof typeof REQUIRED_ARTIFACTS> = [
  'design',
  'storyboard',
  'video_prompts',
  'performance',
  'audio',
  'reference',
  'story',
  'assets',
  'script',
];

const baseInput = {
  projectDir: process.cwd(),
  manualArtifacts: undefined,
  submitStageDraft: vi.fn(),
};

describe('SceneForge direct_llm runner', () => {
  it.each(DIRECT_LLM_STAGES)('returns a complete %s artifact map without submitting', async (stage) => {
    const submitStageDraft = vi.fn();
    const artifacts = makeArtifacts(stage);
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    const result = await runner.run({
      ...baseInput,
      stage,
      stageContext: makeContext(stage),
      submitStageDraft,
    });

    expect(result.runnerType).toBe('direct_llm');
    expect(result.artifacts).toEqual(
      stage === 'storyboard'
        ? {
            ...artifacts,
            control_board_prompts:
              '## Control-Oriented Storyboard Board\n\n# control_board_prompts',
            style_board_prompts:
              '## Style & Rendering Storyboard Board\n\n# style_board_prompts',
          }
        : artifacts,
    );
    expect(submitStageDraft).not.toHaveBeenCalled();
    expect(generateText).toHaveBeenCalledTimes(stage === 'storyboard' ? 4 : 1);
  });

  it('injects agent instructions into system prompt and review checklist into user prompt', async () => {
    const artifacts = makeArtifacts('design');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'design',
      stageContext: makeContext('design'),
    });

    expect(generateText.mock.calls[0]?.[1]).toContain('## Stage Operating Rules');
    expect(generateText.mock.calls[0]?.[1]).toContain('Call `scene_get_stage_context` before drafting.');
    expect(generateText.mock.calls[0]?.[2]).toContain('## Reference Priority Rules');
    expect(generateText.mock.calls[0]?.[2]).toContain('后阶段优先于前阶段');
    expect(generateText.mock.calls[0]?.[2]).toContain('## Review Checklist');
    expect(generateText.mock.calls[0]?.[2]).toContain('角色提示词与整体视觉方向一致。');
  });

  it('injects storyboard multi-pack guardrails into the final prompt', async () => {
    const artifacts = makeArtifacts('storyboard');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
    });

    expect(generateText.mock.calls[0]?.[1]).toContain('每个可直接投喂外部出板模型的正式 Pack 包进显式标签');
    expect(generateText.mock.calls[0]?.[1]).toContain('Current Call Output Scope');
    expect(generateText.mock.calls[0]?.[2]).toContain('不能共享一个总说明块');
    expect(generateText.mock.calls[0]?.[2]).toContain('每个 Pack 都要可单独复制给外部出板模型');
    expect(generateText.mock.calls[0]?.[2]).toContain('Panel Layout');
    expect(generateText.mock.calls[0]?.[2]).toContain('design_revision_required: true | false');
    expect(generateText.mock.calls[0]?.[2]).toContain('本轮只生成 `storyboard_prompt_pack`');
    expect(generateText.mock.calls[0]?.[2]).toContain('section 只负责总结规划、连续性和审查信息');
    expect(generateText.mock.calls[1]?.[2]).toContain('# Storyboard Follow-Up User Prompt');
    expect(generateText.mock.calls[1]?.[2]).toContain('本轮只生成 `control_board_prompts`');
    expect(generateText.mock.calls[2]?.[2]).toContain('本轮只生成 `style_board_prompts`');
    expect(generateText.mock.calls[3]?.[2]).toContain('本轮只生成 `master_board_prompt`');
    expect(generateText.mock.calls[1]?.[2]).toContain('# Locked Storyboard Summary');
    expect(generateText.mock.calls[1]?.[2]).not.toContain('"requiredInputs"');
    expect(generateText.mock.calls[1]?.[2]).toContain('## Control Board Hard Rules');
    expect(generateText.mock.calls[1]?.[2]).toContain('画面区');
    expect(generateText.mock.calls[1]?.[2]).toContain('控制区');
    expect(generateText.mock.calls[1]?.[2]).toContain('Control-Oriented Storyboard Board');
    expect(generateText.mock.calls[1]?.[2]).toContain('红色人物运动箭头');
    expect(generateText.mock.calls[1]?.[2]).toContain('蓝色摄影机运动箭头');
    expect(generateText.mock.calls[1]?.[2]).toContain('分镜画面区内部');
    expect(generateText.mock.calls[1]?.[2]).toContain('景别、机位角度、构图重心');
    expect(generateText.mock.calls[1]?.[2]).toContain('Pack 交界镜头或衔接策略');
    expect(generateText.mock.calls[2]?.[2]).toContain('## Style Board Hard Rules');
    expect(generateText.mock.calls[2]?.[2]).toContain('必须是中文主导内容');
    expect(generateText.mock.calls[2]?.[2]).toContain('画面区');
    expect(generateText.mock.calls[2]?.[2]).toContain('控制区');
    expect(generateText.mock.calls[2]?.[2]).toContain('Style & Rendering Storyboard Board');
    expect(generateText.mock.calls[2]?.[2]).toContain('不得擅自改成新的角色造型');
    expect(generateText.mock.calls[2]?.[2]).toContain('不允许输出新的题材设定');
    expect(generateText.mock.calls[2]?.[2]).toContain('红色人物运动箭头');
    expect(generateText.mock.calls[2]?.[2]).toContain('蓝色摄影机运动箭头');
    expect(generateText.mock.calls[2]?.[2]).toContain('分镜画面区内部');
    expect(generateText.mock.calls[2]?.[2]).toContain('风格词 + 箭头规则');
    expect(generateText.mock.calls[2]?.[2]).toContain('Pack 交界镜头或风格衔接策略');
  });

  it('injects video_prompts hard rules into the final prompt', async () => {
    const artifacts = makeArtifacts('video_prompts');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'video_prompts',
      stageContext: makeContext('video_prompts'),
    });

    expect(generateText.mock.calls[0]?.[2]).toContain('## Video Prompts Hard Rules');
    expect(generateText.mock.calls[0]?.[2]).toContain('中文必须承担主体结构');
    expect(generateText.mock.calls[0]?.[2]).toContain('禁止输出“英文 compiled prompt + 中文备注”');
    expect(generateText.mock.calls[0]?.[2]).toContain('标题级摘要');
    expect(generateText.mock.calls[0]?.[2]).toContain('video_prompt_trace');
    expect(generateText.mock.calls[0]?.[2]).toContain('主 pack 中禁止保留旧残留结构');
  });

  it('retries story generation with a chinese-forcing appendix when the first draft is english-led', async () => {
    const firstDraft = {
      story_direction: `## story_development_summary
English summary only.

## logline
An underdog returns home and faces a neighborhood challenge.

## story_premise
An English premise paragraph that stays fully English.

## duration_target
target_total_duration_seconds: 45
rationale: English only.

## story_beats
- beat_id: beat_01
  title: The Return
  function: Setup
  beat_summary: He comes back home.
- beat_id: beat_02
  title: The Pressure
  function: Escalation
  beat_summary: The rivalry grows.
- beat_id: beat_03
  title: The Clash
  function: Climax
  beat_summary: He fights back.
- beat_id: beat_04
  title: The Release
  function: Payoff
  beat_summary: The tension resolves.

## character_functions
Hero versus rival.

## core_scene_functions
Street and yard.

## key_prop_functions
Ball and gate.

## emotional_arc
Pressure to relief.

## hero_moment_candidates
One decisive move.

## ending_payoff
He regains dignity.

## story_risk_notes
Too generic.

## next_action
Move to assets.`,
    };
    const secondDraft = {
      story_direction: `## story_development_summary
围绕返家受压到反击翻盘，建立四拍短片骨架。

## logline
返家少年在街口受压后，用一次干净反击重新夺回主动权。

## story_premise
故事聚焦返家瞬间被街坊对手压制，再通过一连串升级动作完成情绪翻盘。

## duration_target
target_total_duration_seconds: 45
rationale: 四个 beat 足够完成建立、升级、高潮与收束。

## story_beats
- beat_id: beat_01
  title: 返家建立
  function: 中文（Setup）
  beat_summary: 建立主角返家状态、街口氛围与潜在压迫关系。
- beat_id: beat_02
  title: 对手施压
  function: 中文（Escalation）
  beat_summary: 对手公开压场，逼迫主角在众目睽睽下作出反应。
- beat_id: beat_03
  title: 正面对撞
  function: 中文（Climax）
  beat_summary: 主角抓住一次机会完成干净反击，把节奏从被动拉回主动。
- beat_id: beat_04
  title: 余波收束
  function: 中文（Payoff）
  beat_summary: 冲突落地后，主角以更稳的姿态结束这次返家考验。

## character_functions
主角负责承受压力并完成翻盘，对手负责制造公开压迫，围观者负责放大局面重量。

## core_scene_functions
街口负责建立公共压力，院门口负责承接动作收束。

## key_prop_functions
球体负责触发动作反击，院门负责形成回家与收束意象。

## emotional_arc
从克制压抑推进到被迫应战，再走向短促爆发后的稳态收束。

## hero_moment_candidates
主角在众人视线下完成一次干净反击的瞬间。

## ending_payoff
主角不是靠嘴赢，而是靠动作重新拿回体面与空间。

## story_risk_notes
需要避免 beat 之间只有情绪没有动作因果。

## next_action
进入 assets 阶段，把人物、场景与关键道具拆成可执行资产需求。`,
    };
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(firstDraft))
      .mockResolvedValueOnce(JSON.stringify(secondDraft));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    const result = await runner.run({
      ...baseInput,
      stage: 'story',
      stageContext: makeContext('story'),
    });

    expect(result.artifacts).toEqual(secondDraft);
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[1]?.[2]).toContain('## 【强制纠正】上次输出语言违规');
    expect(generateText.mock.calls[1]?.[2]).toContain('请完全用简体中文重写 story_direction');
  });

  it('fails story generation when the chinese retry still returns an english-led draft', async () => {
    const englishDraft = {
      story_direction: `## story_development_summary
English summary only.

## logline
An English-only logline.

## story_premise
An English-only premise paragraph.

## duration_target
target_total_duration_seconds: 45
rationale: English only.

## story_beats
- beat_id: beat_01
  title: The Return
  function: Setup
  beat_summary: English beat.
- beat_id: beat_02
  title: The Pressure
  function: Escalation
  beat_summary: English beat.
- beat_id: beat_03
  title: The Clash
  function: Climax
  beat_summary: English beat.
- beat_id: beat_04
  title: The Release
  function: Payoff
  beat_summary: English beat.

## character_functions
English only.

## core_scene_functions
English only.

## key_prop_functions
English only.

## emotional_arc
English only.

## hero_moment_candidates
English only.

## ending_payoff
English only.

## story_risk_notes
English only.

## next_action
English only.`,
    };
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(englishDraft))
      .mockResolvedValueOnce(JSON.stringify(englishDraft));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await expect(
      runner.run({
        ...baseInput,
        stage: 'story',
        stageContext: makeContext('story'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_INVOKE_FAILED',
    });
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it('injects locked multi-pack structure into video_prompts when storyboard pack contains multiple packs', async () => {
    const artifacts = makeArtifacts('video_prompts');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'video_prompts',
      stageContext: makeVideoPromptsMultiPackContext(),
    });

    expect(generateText.mock.calls[0]?.[2]).toContain('## Locked Multi-Pack Structure');
    expect(generateText.mock.calls[0]?.[2]).toContain('第01包、第02包、第03包');
    expect(generateText.mock.calls[0]?.[2]).toContain('本轮必须在 `video_prompt_pack_cn` 中按相同顺序输出 3 个正式视频包');
    expect(generateText.mock.calls[0]?.[2]).toContain('Pack 1 覆盖 Shot 01-06。');
    expect(generateText.mock.calls[0]?.[2]).toContain('Pack 2 覆盖 Shot 07-12。');
    expect(generateText.mock.calls[0]?.[2]).toContain('Pack 3 覆盖 Shot 13-19。');
  });

  it('splits storyboard generation into per-artifact LLM calls and reuses the first-pass pack', async () => {
    const storyboardPack = {
      storyboard_prompt_pack: [
        '# storyboard_prompt_pack',
        '## beat_skeleton',
        '- Beat 1',
        '## storyboard_content_breakdown',
        '- Shot 1-6',
        '## cinematic_language_plan',
        '- camera',
        '## shot_continuity_plan',
        '- continuity',
        '## continuity_control_system',
        '- control',
        '## storyboard_prompt_pack_plan',
        '- total_shots: 19',
        '## design_reconciliation_review',
        '- design_revision_required: false',
      ].join('\n\n'),
    };
    const controlBoard = {
      control_board_prompts: '# control_board_prompts',
    };
    const styleBoard = {
      style_board_prompts: '# style_board_prompts',
    };
    const masterBoard = {
      master_board_prompt: '# master_board_prompt',
    };
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(storyboardPack))
      .mockResolvedValueOnce(JSON.stringify(controlBoard))
      .mockResolvedValueOnce(JSON.stringify(styleBoard))
      .mockResolvedValueOnce(JSON.stringify(masterBoard));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    const result = await runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
    });

    expect(generateText).toHaveBeenCalledTimes(4);
    expect(generateText.mock.calls[0]?.[2]).toContain('Required top-level keys: storyboard_prompt_pack');
    expect(generateText.mock.calls[1]?.[2]).toContain(
      'Required top-level keys: control_board_prompts',
    );
    expect(generateText.mock.calls[1]?.[2]).toContain('# Locked Storyboard Summary');
    expect(generateText.mock.calls[1]?.[2]).toContain('## storyboard_prompt_pack_plan');
    expect(generateText.mock.calls[1]?.[2]).not.toContain('"requiredInputs"');
    expect(generateText.mock.calls[2]?.[2]).toContain('Required top-level keys: style_board_prompts');
    expect(generateText.mock.calls[2]?.[2]).toContain('# Locked Storyboard Summary');
    expect(generateText.mock.calls[3]?.[2]).toContain('Required top-level keys: master_board_prompt');
    expect(generateText.mock.calls[3]?.[2]).toContain('# Locked Storyboard Summary');
    expect(result.artifacts).toEqual({
      ...storyboardPack,
      control_board_prompts:
        '## Control-Oriented Storyboard Board\n\n# control_board_prompts',
      style_board_prompts:
        '## Style & Rendering Storyboard Board\n\n# style_board_prompts',
      ...masterBoard,
    });
  });

  it('extracts numbered storyboard sections into the locked summary for follow-up calls', async () => {
    const storyboardPack = {
      storyboard_prompt_pack: [
        '# 标题',
        '## 2. beat_skeleton',
        '- Beat 1',
        '## 3. storyboard_content_breakdown',
        '- Shot 1-6',
        '## 4. cinematic_language_plan',
        '- camera',
        '## 6. shot_continuity_plan',
        '- continuity',
        '## 7. continuity_control_system',
        '- control',
        '## 8. storyboard_prompt_pack_plan',
        '- total_shots: 19',
        '## 10. design_reconciliation_review',
        '- design_revision_required: false',
      ].join('\n\n'),
    };
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(storyboardPack))
      .mockResolvedValueOnce(JSON.stringify({ control_board_prompts: '# control' }))
      .mockResolvedValueOnce(JSON.stringify({ style_board_prompts: '# style' }))
      .mockResolvedValueOnce(JSON.stringify({ master_board_prompt: '# master' }));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
    });

    expect(generateText.mock.calls[1]?.[2]).toContain('## beat_skeleton');
    expect(generateText.mock.calls[1]?.[2]).toContain('## storyboard_prompt_pack_plan');
    expect(generateText.mock.calls[1]?.[2]).not.toContain('未能从 `storyboard_prompt_pack` 中提取标准 section');
  });

  it('falls back to the full storyboard pack when no structured sections can be extracted', async () => {
    const storyboardPack = {
      storyboard_prompt_pack: '# storyboard_prompt_pack\n\n只有一段自由文本，没有标准 section。',
    };
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(storyboardPack))
      .mockResolvedValueOnce(JSON.stringify({ control_board_prompts: '# control' }))
      .mockResolvedValueOnce(JSON.stringify({ style_board_prompts: '# style' }))
      .mockResolvedValueOnce(JSON.stringify({ master_board_prompt: '# master' }));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
    });

    expect(generateText.mock.calls[1]?.[2]).toContain('未能从 `storyboard_prompt_pack` 中提取标准 section');
    expect(generateText.mock.calls[1]?.[2]).toContain(storyboardPack.storyboard_prompt_pack);
  });

  it('passes reference priority metadata into the serialized stage context', async () => {
    const artifacts = makeArtifacts('script');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'script',
      stageContext: {
        ...makeContext('script'),
        referencePriority: {
          rule: '后阶段优先于前阶段。',
          currentInputsHighestFirst: [
            {
              artifactId: 'design.design_prompts',
              stage: 'design',
              order: 6,
              note: 'design 优先于 story。',
            },
          ],
        },
        requiredInputs: [
          {
            stage: 'design',
            artifactId: 'design.design_prompts',
            path: 'artifacts/design/design_prompts.md',
            title: '设定图提示词',
            content: '# 设定图提示词',
            priorityOrder: 6,
            priorityNote: 'design 优先于 story。',
          },
        ],
      },
    });

    expect(generateText.mock.calls[0]?.[2]).toContain('"referencePriority"');
    expect(generateText.mock.calls[0]?.[2]).toContain('后阶段优先于前阶段');
    expect(generateText.mock.calls[0]?.[2]).toContain('"priorityOrder": 6');
  });

  it('appends current draft artifacts and one-time refinement prompt when refining', async () => {
    const artifacts = makeArtifacts('design');
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(artifacts));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await runner.run({
      ...baseInput,
      stage: 'design',
      stageContext: makeContext('design'),
      currentDraftArtifacts: {
        design_prompts: '# 初稿\n\n现有结构。',
      },
      refinementPrompt: '保留结构，但加强镜头语言与结尾爆点。',
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.stringContaining('One-Time Refinement Request'),
    );
    expect(generateText.mock.calls[0]?.[2]).toContain('Current Draft Artifacts');
    expect(generateText.mock.calls[0]?.[2]).toContain('保留结构，但加强镜头语言与结尾爆点。');
    expect(generateText.mock.calls[0]?.[2]).toContain('design_prompts');
  });

  it('blocks generation when prompt tokens exceed the 80k gate', async () => {
    const generateText = vi.fn().mockResolvedValue(JSON.stringify(makeArtifacts('design')));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design',
        stageContext: makeContext('design'),
        refinementPrompt: '镜头强化 '.repeat(90_000),
        currentDraftArtifacts: {
          design_prompts: '# 初稿',
        },
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_PROMPT_TOO_LARGE',
    });

    expect(generateText).not.toHaveBeenCalled();
  });

  it.each([
    ['missing key', { design_prompts: '# Design' }],
    ['blank key', { ...makeArtifacts('design'), character_prompts: '   ' }],
  ])('rejects a design response with a %s', async (_label, artifacts) => {
    const runner = createRunner(JSON.stringify(artifacts));

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design',
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_MISSING_ARTIFACTS',
    });
  });

  it('rejects invalid JSON with a parse error', async () => {
    const runner = createRunner('not-json');

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design',
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_PARSE_FAILED',
    });
  });

  it('fails before generation when settings are missing', async () => {
    const runner = createRunner(JSON.stringify(makeArtifacts('design')), async () => null);

    await expect(
      runner.run({
        ...baseInput,
        stage: 'design' as SceneStageId,
        stageContext: makeContext('design'),
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_NO_SETTINGS',
    });
  });

  it('rejects a stage that does not support direct_llm in the capability table', async () => {
    const runner = createRunner(JSON.stringify({ topic_brief: '# Topic' }));

    await expect(
      runner.run({
        ...baseInput,
        stage: 'source_intake',
        stageContext: {
          stage: 'source_intake',
          requiredInputs: [],
          optionalInputs: [],
          outputContract: { requiredArtifacts: ['topic_brief'] },
          forbiddenActions: [],
          warnings: [],
          handoffRefs: [],
        },
      }),
    ).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE',
    });
  });

  it('reports storyboard multi-phase progress in order', async () => {
    const artifacts = makeArtifacts('storyboard');
    const generateText = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ storyboard_prompt_pack: artifacts.storyboard_prompt_pack }))
      .mockResolvedValueOnce(JSON.stringify({ control_board_prompts: artifacts.control_board_prompts }))
      .mockResolvedValueOnce(JSON.stringify({ style_board_prompts: artifacts.style_board_prompts }))
      .mockResolvedValueOnce(JSON.stringify({ master_board_prompt: artifacts.master_board_prompt }));
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText,
    });
    const onProgress = vi.fn();

    await runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
      onProgress,
    });

    expect(onProgress.mock.calls.map((call) => call[0])).toEqual([
      expect.objectContaining({ phaseKey: 'phase-1-storyboard-pack', current: 1, total: 4 }),
      expect.objectContaining({ phaseKey: 'phase-2-control-board', current: 2, total: 4 }),
      expect.objectContaining({ phaseKey: 'phase-3-style-board', current: 3, total: 4 }),
      expect.objectContaining({ phaseKey: 'phase-4-master-board', current: 4, total: 4 }),
    ]);
  });

  it('fails the direct_llm storyboard phase when provider stalls beyond timeout', async () => {
    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS_REF,
      generateText: vi.fn().mockReturnValue(new Promise<string>(() => undefined)),
      phaseTimeoutMs: 20,
    });

    await expect(runner.run({
      ...baseInput,
      stage: 'storyboard',
      stageContext: makeContext('storyboard'),
    })).rejects.toMatchObject<Partial<SceneDirectLlmRunnerError>>({
      code: 'SCENE_DIRECT_LLM_PHASE_TIMEOUT',
    });
  }, 15_000);
});
