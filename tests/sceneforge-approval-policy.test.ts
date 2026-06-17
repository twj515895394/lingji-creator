import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import {
  SceneApprovalPolicyError,
  readApprovalPolicyFile,
  resolveSceneApprovalPolicy,
  setSceneApprovalPolicy,
  writeDefaultApprovalPolicy,
} from '../electron/sceneforge/pipeline/scene-approval-policy';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-policy-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge approval policy', () => {
  it('uses stage defaults when no project override exists', async () => {
    await writeDefaultApprovalPolicy(tmpDir);

    expect(await resolveSceneApprovalPolicy(tmpDir, 'design')).toBe('required');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'storyboard')).toBe('required');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'video_prompts')).toBe('required');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'performance')).toBe('auto_if_valid');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'audio')).toBe('auto_if_valid');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'script')).toBe('optional');
  });

  it('prefers project overrides over stage defaults', async () => {
    await writeDefaultApprovalPolicy(tmpDir);

    await setSceneApprovalPolicy(tmpDir, 'design', 'optional');
    await setSceneApprovalPolicy(tmpDir, 'performance', 'required');

    expect(await resolveSceneApprovalPolicy(tmpDir, 'design')).toBe('optional');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'performance')).toBe('required');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'storyboard')).toBe('required');

    const file = await readApprovalPolicyFile(tmpDir);
    expect(file.overrides).toMatchObject({
      design: 'optional',
      performance: 'required',
    });
  });

  it('rejects invalid stage and policy updates without changing the policy file', async () => {
    await writeDefaultApprovalPolicy(tmpDir);

    await expect(
      setSceneApprovalPolicy(tmpDir, 'not_a_stage' as never, 'required'),
    ).rejects.toMatchObject({ code: 'INVALID_STAGE' });
    await expect(
      setSceneApprovalPolicy(tmpDir, 'design', 'sometimes' as never),
    ).rejects.toMatchObject({ code: 'INVALID_POLICY' });

    expect(await resolveSceneApprovalPolicy(tmpDir, 'design')).toBe('required');
    expect((await readApprovalPolicyFile(tmpDir)).overrides).toEqual({});
  });

  it('throws a structured error when the project policy YAML is invalid', async () => {
    await fs.mkdir(path.join(tmpDir, 'sceneforge'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'sceneforge', 'approval_policy.yaml'),
      'version: 1\noverrides:\n  design: [broken\n',
      'utf-8',
    );

    await expect(resolveSceneApprovalPolicy(tmpDir, 'design')).rejects.toBeInstanceOf(
      SceneApprovalPolicyError,
    );
    await expect(resolveSceneApprovalPolicy(tmpDir, 'design')).rejects.toMatchObject({
      code: 'INVALID_POLICY_FILE',
    });
  });

  it('creates SceneForge projects with a resolvable default approval policy file', async () => {
    await createSceneForgeProject(tmpDir);

    expect(await resolveSceneApprovalPolicy(tmpDir, 'design')).toBe('required');
    expect(await resolveSceneApprovalPolicy(tmpDir, 'performance')).toBe('auto_if_valid');
  });
});
