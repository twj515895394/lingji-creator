import { describe, expect, it } from 'vitest';
import { getStageReadiness, getWorkspaceTemplateForStage } from '../src/sceneforge/lib/scene-stage-capabilities';
import {
  isMarkdownSupportSubmitStage,
  PREP_SUPPORT_SUBMIT_STAGES,
  PRODUCTION_SUPPORT_SUBMIT_STAGES,
} from '../src/sceneforge/lib/scene-prep-support-stages';

describe('scene workspace routing', () => {
  it('maps prep support stages to support template and studio readiness', () => {
    for (const stage of PREP_SUPPORT_SUBMIT_STAGES) {
      expect(getWorkspaceTemplateForStage(stage)).toBe('support');
      expect(getStageReadiness(stage)).toBe('studio');
    }
  });
  it('maps production support stages to studio readiness', () => {
    for (const stage of PRODUCTION_SUPPORT_SUBMIT_STAGES) {
      expect(getStageReadiness(stage)).toBe('studio');
      expect(getWorkspaceTemplateForStage(stage)).toBe('support');
    }
  });

  it('maps other support stages to support template', () => {
    expect(getWorkspaceTemplateForStage('script')).toBe('support');
    expect(getWorkspaceTemplateForStage('reference')).toBe('support');
  });

  it('maps export to export template', () => {
    expect(getWorkspaceTemplateForStage('export')).toBe('export');
  });

  it('maps intake and gate to dedicated templates', () => {
    expect(getWorkspaceTemplateForStage('source_intake')).toBe('intake');
    expect(getWorkspaceTemplateForStage('topic_gate')).toBe('gate');
  });

  it('only treats the six markdown support stages as submit-capable', () => {
    const submitStages = [
      'reference',
      'story',
      'assets',
      'script',
      'performance',
      'audio',
    ] as const;
    const nonSubmitStages = [
      'source_intake',
      'topic_gate',
      'design',
      'storyboard',
      'video_prompts',
      'publish',
      'export',
    ] as const;

    for (const stage of submitStages) {
      expect(isMarkdownSupportSubmitStage(stage)).toBe(true);
    }
    for (const stage of nonSubmitStages) {
      expect(isMarkdownSupportSubmitStage(stage)).toBe(false);
    }
  });
});
