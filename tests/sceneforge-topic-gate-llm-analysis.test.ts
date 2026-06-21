import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';
import { listSceneArtifacts, readSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { buildTopicAnalysisMarkdown } from '../src/sceneforge/lib/scene-hitl-markdown';
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
