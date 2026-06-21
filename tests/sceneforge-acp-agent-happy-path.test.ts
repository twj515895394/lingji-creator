import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { createAcpAgentStageRunner } from '../electron/sceneforge/runners/scene-acp-agent-runner';
import { SceneForgeService } from '../electron/sceneforge/service';
import { stageSupportsRunner } from '../src/sceneforge/lib/scene-stage-run-capabilities';

let projectDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-acp-'));
  await createSceneForgeProject(projectDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge acp_agent minimal path', () => {
  it('performance stage declares acp_agent in capability table', () => {
    expect(stageSupportsRunner('performance', 'acp_agent')).toBe(true);
    expect(stageSupportsRunner('script', 'acp_agent')).toBe(true);
  });

  it('returns performance draft without submitting', async () => {
    const runner = createAcpAgentStageRunner({
      isAgentConfigured: async () => true,
      runAgentTurn: vi.fn().mockResolvedValue(
        JSON.stringify({
          performance_direction: '# 表演指导\n\n情绪由压抑到释放；走位靠窗；动作放慢。',
        }),
      ),
    });

    const stageContext = await service.getStageContext(projectDir, 'performance', {
      runner: 'acp_agent',
    });
    const submitStageDraft = vi.fn();

    const result = await runner.run({
      projectDir,
      stage: 'performance',
      stageContext,
      submitStageDraft,
    });

    expect(result.runnerType).toBe('acp_agent');
    expect(result.artifacts.performance_direction).toContain('表演指导');
    expect(submitStageDraft).not.toHaveBeenCalled();
    expect((await service.getProjectState(projectDir)).artifacts).toEqual([]);
  });

  it('explicit submit after acp draft passes semantic validation', async () => {
    const runner = createAcpAgentStageRunner({
      isAgentConfigured: async () => true,
      runAgentTurn: vi.fn().mockResolvedValue(
        JSON.stringify({
          performance_direction: `## character_performance_profiles
- character_id: C01
  character_name: 老奶奶
  eye_focus_pattern: 先不看人，关键句前再抬眼锁住对手
  body_weight: 重心前压，肩膀稳定
  hand_action_pattern: 手贴电子秤边缘，再慢慢前压
- character_id: C02
  character_name: 对手
  eye_focus_pattern: 先硬顶，失势后开始闪躲
  body_weight: 站位逐渐后撤
  hand_action_pattern: 想解释时先碰乱零钱夹

## beat_performance_notes
- beat_id: B01
  emotional_goal: 平静里先压出威慑
  eye_action: 先不抬眼，开口前再锁定对手
  body_action: 手压电子秤边缘，肩膀不动
  pause_or_hold: 开口前停半拍
- beat_id: B02
  emotional_goal: 让对手先乱，再完成反压
  eye_action: 主角直视，对手开始闪躲
  body_action: 主角逼近半步，对手后退并碰开零钱夹
  reaction_timing: 零钱夹松动后给对手一个短停顿

## action_continuity_chains
- chain_01：抬眼 -> 压手 -> 逼近半步，handoff 到对手后退与零钱夹失手。

## emotion_continuity_chains
- chain_emo_01：平静 -> 审视 -> 紧张升级 -> 压场释放。

## continuity_rules
- 保持老奶奶左侧主动位、对手右侧退缩位、零钱夹手部连续性。
- 主角全程不能演成怒吼，只能靠控制力施压。

## storyboard_handoff
- 需要中近景捕捉眼神、手部和迟疑 reaction。
- 保持左压右退的 blocking，并交代电子秤与零钱夹状态变化。

## risk_notes
- 不要把压场演成怒吼。

## next_action
进入 storyboard 阶段分配反应镜头与停顿时值。`,
        }),
      ),
    });

    const stageContext = await service.getStageContext(projectDir, 'performance', {
      runner: 'acp_agent',
    });
    const runResult = await runner.run({
      projectDir,
      stage: 'performance',
      stageContext,
      submitStageDraft: vi.fn(),
    });

    const submitted = await service.submitStageDraft({
      projectDir,
      stage: 'performance',
      artifacts: [
        {
          artifactKey: 'performance_direction',
          content: runResult.artifacts.performance_direction,
        },
      ],
    });

    expect(submitted.validation.status).toBe('passed');
    expect(submitted.artifactIds).toContain('performance.performance_direction');
  });
});
