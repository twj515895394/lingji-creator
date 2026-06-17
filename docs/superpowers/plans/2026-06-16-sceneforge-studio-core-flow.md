# SceneForge Studio Core Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Lingji Cut 中交付 SceneForge Studio 的第一版核心闭环：创建 SceneForge 项目、配置阶段审批策略、注册/预览核心产物、校验、审批、导出 Prompt Pack，并通过 Electron API 与 MCP 工具暴露给 UI 和 Agent。

**Architecture:** 新增 `electron/sceneforge/` 与 `src/sceneforge/` 命名空间，复用现有 `project.json`、`electron/project-file.ts` 写锁、`electron/pipeline/` 任务模型、MCP 工具注册和 `src/store/task-progress.ts`。应用负责状态、产物写入、manifest、validator 和审批；Agent 只通过 MCP 提交草案与修订请求。

**Tech Stack:** Electron 41 main/preload、React 19、TypeScript 6、Zustand、YAML、Vitest、MCP SDK、现有 Lingji UI primitives。

---

## Design Inputs

- PRD：`docs/sceneforge/2026-06-16-sceneforge-studio-prd.md`
- 领域契约：`docs/sceneforge/2026-06-16-sceneforge-domain-contracts.md`
- Electron/MCP 架构：`docs/sceneforge/2026-06-16-sceneforge-electron-mcp-architecture.md`
- UI 设计：`docs/sceneforge/2026-06-16-sceneforge-studio-ui-design.md`
- v9-dev 取舍：`docs/sceneforge/2026-06-16-sceneforge-migration-from-v9-dev.md`

## Scope

第一版实现：

- `SceneForge Prompt Pack Project` 项目类型。
- `SceneForge Studio` 空间与三栏工作台。
- `design / storyboard / video_prompts / export` 核心闭环。
- `approval_policy.yaml` 项目级可配置审批策略。
- Artifact Manifest、Artifact Inspector、Validator、Approval Gate、Prompt Pack Export。
- MCP 工具：读取状态、读取上下文、提交草案、校验、审批、列产物、读产物、导出。
- Stage Runner 抽象：`manual_submit`、`direct_llm`、`acp_agent`。
- Stage Skill Pack：程序加载阶段规则、prompt、输出契约、artifact 模板和 review checklist，再提供给 LLM/Agent。
- Scene Asset Library：迁移风格枚举、style profiles、镜头语言、分镜方法等可复用资产；明确不迁移 `source-materials`。

第一版不实现：

- 不迁移 v9-dev Web Console。
- 不实现 PTY 主路径。
- 不自动迁移旧 v9-dev 项目。
- 不生成真实图片/视频/音频。
- 不做复杂表格化编辑器、storyboard grid、声音时间线。

## Existing Design Note

Lingji Cut 当前已有局部人工确认能力：脚本审稿、批注采纳、危险操作确认、一键流程参数与任务进度。但没有通用的“按阶段配置 approval policy”模型。SceneForge Studio 要把审批策略作为领域契约：默认值来自 pipeline definition，项目可在 `sceneforge/approval_policy.yaml` 覆盖，运行时由 `SceneApprovalPolicyResolver` 统一解析。

## File Structure

### Main Process

| 路径 | 职责 |
| --- | --- |
| `src/types/sceneforge.ts` | SceneForge 共享领域类型与常量 |
| `electron/sceneforge/types.ts` | 主进程侧 re-export 共享类型，避免 renderer/shared 反向依赖 Electron |
| `electron/sceneforge/project/scene-project-file.ts` | 初始化 `project.json` 的 sceneforge 段与目录 |
| `electron/sceneforge/pipeline/scene-stage-definitions.ts` | 阶段定义、核心产物清单、默认审批策略 |
| `electron/sceneforge/pipeline/scene-stage-pack.ts` | 读取 Stage Skill Pack，并生成 runner 所需规则包 |
| `electron/sceneforge/pipeline/scene-stage-runner.ts` | `manual_submit / direct_llm / acp_agent` runner 抽象 |
| `electron/sceneforge/assets/scene-asset-library.ts` | 读取 Scene Asset Library registry 和选中资产 |
| `electron/sceneforge/pipeline/scene-approval-policy.ts` | 读取/写入/解析 `approval_policy.yaml` |
| `electron/sceneforge/pipeline/scene-state-machine.ts` | 阶段状态推进 |
| `electron/sceneforge/artifacts/scene-artifact-store.ts` | 产物写入、读取、manifest 注册 |
| `electron/sceneforge/artifacts/scene-artifact-display-model.ts` | 核心产物 Display Model 与 Copy Blocks 解析 |
| `electron/sceneforge/validators/scene-validator.ts` | Validator 聚合入口 |
| `electron/sceneforge/validators/validators.design.ts` | Design 校验 |
| `electron/sceneforge/validators/validators.storyboard.ts` | Storyboard 校验 |
| `electron/sceneforge/validators/validators.video-prompts.ts` | Video Prompts 校验 |
| `electron/sceneforge/export/scene-prompt-pack-exporter.ts` | 导出 Prompt Pack |
| `electron/sceneforge/service.ts` | `SceneForgeService` 统一门面 |
| `electron/sceneforge/ipc.ts` | Electron IPC 注册 |
| `electron/sceneforge/mcp/register-scene-tools.ts` | MCP 工具注册 |

### Renderer

| 路径 | 职责 |
| --- | --- |
| `src/sceneforge/types.ts` | Renderer 侧 SceneForge 类型 |
| `src/sceneforge/stores/scene-store.ts` | Studio 状态、当前阶段、当前产物 |
| `src/sceneforge/pages/SceneForgeProjectSetup.tsx` | 新建 SceneForge 项目 |
| `src/sceneforge/pages/SceneForgeStudio.tsx` | Studio 页面骨架 |
| `src/sceneforge/components/pipeline/PipelineFlow.tsx` | 左侧阶段流 |
| `src/sceneforge/components/workspace/CurrentStageWorkspace.tsx` | 中间阶段区 |
| `src/sceneforge/components/artifacts/ArtifactInspector.tsx` | 右侧产物查看 |
| `src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx` | 核心产物 Copy Blocks 与复制反馈 |
| `src/sceneforge/components/approval/ApprovalGate.tsx` | 审批与策略控制 |
| `src/sceneforge/components/export/PromptPackExportPanel.tsx` | 导出面板 |

### Existing Files to Modify

| 路径 | 修改 |
| --- | --- |
| `src/lib/project-persistence.ts` | `ProjectData` 新增可选 `type` 与 `sceneforge` |
| `electron/project-file.ts` | 保持兼容读取，允许保存 `sceneforge` section |
| `src/lib/electron-api.ts` | 新增 SceneForge API 类型，`AppPage` 加 `sceneforge-setup` / `sceneforge-studio` |
| `electron/preload.ts` | 暴露 `scene*` API |
| `electron/main.ts` | 注册 SceneForge IPC 和 MCP 工具 |
| `electron/pipeline/types.ts` | 新增 `scene_stage`、`scene_validate`、`scene_export` task kind |
| `electron/pipeline/tools/register.ts` | 注册 SceneForge MCP 工具 |
| `src/App.tsx` | 路由到 setup/studio |
| `src/pages/Setup.tsx` 或欢迎页入口组件 | 新增 SceneForge 项目入口 |

### Tests

| 路径 | 覆盖 |
| --- | --- |
| `tests/sceneforge-types.test.ts` | 类型常量、审批策略枚举 |
| `tests/sceneforge-project-file.test.ts` | 项目初始化和目录结构 |
| `tests/sceneforge-approval-policy.test.ts` | 默认策略 + 项目覆盖 |
| `tests/sceneforge-artifact-store.test.ts` | 写入、读取、manifest 注册 |
| `tests/sceneforge-artifact-display-model.test.ts` | 核心产物 Display Model 与 Copy Blocks |
| `tests/sceneforge-state-machine.test.ts` | `validated != approved` 状态推进 |
| `tests/sceneforge-validator.test.ts` | 三个核心阶段校验 |
| `tests/sceneforge-export.test.ts` | 导出 Prompt Pack |
| `tests/sceneforge-ipc-contract.test.ts` | preload/electron-api/main 三件套源码契约 |
| `tests/sceneforge-mcp-registration.test.ts` | MCP 工具注册 |
| `tests/sceneforge-stage-pack.test.ts` | Stage Skill Pack 加载与 Stage Context 注入 |
| `tests/sceneforge-stage-runner.test.ts` | runner 不能绕过 submit/manifest/validator 路径 |
| `tests/sceneforge-asset-library.test.ts` | 资产 registry、style profile loader、source-materials 排除 |
| `tests/sceneforge-ui.test.tsx` | Studio 基础 UI 渲染 |

---

## Task 1: 领域类型与 ProjectData 扩展

**Files:**
- Create: `src/types/sceneforge.ts`
- Create: `electron/sceneforge/types.ts`
- Modify: `src/lib/project-persistence.ts`
- Test: `tests/sceneforge-types.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-types.test.ts
import { describe, expect, it } from 'vitest';
import {
  SCENE_CORE_STAGES,
  SCENE_APPROVAL_POLICIES,
  isSceneApprovalPolicy,
  type SceneProjectMeta,
} from '../src/types/sceneforge';
import type { ProjectData } from '../src/lib/project-persistence';

describe('sceneforge domain types', () => {
  it('defines core stages and approval policies', () => {
    expect(SCENE_CORE_STAGES).toEqual(['design', 'storyboard', 'video_prompts']);
    expect(SCENE_APPROVAL_POLICIES).toEqual(['required', 'optional', 'auto_if_valid', 'skip']);
    expect(isSceneApprovalPolicy('required')).toBe(true);
    expect(isSceneApprovalPolicy('invalid')).toBe(false);
  });

  it('allows ProjectData to carry optional SceneForge metadata', () => {
    const meta: SceneProjectMeta = {
      version: 1,
      projectRoot: 'sceneforge',
      pipelineId: 'reference_remake',
      currentStage: 'design',
      status: 'in_progress',
      coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
      lastExportPath: null,
    };
    const data = {
      version: 1,
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
      type: 'sceneforge',
      timeline: null,
      aiAnalysis: { analysisResult: null, coverCandidates: [] },
      script: { templateId: 'news-broadcast', annotations: [], reviewState: 'idle', lastReviewedDocVersion: 0 },
      sceneforge: meta,
    } satisfies ProjectData;
    expect(data.sceneforge?.pipelineId).toBe('reference_remake');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-types.test.ts`
Expected: FAIL，找不到 `electron/sceneforge/types` 或 `ProjectData` 不接受 `type/sceneforge`。

- [ ] **Step 3: 实现共享领域类型**

Create `src/types/sceneforge.ts`:

```ts
export const SCENE_CORE_STAGES = ['design', 'storyboard', 'video_prompts'] as const;

export const SCENE_STAGE_IDS = [
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'design',
  'script',
  'performance',
  'storyboard',
  'audio',
  'video_prompts',
  'publish',
  'export',
] as const;

export const SCENE_APPROVAL_POLICIES = ['required', 'optional', 'auto_if_valid', 'skip'] as const;

export type SceneStageId = (typeof SCENE_STAGE_IDS)[number];
export type SceneApprovalPolicy = (typeof SCENE_APPROVAL_POLICIES)[number];

export function isSceneApprovalPolicy(value: unknown): value is SceneApprovalPolicy {
  return typeof value === 'string' && SCENE_APPROVAL_POLICIES.includes(value as SceneApprovalPolicy);
}

export type SceneStageStatus =
  | 'ready'
  | 'in_progress'
  | 'draft_submitted'
  | 'validation_failed'
  | 'validated'
  | 'waiting_approval'
  | 'approved'
  | 'revision_requested'
  | 'completed'
  | 'skipped';

export interface SceneCoreArtifactRefs {
  design: string | null;
  storyboard: string | null;
  videoPrompts: string | null;
}

export interface SceneProjectMeta {
  version: 1;
  projectRoot: 'sceneforge';
  pipelineId: 'reference_remake' | 'original_scene' | 'prompt_pack_only';
  currentStage: SceneStageId | null;
  status: 'ready' | 'in_progress' | 'completed';
  coreArtifacts: SceneCoreArtifactRefs;
  lastExportPath: string | null;
}
```

- [ ] **Step 4: 主进程侧 re-export**

Create `electron/sceneforge/types.ts`:

```ts
export type {
  SceneApprovalPolicy,
  SceneCoreArtifactRefs,
  SceneProjectMeta,
  SceneStageId,
  SceneStageStatus,
} from '../../src/types/sceneforge';

export {
  SCENE_APPROVAL_POLICIES,
  SCENE_CORE_STAGES,
  SCENE_STAGE_IDS,
  isSceneApprovalPolicy,
} from '../../src/types/sceneforge';
```

- [ ] **Step 5: 扩展 ProjectData**

Modify `src/lib/project-persistence.ts`:

```ts
import type { SceneProjectMeta } from '../types/sceneforge';

export interface ProjectData {
  version: 1;
  createdAt: string;
  updatedAt: string;
  type?: 'lingji-video' | 'sceneforge';
  timeline: TimelineData | null;
  aiAnalysis: ProjectAIAnalysis;
  script: ProjectScriptState;
  workflowMeta?: ProjectWorkflowMeta;
  stylePresetId?: string;
  sceneforge?: SceneProjectMeta;
}

export type ProjectSection =
  | 'timeline'
  | 'aiAnalysis'
  | 'script'
  | 'workflowMeta'
  | 'stylePresetId'
  | 'sceneforge';
```

In `createDefaultProjectData`, set `type: 'lingji-video'`.

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-types.test.ts tests/project-file.test.ts`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/types/sceneforge.ts electron/sceneforge/types.ts src/lib/project-persistence.ts tests/sceneforge-types.test.ts
git commit -m "feat(sceneforge): add domain types and project metadata"
```

---

## Task 2: SceneForge 项目初始化与审批策略文件

**Files:**
- Create: `electron/sceneforge/pipeline/scene-stage-definitions.ts`
- Create: `electron/sceneforge/pipeline/scene-approval-policy.ts`
- Create: `electron/sceneforge/project/scene-project-file.ts`
- Test: `tests/sceneforge-project-file.test.ts`
- Test: `tests/sceneforge-approval-policy.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-project-file.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';

describe('createSceneForgeProject', () => {
  it('creates project.json and sceneforge runtime files', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-project-'));
    try {
      await createSceneForgeProject({
        projectDir: dir,
        name: '百万英镑名场面动画化再创作',
        slug: 'million-pound-note',
        pipelineId: 'reference_remake',
      });

      const project = JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf-8'));
      expect(project.type).toBe('sceneforge');
      expect(project.sceneforge.pipelineId).toBe('reference_remake');
      expect(existsSync(path.join(dir, 'inputs', 'source.md'))).toBe(true);
      expect(existsSync(path.join(dir, 'sceneforge', 'state.json'))).toBe(true);
      expect(existsSync(path.join(dir, 'sceneforge', 'approval_policy.yaml'))).toBe(true);
      expect(existsSync(path.join(dir, 'sceneforge', 'artifact_manifest.yaml'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

```ts
// tests/sceneforge-approval-policy.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSceneApprovalPolicy, writeDefaultApprovalPolicy } from '../electron/sceneforge/pipeline/scene-approval-policy';

describe('SceneForge approval policy', () => {
  it('uses defaults and allows project overrides', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-policy-'));
    try {
      mkdirSync(path.join(dir, 'sceneforge'), { recursive: true });
      await writeDefaultApprovalPolicy(dir);
      expect(await resolveSceneApprovalPolicy(dir, 'design')).toBe('required');
      expect(await resolveSceneApprovalPolicy(dir, 'performance')).toBe('auto_if_valid');

      writeFileSync(path.join(dir, 'sceneforge', 'approval_policy.yaml'), [
        'version: 1',
        'overrides:',
        '  performance: required',
        '  design: optional',
      ].join('\n'));

      expect(await resolveSceneApprovalPolicy(dir, 'performance')).toBe('required');
      expect(await resolveSceneApprovalPolicy(dir, 'design')).toBe('optional');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-project-file.test.ts tests/sceneforge-approval-policy.test.ts`
Expected: FAIL，模块未实现。

- [ ] **Step 3: 实现阶段定义**

Create `electron/sceneforge/pipeline/scene-stage-definitions.ts`:

```ts
import type { SceneApprovalPolicy, SceneStageId } from '../types';

export interface SceneStageDefinition {
  id: SceneStageId;
  displayName: string;
  category: 'core' | 'support' | 'system';
  dependencies: SceneStageId[];
  defaultApprovalPolicy: SceneApprovalPolicy;
  requiredArtifacts: string[];
}

export const SCENE_STAGE_DEFINITIONS: SceneStageDefinition[] = [
  { id: 'design', displayName: 'Design Prompts', category: 'core', dependencies: [], defaultApprovalPolicy: 'required', requiredArtifacts: ['design_prompts', 'character_prompts', 'scene_prompts', 'prop_prompts', 'master_reference_prompt'] },
  { id: 'storyboard', displayName: 'Storyboard Prompts', category: 'core', dependencies: ['design'], defaultApprovalPolicy: 'required', requiredArtifacts: ['storyboard_prompt_pack', 'control_board_prompts', 'style_board_prompts', 'master_board_prompt'] },
  { id: 'video_prompts', displayName: 'Video Prompt Packs', category: 'core', dependencies: ['design', 'storyboard'], defaultApprovalPolicy: 'required', requiredArtifacts: ['video_prompt_pack', 'video_prompt_pack_cn'] },
  { id: 'performance', displayName: 'Performance Direction', category: 'support', dependencies: ['script'], defaultApprovalPolicy: 'auto_if_valid', requiredArtifacts: ['performance_direction'] },
  { id: 'audio', displayName: 'Audio Design', category: 'support', dependencies: ['storyboard'], defaultApprovalPolicy: 'auto_if_valid', requiredArtifacts: ['audio_design'] },
  { id: 'export', displayName: 'Export Prompt Pack', category: 'system', dependencies: ['video_prompts'], defaultApprovalPolicy: 'required', requiredArtifacts: ['final_prompt_pack'] },
];

export function getSceneStageDefinition(stage: SceneStageId): SceneStageDefinition {
  const found = SCENE_STAGE_DEFINITIONS.find((item) => item.id === stage);
  if (!found) throw new Error(`Unknown SceneForge stage: ${stage}`);
  return found;
}
```

- [ ] **Step 4: 实现审批策略读写**

Create `electron/sceneforge/pipeline/scene-approval-policy.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneApprovalPolicy, SceneStageId } from '../types';
import { isSceneApprovalPolicy } from '../types';
import { SCENE_STAGE_DEFINITIONS, getSceneStageDefinition } from './scene-stage-definitions';

interface ApprovalPolicyFile {
  version: 1;
  overrides?: Partial<Record<SceneStageId, SceneApprovalPolicy>>;
}

const POLICY_FILE = path.join('sceneforge', 'approval_policy.yaml');

export async function writeDefaultApprovalPolicy(projectDir: string): Promise<void> {
  const defaults = Object.fromEntries(
    SCENE_STAGE_DEFINITIONS.map((stage) => [stage.id, stage.defaultApprovalPolicy]),
  );
  const content = YAML.stringify({ version: 1, defaults, overrides: {} });
  await fs.mkdir(path.join(projectDir, 'sceneforge'), { recursive: true });
  await fs.writeFile(path.join(projectDir, POLICY_FILE), content, 'utf-8');
}

export async function readApprovalPolicyFile(projectDir: string): Promise<ApprovalPolicyFile> {
  try {
    const raw = await fs.readFile(path.join(projectDir, POLICY_FILE), 'utf-8');
    const parsed = YAML.parse(raw) as ApprovalPolicyFile;
    return { version: 1, overrides: parsed?.overrides ?? {} };
  } catch {
    return { version: 1, overrides: {} };
  }
}

export async function resolveSceneApprovalPolicy(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneApprovalPolicy> {
  const file = await readApprovalPolicyFile(projectDir);
  const override = file.overrides?.[stage];
  if (isSceneApprovalPolicy(override)) return override;
  return getSceneStageDefinition(stage).defaultApprovalPolicy;
}
```

- [ ] **Step 5: 实现项目初始化**

Create `electron/sceneforge/project/scene-project-file.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { createDefaultProjectData, type ProjectData } from '../../../src/lib/project-persistence';
import { writeDefaultApprovalPolicy } from '../pipeline/scene-approval-policy';
import type { SceneProjectMeta } from '../types';

export interface CreateSceneForgeProjectInput {
  projectDir: string;
  name: string;
  slug: string;
  pipelineId: SceneProjectMeta['pipelineId'];
}

export async function createSceneForgeProject(input: CreateSceneForgeProjectInput): Promise<ProjectData> {
  const projectDir = path.resolve(input.projectDir);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(path.join(projectDir, 'inputs'), { recursive: true });
  await fs.writeFile(path.join(projectDir, 'inputs', 'source.md'), '', { flag: 'a' });

  const sceneRoot = path.join(projectDir, 'sceneforge');
  await fs.mkdir(path.join(sceneRoot, 'stages', 'design', 'outputs'), { recursive: true });
  await fs.mkdir(path.join(sceneRoot, 'stages', 'storyboard', 'outputs'), { recursive: true });
  await fs.mkdir(path.join(sceneRoot, 'stages', 'video_prompts', 'outputs'), { recursive: true });
  await fs.mkdir(path.join(sceneRoot, 'runtime', 'validation'), { recursive: true });
  await fs.mkdir(path.join(sceneRoot, 'exports', 'prompt_pack'), { recursive: true });

  const meta: SceneProjectMeta = {
    version: 1,
    projectRoot: 'sceneforge',
    pipelineId: input.pipelineId,
    currentStage: 'design',
    status: 'ready',
    coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
    lastExportPath: null,
  };

  const data: ProjectData = {
    ...createDefaultProjectData(),
    type: 'sceneforge',
    sceneforge: meta,
  };
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(data, null, 2), 'utf-8');
  await fs.writeFile(path.join(sceneRoot, 'state.json'), JSON.stringify({ version: 1, currentStage: 'design', stages: {} }, null, 2), 'utf-8');
  await fs.writeFile(path.join(sceneRoot, 'artifact_manifest.yaml'), 'version: 1\nartifacts: []\n', 'utf-8');
  await writeDefaultApprovalPolicy(projectDir);
  return data;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-project-file.test.ts tests/sceneforge-approval-policy.test.ts tests/sceneforge-types.test.ts`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add electron/sceneforge/pipeline/scene-stage-definitions.ts electron/sceneforge/pipeline/scene-approval-policy.ts electron/sceneforge/project/scene-project-file.ts tests/sceneforge-project-file.test.ts tests/sceneforge-approval-policy.test.ts
git commit -m "feat(sceneforge): initialize projects and configurable approval policy"
```

---

## Task 3: Artifact Store 与 Manifest 注册

**Files:**
- Create: `electron/sceneforge/artifacts/scene-artifact-store.ts`
- Test: `tests/sceneforge-artifact-store.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-artifact-store.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSceneArtifact, listSceneArtifacts, readSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';

describe('Scene artifact store', () => {
  it('writes an artifact under stage outputs and registers it in manifest', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-artifact-'));
    try {
      await createSceneForgeProject({ projectDir: dir, name: 'n', slug: 's', pipelineId: 'reference_remake' });
      const artifact = await writeSceneArtifact({
        projectDir: dir,
        stage: 'design',
        artifactKey: 'design_prompts',
        title: 'Design Prompts',
        content: '# Design Prompts\n\n## Character Prompts\nok',
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      });
      expect(existsSync(path.join(dir, artifact.path))).toBe(true);
      expect(readFileSync(path.join(dir, artifact.path), 'utf-8')).toContain('# Design Prompts');
      const list = await listSceneArtifacts(dir);
      expect(list.map((item) => item.id)).toContain(artifact.id);
      const content = await readSceneArtifact(dir, artifact.id);
      expect(content.content).toContain('Character Prompts');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-artifact-store.test.ts`
Expected: FAIL，模块未实现。

- [ ] **Step 3: 实现 Artifact Store**

Create `electron/sceneforge/artifacts/scene-artifact-store.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneStageId } from '../types';

export type SceneArtifactRole =
  | 'core_generation_asset'
  | 'support_direction_asset'
  | 'system_review_asset'
  | 'export_asset';

export interface SceneArtifact {
  id: string;
  stage: SceneStageId;
  kind: 'preview' | 'draft' | 'review' | 'final' | 'system' | 'export';
  role: SceneArtifactRole;
  title: string;
  path: string;
  coreAsset: boolean;
  displayPriority: number;
  readableByDownstream: boolean;
  usedBy: SceneStageId[];
  viewModes: Array<'preview' | 'structure' | 'trace' | 'raw'>;
  createdAt: string;
}

export interface WriteSceneArtifactInput {
  projectDir: string;
  stage: SceneStageId;
  artifactKey: string;
  title: string;
  content: string;
  role: SceneArtifactRole;
  coreAsset: boolean;
  readableByDownstream: boolean;
}

interface ManifestFile {
  version: 1;
  artifacts: SceneArtifact[];
}

const manifestPath = (projectDir: string) => path.join(projectDir, 'sceneforge', 'artifact_manifest.yaml');

async function readManifest(projectDir: string): Promise<ManifestFile> {
  try {
    const raw = await fs.readFile(manifestPath(projectDir), 'utf-8');
    const parsed = YAML.parse(raw) as ManifestFile;
    return { version: 1, artifacts: Array.isArray(parsed?.artifacts) ? parsed.artifacts : [] };
  } catch {
    return { version: 1, artifacts: [] };
  }
}

async function writeManifest(projectDir: string, manifest: ManifestFile): Promise<void> {
  await fs.mkdir(path.dirname(manifestPath(projectDir)), { recursive: true });
  await fs.writeFile(manifestPath(projectDir), YAML.stringify(manifest), 'utf-8');
}

export async function writeSceneArtifact(input: WriteSceneArtifactInput): Promise<SceneArtifact> {
  const fileName = `${input.artifactKey}.md`;
  const relative = path.posix.join('sceneforge', 'stages', input.stage, 'outputs', fileName);
  const absolute = path.join(input.projectDir, ...relative.split('/'));
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, input.content, 'utf-8');

  const artifact: SceneArtifact = {
    id: `${input.stage}.${input.artifactKey}`,
    stage: input.stage,
    kind: 'final',
    role: input.role,
    title: input.title,
    path: relative,
    coreAsset: input.coreAsset,
    displayPriority: input.coreAsset ? 100 : 50,
    readableByDownstream: input.readableByDownstream,
    usedBy: input.stage === 'design' ? ['storyboard', 'video_prompts', 'export'] : input.stage === 'storyboard' ? ['video_prompts', 'export'] : ['export'],
    viewModes: ['preview', 'structure', 'trace', 'raw'],
    createdAt: new Date().toISOString(),
  };

  const manifest = await readManifest(input.projectDir);
  manifest.artifacts = manifest.artifacts.filter((item) => item.id !== artifact.id);
  manifest.artifacts.push(artifact);
  await writeManifest(input.projectDir, manifest);
  return artifact;
}

export async function listSceneArtifacts(projectDir: string): Promise<SceneArtifact[]> {
  return (await readManifest(projectDir)).artifacts;
}

export async function readSceneArtifact(projectDir: string, artifactId: string): Promise<{ artifact: SceneArtifact; content: string }> {
  const artifact = (await listSceneArtifacts(projectDir)).find((item) => item.id === artifactId);
  if (!artifact) throw new Error(`Unknown SceneForge artifact: ${artifactId}`);
  const absolute = path.join(projectDir, ...artifact.path.split('/'));
  return { artifact, content: await fs.readFile(absolute, 'utf-8') };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-artifact-store.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add electron/sceneforge/artifacts/scene-artifact-store.ts tests/sceneforge-artifact-store.test.ts
git commit -m "feat(sceneforge): add artifact store and manifest registration"
```

---

## Task 4: 状态机、Validator 与审批状态

**Files:**
- Create: `electron/sceneforge/pipeline/scene-state-machine.ts`
- Create: `electron/sceneforge/validators/scene-validator.ts`
- Create: `electron/sceneforge/validators/validators.design.ts`
- Create: `electron/sceneforge/validators/validators.storyboard.ts`
- Create: `electron/sceneforge/validators/validators.video-prompts.ts`
- Test: `tests/sceneforge-state-machine.test.ts`
- Test: `tests/sceneforge-validator.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-state-machine.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { markSceneStageDraftSubmitted, markSceneStageValidated, approveSceneStage, readSceneState } from '../electron/sceneforge/pipeline/scene-state-machine';

describe('SceneForge state machine', () => {
  it('keeps validated separate from approved for required stages', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-state-'));
    try {
      await createSceneForgeProject({ projectDir: dir, name: 'n', slug: 's', pipelineId: 'reference_remake' });
      await markSceneStageDraftSubmitted(dir, 'design');
      await markSceneStageValidated(dir, 'design', 'required');
      expect((await readSceneState(dir)).stages.design.status).toBe('waiting_approval');
      await approveSceneStage(dir, 'design');
      expect((await readSceneState(dir)).stages.design.status).toBe('approved');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

```ts
// tests/sceneforge-validator.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { validateSceneStage } from '../electron/sceneforge/validators/scene-validator';

describe('SceneForge validator', () => {
  it('fails design when required core artifacts are missing', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-validator-'));
    try {
      await createSceneForgeProject({ projectDir: dir, name: 'n', slug: 's', pipelineId: 'reference_remake' });
      await writeSceneArtifact({
        projectDir: dir,
        stage: 'design',
        artifactKey: 'design_prompts',
        title: 'Design Prompts',
        content: '# Design Prompts\n',
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      });
      const result = await validateSceneStage(dir, 'design');
      expect(result.status).toBe('failed');
      expect(result.errors.some((error) => error.code === 'SCENE_DESIGN_MISSING_CHARACTER_PROMPTS')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 实现最小状态机**

`scene-state-machine.ts` 负责读写 `sceneforge/state.json`，并提供：

```ts
readSceneState(projectDir)
markSceneStageDraftSubmitted(projectDir, stage)
markSceneStageValidated(projectDir, stage, policy)
markSceneStageValidationFailed(projectDir, stage, validation)
approveSceneStage(projectDir, stage)
requestSceneStageRevision(projectDir, stage, note)
```

规则：

- `required` 策略验证通过进入 `waiting_approval`。
- `optional` 策略验证通过进入 `validated`。
- `auto_if_valid` 策略验证通过进入 `completed`。
- `skip` 只能用于无核心产物阶段；核心阶段设置 `skip` 仍需 UI 二次确认，状态机只接受明确调用。

- [ ] **Step 3: 实现 Validator**

Validator 聚合入口返回：

```ts
interface SceneValidationResult {
  stage: SceneStageId;
  status: 'passed' | 'failed';
  validatedAt: string;
  errors: Array<{ code: string; level: 'error' | 'warning'; message: string; suggestion: string }>;
}
```

核心规则：

- Design 必须有 `character_prompts`、`scene_prompts`、`prop_prompts`、`master_reference_prompt`。
- Storyboard 必须有 `storyboard_prompt_pack`、`control_board_prompts`、`style_board_prompts`、`master_board_prompt`。
- Video Prompts 必须有 `video_prompt_pack`、`video_prompt_pack_cn`，内容需包含 `Segment` 和 `Audio` 字样。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run tests/sceneforge-state-machine.test.ts tests/sceneforge-validator.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add electron/sceneforge/pipeline/scene-state-machine.ts electron/sceneforge/validators tests/sceneforge-state-machine.test.ts tests/sceneforge-validator.test.ts
git commit -m "feat(sceneforge): add validation and approval state machine"
```

---

## Task 5: SceneForgeService 门面、IPC 与 Pipeline task kind

**Files:**
- Create: `electron/sceneforge/service.ts`
- Create: `electron/sceneforge/ipc.ts`
- Modify: `electron/pipeline/types.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/lib/electron-api.ts`
- Test: `tests/sceneforge-ipc-contract.test.ts`

- [ ] **Step 1: 写源码契约测试**

```ts
// tests/sceneforge-ipc-contract.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('SceneForge IPC contract', () => {
  it('wires main, preload and electron-api together', () => {
    const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf-8');
    const preload = readFileSync(new URL('../electron/preload.ts', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('../src/lib/electron-api.ts', import.meta.url), 'utf-8');
    expect(main).toContain('registerSceneForgeIpc');
    expect(preload).toContain('sceneGetProjectState');
    expect(api).toContain('sceneGetProjectState');
    expect(api).toContain('sceneSetApprovalPolicy');
  });
});
```

- [ ] **Step 2: 实现 `SceneForgeService`**

Service 暴露：

```ts
createProject(input)
getProjectState(projectDir)
getStageContext(projectDir, stage)
submitStageDraft(input)
validateStage(projectDir, stage)
approveStage(projectDir, stage)
requestRevision(input)
setApprovalPolicy(input)
listArtifacts(projectDir)
readArtifact(projectDir, artifactId)
exportPromptPack(projectDir)
```

实现顺序：

- 先同步调用 Task 2-4 的纯函数。
- `submitStageDraft` 写入 Artifact Store 后调用 `markSceneStageDraftSubmitted`。
- `validateStage` 调用 Validator，再按 `resolveSceneApprovalPolicy` 更新状态。
- `setApprovalPolicy` 更新 `approval_policy.yaml` 的 overrides。

- [ ] **Step 3: 扩展 Pipeline task kind**

Modify `electron/pipeline/types.ts`：

```ts
export const PIPELINE_TASK_KINDS = [
  // existing
  'scene_stage',
  'scene_validate',
  'scene_export',
] as const;
```

并把新 kind 加入 `CANCELABLE_KINDS`。

- [ ] **Step 4: 注册 IPC**

`electron/sceneforge/ipc.ts` 注册：

```text
sceneforge:create-project
sceneforge:get-project-state
sceneforge:get-stage-context
sceneforge:submit-stage-draft
sceneforge:validate-stage
sceneforge:approve-stage
sceneforge:request-revision
sceneforge:set-approval-policy
sceneforge:list-artifacts
sceneforge:read-artifact
sceneforge:export-prompt-pack
```

- [ ] **Step 5: 同步 preload/electron-api**

在 `ElectronAPI` 增加 `scene*` 方法；在 preload 暴露同名函数。

- [ ] **Step 6: 运行测试**

Run: `npx vitest run tests/sceneforge-ipc-contract.test.ts tests/pipeline-types.test.ts`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add electron/sceneforge/service.ts electron/sceneforge/ipc.ts electron/pipeline/types.ts electron/main.ts electron/preload.ts src/lib/electron-api.ts tests/sceneforge-ipc-contract.test.ts
git commit -m "feat(sceneforge): expose service through electron ipc"
```

---

## Task 6: MCP 工具注册

**Files:**
- Create: `electron/sceneforge/mcp/register-scene-tools.ts`
- Modify: `electron/pipeline/tools/register.ts`
- Test: `tests/sceneforge-mcp-registration.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-mcp-registration.test.ts
import { describe, expect, it } from 'vitest';
import { registerPipelineMcpTools } from '../electron/pipeline/tools/register';

class FakeMcpServer {
  tools = new Map<string, unknown>();
  registerTool(name: string, def: unknown, handler: unknown): void {
    this.tools.set(name, { def, handler });
  }
}

describe('SceneForge MCP tools', () => {
  it('registers SceneForge tools', () => {
    const server = new FakeMcpServer();
    registerPipelineMcpTools(
      server as any,
      () => null,
      () => '/tmp/lingji-userdata',
    );
    expect([...server.tools.keys()]).toEqual(expect.arrayContaining([
      'scene_get_project_state',
      'scene_get_stage_context',
      'scene_submit_stage_draft',
      'scene_validate_stage',
      'scene_approve_stage',
      'scene_set_approval_policy',
      'scene_list_artifacts',
      'scene_read_artifact',
      'scene_export_prompt_pack',
    ]));
  });
});
```

- [ ] **Step 2: 实现 MCP 注册**

`register-scene-tools.ts` 用现有 `server.registerTool` 风格，所有 handler 调 `SceneForgeService`。

工具边界：

- `scene_submit_stage_draft` 不接收任意 path，只接收 `artifactKey` 与 content。
- `scene_set_approval_policy` 只允许合法 stage/policy。
- 所有返回 JSON 包含 `ok`、`state`、`artifacts` 或 `errorCode`。

- [ ] **Step 3: 接入现有注册入口**

Modify `electron/pipeline/tools/register.ts`：

```ts
import { registerSceneForgeMcpTools } from '../../sceneforge/mcp/register-scene-tools';

// registerGenerationTools 前后均可，避免覆盖已有 lingji_* 工具名
registerSceneForgeMcpTools(server);
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest run tests/sceneforge-mcp-registration.test.ts tests/pipeline-mcp-registration.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add electron/sceneforge/mcp/register-scene-tools.ts electron/pipeline/tools/register.ts tests/sceneforge-mcp-registration.test.ts
git commit -m "feat(sceneforge): register mcp tools"
```

---

## Task 7: Renderer 路由、Store 与 Studio 骨架

**Files:**
- Create: `src/sceneforge/types.ts`
- Create: `src/sceneforge/stores/scene-store.ts`
- Create: `src/sceneforge/pages/SceneForgeProjectSetup.tsx`
- Create: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/App.tsx`
- Test: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: 写 UI smoke test**

```tsx
// tests/sceneforge-ui.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneForgeStudio } from '../src/sceneforge/pages/SceneForgeStudio';

describe('SceneForgeStudio', () => {
  it('renders the core workspace regions', () => {
    render(<SceneForgeStudio projectDir="/tmp/project" />);
    expect(screen.getByText('SceneForge Studio')).toBeTruthy();
    expect(screen.getByText('Design Prompts')).toBeTruthy();
    expect(screen.getByText('Storyboard Prompts')).toBeTruthy();
    expect(screen.getByText('Video Prompt Packs')).toBeTruthy();
    expect(screen.getByText('Artifact Inspector')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 扩展 AppPage**

`src/lib/electron-api.ts`：

```ts
export type AppPage =
  | 'welcome'
  | 'setup'
  | 'editor'
  | 'script-workbench'
  | 'settings'
  | 'auto-run'
  | 'sceneforge-setup'
  | 'sceneforge-studio';
```

- [ ] **Step 3: 实现最小 Studio**

`SceneForgeStudio.tsx` 先渲染三栏：

```tsx
export function SceneForgeStudio({ projectDir }: { projectDir: string | null }) {
  return (
    <main>
      <header>SceneForge Studio</header>
      <aside>
        <button>Design Prompts</button>
        <button>Storyboard Prompts</button>
        <button>Video Prompt Packs</button>
      </aside>
      <section>Current Stage Workspace</section>
      <aside>Artifact Inspector</aside>
    </main>
  );
}
```

后续任务替换为正式组件。

- [ ] **Step 4: 接入 App**

在 `src/App.tsx` 引入新页面，并按 `page === 'sceneforge-studio'` 渲染。

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/app-menu.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/sceneforge src/lib/electron-api.ts src/App.tsx tests/sceneforge-ui.test.tsx
git commit -m "feat(sceneforge): add studio route and renderer shell"
```

---

## Task 8: Pipeline Flow、Artifact Inspector、Approval Policy 控件

**Files:**
- Create: `src/sceneforge/components/pipeline/PipelineFlow.tsx`
- Create: `src/sceneforge/components/artifacts/ArtifactInspector.tsx`
- Create: `src/sceneforge/components/approval/ApprovalGate.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Test: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: 扩展 UI 测试**

追加断言：

```tsx
expect(screen.getByText('Approval Policy')).toBeTruthy();
expect(screen.getByText('Required')).toBeTruthy();
expect(screen.getByText('Auto if valid')).toBeTruthy();
expect(screen.getByText('Preview')).toBeTruthy();
expect(screen.getByText('Trace')).toBeTruthy();
```

- [ ] **Step 2: 实现 PipelineFlow**

显示阶段：

```text
Design Prompts
Storyboard Prompts
Video Prompt Packs
Support
Performance Direction
Audio Design
```

- [ ] **Step 3: 实现 ArtifactInspector**

Tabs：Preview / Structure / Trace / Raw。第一版无 artifact 时显示 `No artifact selected`。

- [ ] **Step 4: 实现 ApprovalGate**

显示策略分段控件：

```text
Required | Optional | Auto if valid | Skip
```

切换时调用 `window.electronAPI.sceneSetApprovalPolicy`；核心阶段切到 `auto_if_valid/skip` 前使用现有 confirm 模式或浏览器 confirm。

- [ ] **Step 5: 运行测试**

Run: `npx vitest run tests/sceneforge-ui.test.tsx`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/sceneforge/components src/sceneforge/pages/SceneForgeStudio.tsx tests/sceneforge-ui.test.tsx
git commit -m "feat(sceneforge): add pipeline inspector and approval controls"
```

---

## Task 9: Prompt Pack Export

**Files:**
- Create: `electron/sceneforge/export/scene-prompt-pack-exporter.ts`
- Create: `src/sceneforge/components/export/PromptPackExportPanel.tsx`
- Modify: `electron/sceneforge/service.ts`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Test: `tests/sceneforge-export.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/sceneforge-export.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { writeSceneArtifact } from '../electron/sceneforge/artifacts/scene-artifact-store';
import { exportScenePromptPack } from '../electron/sceneforge/export/scene-prompt-pack-exporter';

describe('SceneForge prompt pack export', () => {
  it('exports the three core prompt files and manifest', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-export-'));
    try {
      await createSceneForgeProject({ projectDir: dir, name: 'n', slug: 's', pipelineId: 'reference_remake' });
      for (const [stage, key] of [['design', 'design_prompts'], ['storyboard', 'storyboard_prompt_pack'], ['video_prompts', 'video_prompt_pack']] as const) {
        await writeSceneArtifact({
          projectDir: dir,
          stage,
          artifactKey: key,
          title: key,
          content: `# ${key}`,
          role: 'core_generation_asset',
          coreAsset: true,
          readableByDownstream: true,
        });
      }
      const result = await exportScenePromptPack(dir);
      expect(existsSync(path.join(dir, result.exportDir, 'final_prompt_pack.md'))).toBe(true);
      expect(readFileSync(path.join(dir, result.exportDir, 'manifest.json'), 'utf-8')).toContain('design_prompts');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 实现 exporter**

导出到：

```text
sceneforge/exports/prompt_pack/
  final_prompt_pack.md
  design_prompts.md
  storyboard_prompts.md
  video_prompts.md
  manifest.json
```

只包含 manifest 中 `coreAsset=true` 且 `readableByDownstream=true` 的核心产物。二期再加 ZIP。

- [ ] **Step 3: UI 加 Export Panel**

按钮：

```text
Export Prompt Pack
```

点击调用 `sceneExportPromptPack`，完成后通过任务完成 action 或 toast 打开导出位置。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run tests/sceneforge-export.test.ts tests/sceneforge-ui.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add electron/sceneforge/export/scene-prompt-pack-exporter.ts src/sceneforge/components/export/PromptPackExportPanel.tsx electron/sceneforge/service.ts src/sceneforge/pages/SceneForgeStudio.tsx tests/sceneforge-export.test.ts
git commit -m "feat(sceneforge): export prompt pack"
```

---

## Task 10: End-to-End Core Flow Regression

**Files:**
- Create: `tests/sceneforge-core-flow.test.ts`
- Modify: files from previous tasks only if regression exposes gaps

- [ ] **Step 1: 写端到端测试**

```ts
// tests/sceneforge-core-flow.test.ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SceneForgeService } from '../electron/sceneforge/service';

describe('SceneForge core flow', () => {
  it('runs create -> submit -> validate -> approve -> export for the core stages', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'scene-flow-'));
    try {
      const svc = new SceneForgeService();
      await svc.createProject({ projectDir: dir, name: 'n', slug: 's', pipelineId: 'reference_remake' });
      await svc.submitStageDraft({ projectDir: dir, stage: 'design', artifacts: {
        design_prompts: '# Design Prompts',
        character_prompts: '# Character Prompts',
        scene_prompts: '# Scene Prompts',
        prop_prompts: '# Prop Prompts',
        master_reference_prompt: '# Master Reference Prompt',
      }});
      expect((await svc.validateStage(dir, 'design')).status).toBe('passed');
      await svc.approveStage(dir, 'design');
      const exported = await svc.exportPromptPack(dir);
      expect(existsSync(path.join(dir, exported.exportDir, 'manifest.json'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 跑核心测试组**

Run:

```bash
npx vitest run tests/sceneforge-*.test.ts
```

Expected: PASS。

- [ ] **Step 3: 跑相关回归**

Run:

```bash
npx vitest run tests/project-file.test.ts tests/pipeline-*.test.ts tests/electron-api.test.ts tests/app.test.tsx
```

Expected: PASS。

- [ ] **Step 4: 构建检查**

Run:

```bash
npm run build
```

Expected: Electron main/preload/renderer build 成功。

- [ ] **Step 5: 提交**

```bash
git add tests/sceneforge-core-flow.test.ts
git commit -m "test(sceneforge): cover core prompt pack flow"
```

---

## Task 11: Stage Runner 与 Stage Skill Pack 基座

**Files:**
- Create: `electron/sceneforge/pipeline/scene-stage-pack.ts`
- Create: `electron/sceneforge/pipeline/scene-stage-runner.ts`
- Create: `prompts/sceneforge/stages/design/system.md`
- Create: `prompts/sceneforge/stages/design/user.md`
- Create: `prompts/sceneforge/stages/design/agent-instructions.md`
- Create: `prompts/sceneforge/stages/design/output-contract.yaml`
- Create: `prompts/sceneforge/stages/design/review-checklist.md`
- Modify: `electron/sceneforge/service.ts`
- Test: `tests/sceneforge-stage-pack.test.ts`
- Test: `tests/sceneforge-stage-runner.test.ts`

- [ ] **Step 1: 写 Stage Pack 测试**

```ts
// tests/sceneforge-stage-pack.test.ts
import { describe, expect, it } from 'vitest';
import { loadSceneStagePack } from '../electron/sceneforge/pipeline/scene-stage-pack';

describe('SceneForge stage pack', () => {
  it('loads rules and contracts for design stage', async () => {
    const pack = await loadSceneStagePack('design');
    expect(pack.stage).toBe('design');
    expect(pack.systemPrompt).toContain('Design');
    expect(pack.userPrompt).toContain('{{stageContext}}');
    expect(pack.agentInstructions).toContain('scene_submit_stage_draft');
    expect(pack.outputContract.requiredArtifacts).toContain('design_prompts');
    expect(pack.reviewChecklist.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 写 Runner 测试**

```ts
// tests/sceneforge-stage-runner.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createManualStageRunner } from '../electron/sceneforge/pipeline/scene-stage-runner';

describe('SceneForge stage runner', () => {
  it('manual runner returns draft and does not write state by itself', async () => {
    const runner = createManualStageRunner();
    const draft = await runner.run({
      projectDir: '/tmp/project',
      stage: 'design',
      stageContext: { stage: 'design' },
      manualArtifacts: { design_prompts: '# Design' },
      submitStageDraft: vi.fn(),
    } as any);
    expect(draft.artifacts.design_prompts).toContain('# Design');
  });
});
```

- [ ] **Step 3: 实现 Stage Pack loader**

`loadSceneStagePack(stage)` 从 `prompts/sceneforge/stages/<stage>/` 读取：

```text
system.md
user.md
agent-instructions.md
output-contract.yaml
review-checklist.md
```

返回结构：

```ts
interface SceneStagePack {
  stage: SceneStageId;
  systemPrompt: string;
  userPrompt: string;
  agentInstructions: string;
  outputContract: { requiredArtifacts: string[] };
  reviewChecklist: string[];
}
```

- [ ] **Step 4: 实现 Runner 抽象**

`scene-stage-runner.ts` 定义：

```ts
type SceneStageRunnerType = 'manual_submit' | 'direct_llm' | 'acp_agent';
```

第一版只实现 `manual_submit`。`direct_llm` 和 `acp_agent` 先保留接口与错误提示：

- `direct_llm` 后续接 Lingji AI Provider / PromptBinding。
- `acp_agent` 后续接现有 ACP 会话和 Scene MCP tools。

- [ ] **Step 5: 加入 Design Stage Pack 文件**

Design pack 先以最小模板落地：

- system：定义设计阶段目标。
- user：包含 `{{stageContext}}` 占位，由程序渲染。
- agent instructions：要求 Agent 使用 `scene_get_stage_context` 和 `scene_submit_stage_draft`。
- output contract：列出 5 个 Design artifacts。
- review checklist：设计阶段人工审查项。

- [ ] **Step 6: Service 预留 runnerType**

`SceneForgeService.submitStageDraft` 保持现有手动提交路径；新增 `runStage({ runnerType })` 接口占位。

第一版行为：

- `manual_submit` 可用。
- `direct_llm/acp_agent` 返回结构化 not_implemented，并不影响核心闭环。

- [ ] **Step 7: 运行测试**

Run:

```bash
npx vitest run tests/sceneforge-stage-pack.test.ts tests/sceneforge-stage-runner.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add electron/sceneforge/pipeline/scene-stage-pack.ts electron/sceneforge/pipeline/scene-stage-runner.ts prompts/sceneforge/stages/design tests/sceneforge-stage-pack.test.ts tests/sceneforge-stage-runner.test.ts electron/sceneforge/service.ts
git commit -m "feat(sceneforge): add stage runner and skill pack foundation"
```

---

## Task 12: Scene Asset Library 与 Style Profiles 迁移基座

**Files:**
- Create: `prompts/sceneforge/assets/registry.yaml`
- Create: `prompts/sceneforge/assets/adaptation/*`
- Create: `prompts/sceneforge/assets/animation-stylization/*`
- Create: `prompts/sceneforge/assets/cinematic-language/*`
- Create: `prompts/sceneforge/assets/storyboard-methodology/*`
- Create: `prompts/sceneforge/assets/style-profiles/*`
- Create: `electron/sceneforge/assets/scene-asset-library.ts`
- Modify: `electron/sceneforge/pipeline/scene-stage-pack.ts`
- Test: `tests/sceneforge-asset-library.test.ts`

- [ ] **Step 1: 写资产库测试**

```ts
// tests/sceneforge-asset-library.test.ts
import { describe, expect, it } from 'vitest';
import {
  listSceneAssets,
  loadSceneStyleProfile,
  resolveSceneAssetsForStage,
} from '../electron/sceneforge/assets/scene-asset-library';

describe('Scene Asset Library', () => {
  it('indexes reusable assets but excludes source-materials', async () => {
    const assets = await listSceneAssets();
    expect(assets.some((asset) => asset.id === 'style.pixar_like')).toBe(true);
    expect(assets.some((asset) => asset.id.includes('source-materials'))).toBe(false);
  });

  it('loads a style profile by id', async () => {
    const profile = await loadSceneStyleProfile('style.pixar_like');
    expect(profile.id).toBe('style.pixar_like');
    expect(profile.files.profile).toContain('Pixar');
    expect(profile.files.negative).toBeTruthy();
  });

  it('resolves stage-specific asset snippets', async () => {
    const snippets = await resolveSceneAssetsForStage({
      stage: 'storyboard',
      selectedAssetIds: ['style.pixar_like', 'cinematic.shot_language'],
    });
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets.join('\n')).not.toContain('source-materials');
  });
});
```

- [ ] **Step 2: 迁移资产文件**

从 `/Users/tangwujun/Documents/trae_projects/scene_forge` 迁移这些目录到 `prompts/sceneforge/assets/`：

```text
assets/adaptation/
assets/animation-stylization/
assets/cinematic-language/
assets/storyboard-methodology/
style_profiles/
```

明确不迁移：

```text
assets/source-materials/
```

`characters/README.md`、`props/README.md`、`scenes/README.md` 可作为空库说明迁移，但不把具体项目资料放入全局资产库。

- [ ] **Step 3: 建立 registry.yaml**

最小 registry 必须索引：

```yaml
version: 1
assets:
  - id: style.pixar_like
    type: style_profile
    title: Pixar-like 3D
    files:
      profile: style-profiles/pixar_like/profile.md
      visual: style-profiles/pixar_like/visual_language.md
      camera: style-profiles/pixar_like/camera_language.md
      lighting: style-profiles/pixar_like/lighting_language.md
      performance: style-profiles/pixar_like/performance_language.md
      rhythm: style-profiles/pixar_like/rhythm_language.md
      negative: style-profiles/pixar_like/negative_constraints.md
    usedBy: [design, performance, storyboard, video_prompts]
  - id: cinematic.shot_language
    type: methodology
    title: Shot Language Library
    files:
      main: cinematic-language/shot-language-library.md
    usedBy: [storyboard, video_prompts]
```

- [ ] **Step 4: 实现 loader**

`scene-asset-library.ts` 提供：

```ts
listSceneAssets()
loadSceneAsset(assetId)
loadSceneStyleProfile(assetId)
resolveSceneAssetsForStage({ stage, selectedAssetIds })
```

规则：

- 只读取 registry 中声明的文件。
- 拒绝 registry 指向 `source-materials`。
- 返回给 Stage Context 的内容按 stage 过滤。
- 单个 asset snippet 要带来源 id 和 title，便于 trace。

- [ ] **Step 5: 接入 Stage Pack / Stage Context**

`scene-stage-pack.ts` 增加可选 selected asset ids。Stage Context 中加入：

```json
{
  "assetLibrary": {
    "selectedAssets": [],
    "snippets": []
  }
}
```

第一版可由项目 meta 或调用参数传入 selectedAssetIds；UI 选择器后续增强。

- [ ] **Step 6: 运行测试**

Run:

```bash
npx vitest run tests/sceneforge-asset-library.test.ts tests/sceneforge-stage-pack.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add prompts/sceneforge/assets electron/sceneforge/assets/scene-asset-library.ts electron/sceneforge/pipeline/scene-stage-pack.ts tests/sceneforge-asset-library.test.ts
git commit -m "feat(sceneforge): add reusable asset library and style profiles"
```

---

## Task 13: 核心产物 Display Model 与 Copy Blocks

**Files:**
- Create: `electron/sceneforge/artifacts/scene-artifact-display-model.ts`
- Modify: `electron/sceneforge/artifacts/scene-artifact-store.ts`
- Modify: `src/types/sceneforge.ts`
- Test: `tests/sceneforge-artifact-display-model.test.ts`

- [ ] **Step 1: 定义 Display Model 类型**

`SceneArtifactDisplayModel` 至少包含：

```ts
interface SceneArtifactDisplayModel {
  artifactId: string;
  displayModelVersion: 1;
  title: string;
  summary: string;
  sections: Array<{ id: string; title: string; kind: 'overview' | 'section' | 'prompt'; copyBlockIds: string[] }>;
  copyBlocks: Array<{ id: string; label: string; target: 'full' | 'section' | 'prompt'; format: 'plain_text'; text: string }>;
  warnings: Array<{ code: string; message: string }>;
}
```

- [ ] **Step 2: 实现核心产物解析**

按 stage + artifact key 解析：

- Design：`character`、`scene`、`prop`、`master_reference`。
- Storyboard：`control_board`、`style_board`、`master_board`、`segment_prompt`。
- Video Prompts：`video_pack_cn`、`video_pack_en optional`、`segment_prompt`。

解析失败时返回 warning，并提供 raw full copy block。

- [ ] **Step 3: 接入 Artifact Store**

`readSceneArtifact` 返回 raw content 时，同时返回 `displayModel`。只有 `kind=final` 且 `coreAsset=true` 的产物生成结构化 Display Model；其他产物返回 `null`。

- [ ] **Step 4: 运行测试**

Run:

```bash
npx vitest run tests/sceneforge-artifact-display-model.test.ts tests/sceneforge-artifact-store.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add electron/sceneforge/artifacts/scene-artifact-display-model.ts electron/sceneforge/artifacts/scene-artifact-store.ts src/types/sceneforge.ts tests/sceneforge-artifact-display-model.test.ts
git commit -m "feat(sceneforge): add artifact display models and copy blocks"
```

---

## Task 14: 核心产物点击查看与复制交互

**Files:**
- Modify: `src/sceneforge/components/pipeline/PipelineFlow.tsx`
- Modify: `src/sceneforge/components/workspace/CurrentStageWorkspace.tsx`
- Modify: `src/sceneforge/components/artifacts/ArtifactInspector.tsx`
- Create: `src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx`
- Modify: `src/sceneforge/stores/scene-store.ts`
- Test: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: 核心阶段一级入口**

Pipeline Flow 中 Design、Storyboard、Video Prompts 完成后展示 final artifact 入口。点击阶段行打开中间区概览，点击具体 artifact 打开右侧 Inspector。

- [ ] **Step 2: 中间区核心产物概览**

按阶段展示可复制摘要：

- Design：Character / Scene / Prop / Master Reference。
- Storyboard：Control Board / Style Board / Master Board / Segment Prompts。
- Video Prompts：CN Pack / EN Pack optional / Segments / Full Pack。

- [ ] **Step 3: Inspector Copy 视图**

Artifact Inspector 增加 Copy tab 或 Copy 区域。每个 copy block 显示标题、预览文本和复制按钮。复制成功显示短反馈，失败显示错误提示。

- [ ] **Step 4: Raw 复制保留**

Raw tab 保留整份 Markdown 查看和复制能力，便于高级用户排查。

- [ ] **Step 5: 运行测试**

Run:

```bash
npx vitest run tests/sceneforge-ui.test.tsx
```

Expected: PASS，覆盖点击打开核心产物和 clipboard copy。

- [ ] **Step 6: 提交**

```bash
git add src/sceneforge/components/pipeline/PipelineFlow.tsx src/sceneforge/components/workspace/CurrentStageWorkspace.tsx src/sceneforge/components/artifacts/ArtifactInspector.tsx src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx src/sceneforge/stores/scene-store.ts tests/sceneforge-ui.test.tsx
git commit -m "feat(sceneforge): add core artifact copy workflow"
```

---

## Priority Order

1. Task 1-2：先锁数据模型、项目初始化、审批策略可配置。
2. Task 3-4：再锁 Artifact + Validator + `validated != approved`。
3. Task 5-6：接 Electron API 与 MCP 工具。
4. Task 7-8：接 UI 骨架、产物查看、审批策略控件。
5. Task 11：补 Stage Runner 与 Stage Skill Pack 基座。
6. Task 12：迁移可复用资产库与 style profiles，不迁移 source-materials。
7. Task 13：补核心产物 Display Model 与 Copy Blocks。
8. Task 14：补核心产物点击查看与复制交互。
9. Task 9：导出 Prompt Pack。
10. Task 10：端到端回归与构建。

## Verification Matrix

| 验收点 | 覆盖任务 |
| --- | --- |
| SceneForge 项目可创建 | Task 2 |
| 阶段审批策略可配置 | Task 2、Task 8 |
| Artifact 写入后自动注册 | Task 3 |
| Validator failed 不能审批 | Task 4、Task 10 |
| required 阶段 validated 后等待人工审批 | Task 4 |
| MCP 不允许任意写 path | Task 6 |
| 阶段规则由程序加载并提供给 LLM/Agent | Task 11 |
| runner 不能绕过 submit/manifest/validator | Task 11 |
| 可复用风格/镜头/分镜资产可被程序按需注入 | Task 12 |
| `source-materials` 不进入全局资产库 | Task 12 |
| UI 能显示三栏工作台 | Task 7、Task 8 |
| 核心产物可被程序解析为可显示/可复制结构 | Task 13 |
| UI 可点击查看核心产物并复制可用内容 | Task 14 |
| 导出包含核心 Prompt Pack | Task 9、Task 10 |

## PRD / Issues Decision

实施计划完成后建议使用：

1. `to-prd`：生成 `.scratch/sceneforge-studio/PRD.md`，把当前文档和计划收敛成可追踪父需求。
2. `to-issues`：按上方 Task 1-14 拆成垂直切片 issue。拆票时不要按“前端/后端/API”横切，应按“项目创建闭环、审批策略闭环、Artifact 注册闭环、核心阶段审批闭环、核心产物可消费查看、导出闭环”拆。
