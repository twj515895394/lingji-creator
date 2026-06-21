import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { listSceneArtifacts } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { readSceneState } from '../electron/sceneforge/pipeline/scene-state-machine';
import { SceneForgeService, SceneForgeServiceError } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-service-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const completeDesignDraft = {
  design_prompts: `## 视觉语言
市井纪实与轻喜剧压迫感并存。

## 角色设计
角色数量：2。

## 场景设计
街口摊位形成前中后景。

## 道具设计
电子秤、零钱夹、塑料袋为核心道具。

## 空间连续性
固定摊位朝向、角色左右站位和主轴线。

## 道具状态机
电子秤待机到称重，零钱夹闭合到弹开。

## 场面调度
老奶奶左前区，对手右中区。

## 节奏契约
segment_duration_seconds: 10
default_pacing_profile: balanced

## 分段节奏配置
- segment_type: lyrical
  emphasis: 情绪呼吸
- segment_type: balanced
  emphasis: 信息推进
- segment_type: kinetic
  emphasis: 动作冲击

## 镜头密度期望
- 5秒：lyrical 3-5，balanced 4-6，kinetic 5-8
- 6秒：lyrical 4-6，balanced 5-7，kinetic 6-9
- 8秒：lyrical 5-7，balanced 6-8，kinetic 7-10
- 10秒：lyrical 6-8，balanced 6-10，kinetic 7-12
- 15秒：lyrical 8-11，balanced 10-13，kinetic 12-16

## 边界规则
- shots_must_not_cross_segment_boundary: true
- 镜头不得跨段。`,
  character_prompts: `# 角色说明书

## 多视角
正面、3/4、侧面、背面。

## 轮廓剪影
轮廓稳定，街头掌控者姿态明确。

## 表情系统
平静、自信、审视、轻蔑、得意、发火。

## 微表情
挑眉、抿嘴、眼角轻抬。

## 动作姿态
插兜站立、抬手示意、回头审视、快步逼近。

## 关键道具交互
与零钱夹和电子秤关系明确。

## 细节区
面部年龄纹理、布料磨损、鞋面旧痕。

## 比例对照
与摊位和电子秤比例对照。

## 边界约束
中文主导，非海报。`,
  scene_prompts: `# 全场景资产总参考图提示词

## 主场景空间布局
街口摊位位于前景左侧，收银台与电子秤在中景，后侧为货架与过道。

## 角色默认站位
角色数量为 2；老奶奶站在左前区，对手站在右中区。

## 核心道具位置
电子秤位于收银台中央，零钱夹贴近老奶奶手侧。

## 道具状态矩阵
电子秤待机/称重，零钱夹闭合/开启。

## 出入口与运动轴线
顾客从右后方进入，左后方离场。`,
  prop_prompts: '# 道具提示词\n\n关键物件。',
  master_reference_prompt: '# 总参考图提示词\n\n统一构图和风格。',
};

describe('SceneForgeService design flow', () => {
  it('submits, validates and approves design through the service', async () => {
    const submit = await service.submitDesignDraft(tmpDir, completeDesignDraft);

    expect(submit.validation.status).toBe('passed');
    expect(submit.status).toBe('waiting_approval');
    expect(submit.artifactIds).toEqual([
      'design.design_prompts',
      'design.character_prompts',
      'design.scene_prompts',
      'design.prop_prompts',
      'design.master_reference_prompt',
    ]);

    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts).toHaveLength(5);
    expect(artifacts.every((artifact) => artifact.role === 'core_generation_asset')).toBe(true);

    const emptyContext = await service.getStageContext(tmpDir, 'storyboard');
    expect(emptyContext.requiredInputs).toEqual([
      expect.objectContaining({
        policyInputId: 'performance_sheet',
        artifactId: 'performance.performance_direction',
        satisfied: false,
      }),
    ]);

    await service.approveStage(tmpDir, 'design');

    const state = await readSceneState(tmpDir);
    expect(state.stages.design.status).toBe('approved');

    const context = await service.getStageContext(tmpDir, 'storyboard');
    expect(context.requiredInputs.map((input) => input.artifactId)).toEqual([
      'design.design_prompts',
      'design.master_reference_prompt',
      'design.character_prompts',
      'design.scene_prompts',
      'performance.performance_direction',
    ]);
    expect(
      context.requiredInputs.find((i) => i.artifactId === 'design.master_reference_prompt')
        ?.content,
    ).toContain('总参考图');
    expect(
      context.requiredInputs.find((i) => i.artifactId === 'performance.performance_direction')
        ?.satisfied,
    ).toBe(false);
  });

  it('does not approve a design draft that failed validation', async () => {
    const submit = await service.submitDesignDraft(tmpDir, {
      design_prompts: '# 设定图提示词\n\n只有一个产物。',
    });

    expect(submit.validation.status).toBe('failed');
    expect(submit.status).toBe('validation_failed');

    await expect(service.approveStage(tmpDir, 'design')).rejects.toMatchObject({
      code: 'SCENE_STAGE_NOT_VALIDATED',
    });
  });

  it('rejects unknown design artifact keys at the service boundary', async () => {
    await expect(
      service.submitDesignDraft(tmpDir, {
        design_prompts: '# 设定图提示词',
        not_a_design_artifact: '# 非法产物',
      } as never),
    ).rejects.toBeInstanceOf(SceneForgeServiceError);

    await expect(
      service.submitDesignDraft(tmpDir, {
        not_a_design_artifact: '# 非法产物',
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_DESIGN_DRAFT_ARTIFACT' });
  });
});
