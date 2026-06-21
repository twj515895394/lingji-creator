import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadSceneContextPolicy } from '../electron/sceneforge/pipeline/scene-context-policy';
import { loadSceneStagePack } from '../electron/sceneforge/pipeline/scene-stage-pack';

const P0_STAGES = [
  'design',
  'storyboard',
  'video_prompts',
  'performance',
  'audio',
  'reference',
  'story',
  'assets',
  'script',
] as const;

describe('SceneForge stage pack (P0)', () => {
  it.each(P0_STAGES)('loads stage pack for %s without reading .agents/skills', async (stage) => {
    const pack = await loadSceneStagePack(stage);

    expect(pack.stage).toBe(stage);
    expect(pack.sourceDir).toContain(`prompts/sceneforge/stages/${stage}`);
    expect(pack.sourceDir).not.toContain('.agents/skills');
    expect(pack.systemPrompt.length).toBeGreaterThan(0);
    expect(pack.outputContract.requiredArtifacts.length).toBeGreaterThan(0);
    expect(pack.reviewChecklist.length).toBeGreaterThan(0);
  });

  it('storyboard pack matches core output contract keys', async () => {
    const pack = await loadSceneStagePack('storyboard');
    expect(pack.outputContract.requiredArtifacts).toEqual([
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ]);
  });

  it('video_prompts context policy includes audio and performance consumer inputs', async () => {
    const policy = await loadSceneContextPolicy('video_prompts');
    const ids = policy.inputs.map((i) => i.id);
    expect(ids).toContain('audio_plan');
    expect(ids).toContain('performance_sheet');
  });

  it('audio pack and context policy match its stage contract', async () => {
    const pack = await loadSceneStagePack('audio');
    const policy = await loadSceneContextPolicy('audio');
    const ids = policy.inputs.map((input) => input.id);

    expect(pack.outputContract.requiredArtifacts).toEqual(['audio_design']);
    expect(pack.systemPrompt).toContain('正式主交付必须中文主导');
    expect(pack.userPrompt).toContain('不要输出整篇英文 audio plan');
    expect(ids).toContain('storyboard_pack');
    expect(ids).toContain('performance_sheet');
    expect(ids).toContain('script_draft');
    expect(ids).toContain('design_prompts');
  });

  it('reference context policy only reads topic gate and optional source material', async () => {
    const policy = await loadSceneContextPolicy('reference');
    const inputs = [...policy.inputs, ...(policy.optionalInputs ?? [])];

    expect(policy.inputs.map((input) => input.id)).toEqual(['topic_brief']);
    expect(policy.optionalInputs?.map((input) => input.id)).toEqual([
      'gate_confirmations',
      'source_material',
    ]);
    expect(new Set(inputs.map((input) => input.fromStage))).toEqual(
      new Set(['topic_gate', 'source_intake']),
    );
  });

  it('reference pack includes the standard eight files and migration notes', async () => {
    const packDir = path.join(process.cwd(), 'prompts', 'sceneforge', 'stages', 'reference');
    const files = await fs.readdir(packDir);
    const migration = await fs.readFile(path.join(packDir, 'MIGRATION.md'), 'utf8');

    expect(files).toEqual(expect.arrayContaining([
      'system.md',
      'user.md',
      'agent-instructions.md',
      'output-contract.yaml',
      'review-checklist.md',
      'context-policy.yaml',
      'handoff-template.yaml',
      'MIGRATION.md',
    ]));
    expect(migration).toContain('scene-reference-decider');
    expect(migration).toContain('reference_notes');
  });

  it('design pack preserves character bible and downstream continuity constraints from old skill migration', async () => {
    const pack = await loadSceneStagePack('design');

    expect(pack.systemPrompt).toContain('角色说明书板');
    expect(pack.systemPrompt).toContain('master_reference_prompt');
    expect(pack.userPrompt).toContain('中文主导的「角色说明书板」');
  });

  it('story policy consumes reference and adaptation selection through selected assets', async () => {
    const policy = await loadSceneContextPolicy('story');
    const optionalIds = policy.optionalInputs?.map((input) => input.id);

    expect(policy.inputs.map((input) => input.id)).toEqual(['reference_notes']);
    expect(optionalIds).toContain('adaptation_selection');
    expect(policy.assetLibrary?.allowStyleProfile).toBe(false);
    expect(policy.assetLibrary?.allowedAssetIds).toEqual(['adaptation.idea_seed']);
  });

  it('assets pack includes the standard eight files and migration notes', async () => {
    const packDir = path.join(process.cwd(), 'prompts', 'sceneforge', 'stages', 'assets');
    const files = await fs.readdir(packDir);
    const migration = await fs.readFile(path.join(packDir, 'MIGRATION.md'), 'utf8');

    expect(files).toEqual(expect.arrayContaining([
      'system.md',
      'user.md',
      'agent-instructions.md',
      'output-contract.yaml',
      'review-checklist.md',
      'context-policy.yaml',
      'handoff-template.yaml',
      'MIGRATION.md',
    ]));
    expect(migration).toContain('scene-asset-checker');
    expect(migration).toContain('asset_plan');
  });

  it('assets policy consumes story handoff, optional reference summary, and selected style', async () => {
    const pack = await loadSceneStagePack('assets');
    const policy = await loadSceneContextPolicy('assets');

    expect(pack.outputContract.requiredArtifacts).toEqual(['asset_plan']);
    expect(policy.inputs.map((input) => input.id)).toEqual(['story_direction']);
    expect(policy.inputs[0]?.delivery).toBe('handoff_first');
    expect(policy.optionalInputs?.map((input) => input.id)).toEqual(['reference_notes']);
    expect(policy.assetLibrary).toBeUndefined();
  });

  it('parses legacy allowSelectedStyleProfile as allowStyleProfile for backward compatibility', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-policy-compat-'));
    const stageDir = path.join(tmpDir, 'prompts', 'sceneforge', 'stages', 'story');
    await fs.mkdir(stageDir, { recursive: true });
    await fs.writeFile(
      path.join(stageDir, 'context-policy.yaml'),
      [
        'version: 1',
        'stage: story',
        'inputs:',
        '  - id: reference_notes',
        '    fromStage: reference',
        '    artifactKey: reference_notes',
        '    delivery: summary',
        'assetLibrary:',
        '  allowSelectedStyleProfile: true',
      ].join('\n'),
      'utf8',
    );

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    try {
      const policy = await loadSceneContextPolicy('story');
      expect(policy.assetLibrary?.allowSelectedStyleProfile).toBe(true);
      expect(policy.assetLibrary?.allowStyleProfile).toBe(true);
    } finally {
      cwdSpy.mockRestore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('script pack matches script_draft contract and consumes story and design inputs', async () => {
    const pack = await loadSceneStagePack('script');
    const policy = await loadSceneContextPolicy('script');

    expect(pack.outputContract.requiredArtifacts).toEqual(['script_draft']);
    expect(policy.inputs.map((input) => input.id)).toEqual([
      'story_direction',
      'design_prompts',
      'design_master',
    ]);
    expect(policy.consumerRunners).toContain('direct_llm');
  });

  it('storyboard pack preserves beat skeleton and continuity-oriented board rules from old skill migration', async () => {
    const pack = await loadSceneStagePack('storyboard');
    const policy = await loadSceneContextPolicy('storyboard');

    expect(pack.systemPrompt).toContain('Beat skeleton');
    expect(pack.systemPrompt).toContain('control_board_prompts');
    expect(pack.systemPrompt).toContain('每个可直接投喂外部出板模型的正式 Pack 包进显式标签');
    expect(pack.userPrompt).toContain('`beat_skeleton`');
    expect(pack.userPrompt).toContain('不能共享一个总说明块');
    expect(pack.userPrompt).toContain('Panel Layout');
    expect(pack.reviewChecklist).toContain('Control board 要优先保证动作可读性、镜头路径与 blocking 清晰。');
    expect(
      pack.reviewChecklist.some((line) => line.includes('不得只写一个总 Prompt')),
    ).toBe(true);
    expect(policy.inputs.map((input) => input.id)).toContain('design_prompts');
    expect(policy.inputs.map((input) => input.id)).toContain('design_scenes');
  });

  it('video prompts pack preserves four-layer pack structure and sound inheritance rules', async () => {
    const pack = await loadSceneStagePack('video_prompts');

    expect(pack.systemPrompt).toContain('Always preserve these four layers inside the pack');
    expect(pack.systemPrompt).toContain('BGM, Foley-SFX, Ambience, and Silence');
    expect(pack.systemPrompt).toContain('video_prompt_pack_plan');
    expect(pack.systemPrompt).toContain('`video_prompt_trace`');
    expect(pack.systemPrompt).toContain('Segment X 技术控制说明');
    expect(pack.systemPrompt).toContain('Segment X 导演长版提示词');
    expect(pack.systemPrompt).toContain('故事板关键帧参考规则');
    expect(pack.systemPrompt).toContain('不要把 optional 输入中的标题级摘要');
    expect(pack.userPrompt).toContain('默认主交付返回 `video_prompt_pack_cn`、`video_prompt_review` 与 `video_prompt_trace`');
    expect(pack.userPrompt).toContain('中文必须承担主体结构');
    expect(pack.userPrompt).toContain('控制故事板 Pack XX');
    expect(pack.userPrompt).toContain('风格故事板 Pack XX');
    expect(pack.userPrompt).toContain('不要再保留 `prompt_trace`');
    expect(
      pack.reviewChecklist.some((line) =>
        line.includes('正式主交付默认为 `video_prompt_pack_cn`'),
      ),
    ).toBe(true);
  });

  it('performance and audio packs expose handoff template paths when present', async () => {
    const performance = await loadSceneStagePack('performance');
    const audio = await loadSceneStagePack('audio');
    expect(performance.auxiliaryPaths.handoffTemplatePath).toContain('performance/handoff-template.yaml');
    expect(audio.auxiliaryPaths.handoffTemplatePath).toContain('audio/handoff-template.yaml');
  });

  it('performance policy consumes script plus design prompt anchors', async () => {
    const policy = await loadSceneContextPolicy('performance');

    expect(policy.inputs.map((input) => input.id)).toEqual([
      'script_draft',
      'design_character_prompts',
      'design_prompts',
      'design_master',
    ]);
  });

  it('performance and audio review checklists preserve downstream-usable detail', async () => {
    const performance = await loadSceneStagePack('performance');
    const audio = await loadSceneStagePack('audio');

    expect(performance.reviewChecklist).toContain('Major beats contain playable acting detail, not only emotion labels.');
    expect(audio.reviewChecklist).toContain('BGM, Foley-SFX, Ambience, and Silence are all covered when the upstream context supports them.');
    expect(
      audio.reviewChecklist.some((line) => line.includes('voice_identity_lock')),
    ).toBe(true);
  });
});
