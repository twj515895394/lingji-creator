import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';
import { listSceneArtifacts, readSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import {
  buildTopicAnalysisMarkdown,
  buildTopicIntentCheckMarkdown,
} from '../src/sceneforge/lib/scene-hitl-markdown';
import { buildTopicBriefMarkdown } from '../src/sceneforge/lib/topic-gate-form';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-topic-gate-analysis-'));
  await createSceneForgeProject(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge topic gate llm analysis', () => {
  it('requires a saved topic brief before intent check', async () => {
    const service = new SceneForgeService({
      checkTopicIntent: vi.fn(),
    });

    await expect(service.checkTopicIntent({ projectDir: tmpDir })).rejects.toThrow(
      '请先填写选题描述，再确认选题描述。',
    );
  });

  it('writes intent_check artifact after checker succeeds', async () => {
    const service = new SceneForgeService({
      checkTopicIntent: vi.fn().mockResolvedValue({
        artifactKey: 'intent_check',
        content: buildTopicIntentCheckMarkdown({
          status: 'pass',
          summary: '当前创作意图已经足够明确，可以进入选题分析。',
          intentHash: 'deadbeef',
          missingDimensions: [],
          suggestions: [],
        }),
      }),
    });

    const result = await service.checkTopicIntent({
      projectDir: tmpDir,
      topicBriefMarkdown: buildTopicBriefMarkdown({
        intent: '桥段重构',
        totalDurationSec: 20,
        segmentDurationSec: 10,
      }),
    });

    expect(result.artifactKey).toBe('intent_check');
    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts.some((artifact) => artifact.id === 'topic_gate.intent_check')).toBe(true);
    const persisted = await readSceneArtifact(tmpDir, 'topic_gate.intent_check');
    expect(persisted.content).toContain('status: pass');
    expect(persisted.content).toContain('summary: 当前创作意图已经足够明确，可以进入选题分析。');
  });

  it('requires a saved topic brief before analysis', async () => {
    const service = new SceneForgeService({
      analyzeTopicGate: vi.fn(),
    });

    await expect(service.analyzeTopicGate({ projectDir: tmpDir })).rejects.toThrow(
      '请先保存选题简报，再分析选题。',
    );
  });

  it('writes topic_analysis artifact after analysis succeeds', async () => {
    const service = new SceneForgeService({
      analyzeTopicGate: vi.fn().mockResolvedValue({
        artifactKey: 'topic_analysis',
        content: buildTopicAnalysisMarkdown({
          summary: '热点明确，建议继续推进。',
          totalScore: '84',
          decisionSuggestion: 'go',
          productionLevelSuggestion: 'focus',
          scores: [
            { label: '传播潜力', value: '84/100' },
            { label: '制作可行性', value: '高' },
          ],
          styleCandidates: [{ id: 'pixar_like', label: '动画·皮克斯感', family: 'animation' }],
        }),
      }),
    });

    await service.submitStageDraft({
      projectDir: tmpDir,
      stage: 'topic_gate',
      artifacts: [
        {
          artifactKey: 'topic_brief',
          content: buildTopicBriefMarkdown({
            intent: '桥段重构',
            totalDurationSec: 20,
            segmentDurationSec: 10,
          }),
        },
      ],
    });

    const result = await service.analyzeTopicGate({ projectDir: tmpDir });

    expect(result.artifactKey).toBe('topic_analysis');
    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts.some((artifact) => artifact.id === 'topic_gate.topic_analysis')).toBe(true);
    const persisted = await readSceneArtifact(tmpDir, 'topic_gate.topic_analysis');
    expect(persisted.content).toContain('summary: 热点明确，建议继续推进。');
    expect(persisted.content).toContain('decision_suggestion: go');
  });
});
