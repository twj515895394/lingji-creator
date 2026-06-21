import { describe, expect, it } from 'vitest';
import {
  getContinueRunCapability,
  getStageSupportedRunners,
} from '../src/sceneforge/lib/scene-continue-run';
import { getNextPipelineStage } from '../src/sceneforge/lib/scene-stage-nav';

describe('SceneForge Continue & Run capability', () => {
  it.each([
    {
      label: 'supported next stage',
      input: {
        currentStage: 'performance' as const,
        canContinue: true,
        nextStage: 'storyboard' as const,
        supportedRunners: ['direct_llm'] as const,
        runnerType: 'direct_llm' as const,
      },
      expected: { canRun: true },
    },
    {
      label: 'current stage cannot continue',
      input: {
        currentStage: 'performance' as const,
        canContinue: false,
        nextStage: 'storyboard' as const,
        supportedRunners: ['direct_llm'] as const,
        runnerType: 'direct_llm' as const,
      },
      expected: { canRun: false, reason: '当前阶段尚不能 Continue' },
    },
    {
      label: 'no next stage',
      input: {
        currentStage: 'publish' as const,
        canContinue: true,
        nextStage: null,
        supportedRunners: [] as const,
        runnerType: 'direct_llm' as const,
      },
      expected: { canRun: false, reason: '没有下一阶段' },
    },
    {
      label: 'runner unsupported',
      input: {
        currentStage: 'design' as const,
        canContinue: true,
        nextStage: 'script' as const,
        supportedRunners: ['manual_submit'] as const,
        runnerType: 'direct_llm' as const,
      },
      expected: { canRun: false, reason: '下一阶段不支持 Direct LLM' },
    },
  ])('$label', ({ input, expected }) => {
    expect(getContinueRunCapability(input)).toMatchObject({
      nextStage: input.nextStage,
      supportedRunners: [...input.supportedRunners],
      ...expected,
    });
  });

  it('reports Direct LLM for explicitly enabled core and support stages', () => {
    expect(getStageSupportedRunners('reference')).toContain('direct_llm');
    expect(getStageSupportedRunners('story')).toContain('direct_llm');
    expect(getStageSupportedRunners('design')).toContain('direct_llm');
    expect(getStageSupportedRunners('storyboard')).toContain('direct_llm');
    expect(getStageSupportedRunners('audio')).toContain('direct_llm');
    expect(getStageSupportedRunners('video_prompts')).toContain('direct_llm');
    expect(getStageSupportedRunners('publish')).toContain('direct_llm');
    expect(getStageSupportedRunners('script')).toContain('direct_llm');
    expect(getStageSupportedRunners(null)).toEqual([]);
  });

  it.each([
    ['source_intake', 'topic_gate', false],
    ['topic_gate', 'reference', true],
    ['reference', 'story', true],
    ['story', 'assets', true],
    ['assets', 'design', true],
    ['design', 'script', true],
    ['script', 'performance', true],
    ['performance', 'storyboard', true],
    ['storyboard', 'audio', true],
    ['audio', 'video_prompts', true],
    ['video_prompts', 'publish', true],
    ['publish', null, false],
  ] as const)(
    'covers the %s stage boundary',
    (currentStage, expectedNextStage, expectedCanRun) => {
      const nextStage = getNextPipelineStage(currentStage);
      const capability = getContinueRunCapability({
        currentStage,
        canContinue: true,
        nextStage,
        supportedRunners: getStageSupportedRunners(nextStage),
        runnerType: 'direct_llm',
      });

      expect(capability.nextStage).toBe(expectedNextStage);
      expect(capability.canRun).toBe(expectedCanRun);
    },
  );
});
