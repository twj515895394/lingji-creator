# SceneForge Copy Block And Stage Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 SceneForge 核心产物默认按 `pack` 级复制，并同步收口 Studio 工作区信息密度、`video_prompts` 产物数量显示，以及 support 阶段“轻确认”执行边界。

**Architecture:** 保持现有 SceneForge artifact / validator / Studio 三层结构不变，在核心产物正文中引入显式 `copy-block` 协议，优先由 Display Model 解析该协议生成 `copyBlocks`，旧 heading 解析作为 fallback。UI 侧收紧中间工作区，只保留核心产物入口与状态摘要；复制行为统一集中在右侧 Inspector。阶段推进语义不改 `Continue` / `Continue & Run` 基础含义，只为 support 阶段后续“轻确认”预留清晰分支。

**Tech Stack:** Electron, React, TypeScript, Vitest, SceneForge stage packs, stage validators, Artifact Display Model

---

## Scope

- `video_prompts` 与 `storyboard` 的 `copy-block` 协议接线
- Display Model 对显式 `copy-block` 的优先解析与 fallback
- `SceneForgeStudio` 工作区去噪与计数修正
- support 阶段轻确认语义的最小结构调整

## File Map

### Prompt Packs / Contracts

- Modify: `prompts/sceneforge/stages/video_prompts/system.md`
- Modify: `prompts/sceneforge/stages/video_prompts/user.md`
- Modify: `prompts/sceneforge/stages/video_prompts/output-contract.yaml`
- Modify: `prompts/sceneforge/stages/storyboard/system.md`
- Modify: `prompts/sceneforge/stages/storyboard/user.md`

### Validators / Display Model

- Modify: `electron/sceneforge/artifacts/scene-artifact-display-model.ts`
- Modify: `electron/sceneforge/validators/validators.video-prompts.ts`
- Modify: `electron/sceneforge/validators/validators.storyboard.ts`

### Studio UI

- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/components/studio/SceneStageInputsPanel.tsx`
- Modify: `src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx`
- Modify: `src/sceneforge/components/studio/SceneForgeStudioInspector.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.module.css`

### Types / Helpers

- Modify: `src/types/sceneforge.ts`
- Create: `src/sceneforge/lib/scene-copy-blocks.ts`
- Create: `src/sceneforge/components/studio/SceneStageInputsDisclosure.tsx`

### Tests

- Modify: `tests/sceneforge-artifact-display-model.test.ts`
- Modify: `tests/sceneforge-validator.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`
- Modify: `tests/sceneforge-artifact-copy-panel.test.tsx`
- Create: `tests/sceneforge-copy-blocks.test.ts`

## Task Breakdown

### Task 1: Introduce `copy-block` protocol for `video_prompts` and `storyboard`

**Files:**
- Modify: `prompts/sceneforge/stages/video_prompts/system.md`
- Modify: `prompts/sceneforge/stages/video_prompts/user.md`
- Modify: `prompts/sceneforge/stages/video_prompts/output-contract.yaml`
- Modify: `prompts/sceneforge/stages/storyboard/system.md`
- Modify: `prompts/sceneforge/stages/storyboard/user.md`
- Modify: `electron/sceneforge/validators/validators.video-prompts.ts`
- Modify: `electron/sceneforge/validators/validators.storyboard.ts`
- Test: `tests/sceneforge-validator.test.ts`

- [ ] **Step 1: Write failing validator tests for `copy-block` requirements**

```ts
it('fails video_prompts when pack-level copy-block markers are missing', async () => {
  await writeVideoArtifact(
    'video_prompt_pack_cn',
    `# 视频提示词 第01包

## Segment 01
没有 copy-block 标签。`,
  );
  await writeVideoArtifact('video_prompt_review', validReview);
  await writeVideoArtifact('video_prompt_trace', validTrace);

  const result = await validateSceneStage(tmpDir, 'video_prompts');

  expect(result.status).toBe('failed');
  expect(result.errors.map((e) => e.code)).toContain(
    'SCENE_VIDEO_PROMPTS_COPY_BLOCK_MISSING',
  );
});

it('fails storyboard when storyboard_prompt_pack has no storyboard-pack copy-block', async () => {
  await writeStoryboardArtifact(
    'storyboard_prompt_pack',
    `# storyboard_prompt_pack

## Pack 1
正文存在，但没有 copy-block。`,
  );
  await writeStoryboardArtifact('control_board_prompts', validControlBoard);
  await writeStoryboardArtifact('style_board_prompts', validStyleBoard);
  await writeStoryboardArtifact('master_board_prompt', validMasterBoard);

  const result = await validateSceneStage(tmpDir, 'storyboard');

  expect(result.status).toBe('failed');
  expect(result.errors.map((e) => e.code)).toContain(
    'SCENE_STORYBOARD_COPY_BLOCK_MISSING',
  );
});
```

- [ ] **Step 2: Run validator tests to verify they fail**

Run: `npx vitest run tests/sceneforge-validator.test.ts -t "copy-block"`

Expected: FAIL with missing error codes because validators do not yet look for `copy-block`.

- [ ] **Step 3: Add protocol rules to stage prompts and output contracts**

```md
<!-- prompts/sceneforge/stages/video_prompts/system.md -->
你必须将每个正式视频包包裹在显式复制协议中：

<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
...该包可直接投喂视频模型的正文...
</copy-block>

规则：
1. 每个 pack 一个 copy-block，禁止多个 pack 合并到同一个块。
2. 标签体内部只允许放正式可投喂正文，不要混入 review、trace、解释。
3. `id` 必须连续递增：`pack-01`、`pack-02`、`pack-03`。
```

```yaml
# prompts/sceneforge/stages/video_prompts/output-contract.yaml
required_artifacts:
  - video_prompt_pack_cn
  - video_prompt_review
  - video_prompt_trace
copy_protocol:
  primary_unit: pack
  required_block_type: video-pack
  required_id_pattern: "^pack-\\d{2}$"
```

```md
<!-- prompts/sceneforge/stages/storyboard/system.md -->
你必须将每个正式故事板包包裹在显式复制协议中：

<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
...该包可直接投喂生图模型的正文...
</copy-block>
```

- [ ] **Step 4: Implement minimal validator checks for required `copy-block` metadata**

```ts
function extractCopyBlockHeaders(
  content: string,
): Array<{ type: string; id: string; label: string; body: string }> {
  return [...content.matchAll(
    /<copy-block\s+type="([^"]+)"\s+id="([^"]+)"\s+label="([^"]+)">([\s\S]*?)<\/copy-block>/g,
  )].map((match) => ({
    type: match[1] ?? '',
    id: match[2] ?? '',
    label: match[3] ?? '',
    body: (match[4] ?? '').trim(),
  }));
}

const copyBlocks = extractCopyBlockHeaders(cnPack);
if (copyBlocks.length === 0) {
  errors.push({
    code: 'SCENE_VIDEO_PROMPTS_COPY_BLOCK_MISSING',
    level: 'error',
    message: 'video_prompt_pack_cn 缺少 pack 级 copy-block。',
    suggestion: '请让每个正式视频包都输出 <copy-block type="video-pack" ...>...</copy-block>。',
  });
}

if (copyBlocks.some((block) => block.type !== 'video-pack')) {
  errors.push({
    code: 'SCENE_VIDEO_PROMPTS_COPY_BLOCK_INVALID_TYPE',
    level: 'error',
    message: 'video_prompt_pack_cn 的 copy-block type 必须为 video-pack。',
    suggestion: '请统一使用 type="video-pack"。',
  });
}
```

- [ ] **Step 5: Run validator tests to verify the new rules pass**

Run: `npx vitest run tests/sceneforge-validator.test.ts -t "copy-block"`

Expected: PASS for the new cases and no regression in existing `video_prompts` / `storyboard` validation assertions.

- [ ] **Step 6: Commit protocol and validator work**

```bash
git add prompts/sceneforge/stages/video_prompts/system.md \
  prompts/sceneforge/stages/video_prompts/user.md \
  prompts/sceneforge/stages/video_prompts/output-contract.yaml \
  prompts/sceneforge/stages/storyboard/system.md \
  prompts/sceneforge/stages/storyboard/user.md \
  electron/sceneforge/validators/validators.video-prompts.ts \
  electron/sceneforge/validators/validators.storyboard.ts \
  tests/sceneforge-validator.test.ts
git commit -m "feat: add pack-level copy-block protocol"
```

### Task 2: Make Display Model parse explicit `copy-block` first and keep fallback

**Files:**
- Create: `src/sceneforge/lib/scene-copy-blocks.ts`
- Modify: `electron/sceneforge/artifacts/scene-artifact-display-model.ts`
- Modify: `src/types/sceneforge.ts`
- Test: `tests/sceneforge-copy-blocks.test.ts`
- Test: `tests/sceneforge-artifact-display-model.test.ts`

- [ ] **Step 1: Write failing parser tests for explicit `copy-block` extraction**

```ts
import { describe, expect, it } from 'vitest';
import { parseSceneCopyBlocks } from '../src/sceneforge/lib/scene-copy-blocks';

describe('parseSceneCopyBlocks', () => {
  it('extracts pack-level blocks in source order', () => {
    const result = parseSceneCopyBlocks(`
<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
第一包正文
</copy-block>

<copy-block type="video-pack" id="pack-02" label="视频提示词 第02包">
第二包正文
</copy-block>
`);

    expect(result.blocks.map((b) => b.id)).toEqual(['pack-01', 'pack-02']);
    expect(result.blocks[0]?.body).toContain('第一包正文');
  });

  it('returns a structured parse error on malformed closing tags', () => {
    const result = parseSceneCopyBlocks(`
<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
未闭合正文
`);

    expect(result.warnings.map((w) => w.code)).toContain(
      'SCENE_COPY_BLOCK_UNCLOSED_TAG',
    );
  });
});
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `npx vitest run tests/sceneforge-copy-blocks.test.ts`

Expected: FAIL because `parseSceneCopyBlocks` does not exist yet.

- [ ] **Step 3: Add a focused helper for copy-block parsing**

```ts
// src/sceneforge/lib/scene-copy-blocks.ts
export interface ParsedSceneCopyBlock {
  type: string;
  id: string;
  label: string;
  body: string;
}

export interface SceneCopyBlockWarning {
  code: string;
  message: string;
}

export function parseSceneCopyBlocks(content: string): {
  blocks: ParsedSceneCopyBlock[];
  warnings: SceneCopyBlockWarning[];
} {
  const warnings: SceneCopyBlockWarning[] = [];
  const blocks = [...content.matchAll(
    /<copy-block\s+type="([^"]+)"\s+id="([^"]+)"\s+label="([^"]+)">([\s\S]*?)<\/copy-block>/g,
  )].map((match) => ({
    type: match[1] ?? '',
    id: match[2] ?? '',
    label: match[3] ?? '',
    body: (match[4] ?? '').trim(),
  }));

  if (content.includes('<copy-block') && blocks.length === 0) {
    warnings.push({
      code: 'SCENE_COPY_BLOCK_UNCLOSED_TAG',
      message: '检测到 copy-block 起始标签，但未成功解析闭合块。',
    });
  }

  return { blocks, warnings };
}

export function stripSceneCopyBlockTags(content: string): string {
  return content.replace(/<\/?copy-block\b[^>]*>/g, '').trim();
}
```

- [ ] **Step 4: Update Display Model builder to prefer explicit blocks and only fall back to segment parsing**

```ts
const parsed = parseSceneCopyBlocks(content);
warnings.push(...parsed.warnings);

if (artifactKey === 'video_prompt_pack_cn' && parsed.blocks.length > 0) {
  return buildFromBlocks(
    artifact,
    '中文视频分包提示词。',
    [
      {
        id: `${artifact.id}.video_pack_cn`,
        label: '中文视频提示词包',
        target: 'section',
        text: stripSceneCopyBlockTags(content),
      },
      ...parsed.blocks.map((block) => ({
        id: `${artifact.id}.${block.id}`,
        label: `复制${block.label}`,
        target: 'prompt' as const,
        text: block.body,
      })),
    ],
    content,
    warnings,
  );
}

const segments = extractSegmentPrompts(content);
// existing fallback branch stays in place
```

```ts
export interface SceneArtifactDisplayWarning {
  code: string;
  message: string;
}
```

- [ ] **Step 5: Extend display-model tests to cover explicit-block first and legacy fallback**

```ts
it('prefers explicit video-pack copy-blocks over Segment-derived prompts', () => {
  const artifact = coreArtifact({
    id: 'video_prompts.video_prompt_pack_cn',
    stage: 'video_prompts',
    title: '中文包',
  });
  const model = buildSceneArtifactDisplayModel(
    artifact,
    `<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
第01包投喂正文
</copy-block>`,
  );

  expect(model?.copyBlocks.some((b) => b.label === '复制视频提示词 第01包')).toBe(true);
  expect(model?.copyBlocks.some((b) => b.label.includes('Segment'))).toBe(false);
});

it('falls back to legacy Segment parsing when no copy-block exists', () => {
  const artifact = coreArtifact({
    id: 'video_prompts.video_prompt_pack_cn',
    stage: 'video_prompts',
    title: '中文包',
  });
  const model = buildSceneArtifactDisplayModel(
    artifact,
    '# 中文\n\n## Segment 01\n旧结构正文。',
  );

  expect(model?.copyBlocks.some((b) => b.label.includes('Segment 01'))).toBe(true);
});
```

- [ ] **Step 6: Run parser and display-model tests**

Run: `npx vitest run tests/sceneforge-copy-blocks.test.ts tests/sceneforge-artifact-display-model.test.ts`

Expected: PASS; explicit `copy-block` cases and legacy fallback cases both green.

- [ ] **Step 7: Commit parser and display-model changes**

```bash
git add src/sceneforge/lib/scene-copy-blocks.ts \
  src/types/sceneforge.ts \
  electron/sceneforge/artifacts/scene-artifact-display-model.ts \
  tests/sceneforge-copy-blocks.test.ts \
  tests/sceneforge-artifact-display-model.test.ts
git commit -m "feat: parse explicit sceneforge copy blocks"
```

### Task 3: Reduce Stage Workspace noise and fix `video_prompts` artifact count

**Files:**
- Create: `src/sceneforge/components/studio/SceneStageInputsDisclosure.tsx`
- Modify: `src/sceneforge/components/studio/SceneStageInputsPanel.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx`
- Modify: `src/sceneforge/components/studio/SceneForgeStudioInspector.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.module.css`
- Test: `tests/sceneforge-ui.test.tsx`
- Test: `tests/sceneforge-artifact-copy-panel.test.tsx`

- [ ] **Step 1: Write failing UI tests for folded inputs, removed workspace segment-copy summary, and `3 / 3` count**

```ts
it('renders stage inputs as a collapsed disclosure by default', () => {
  const html = renderToStaticMarkup(
    <SceneStageInputsPanel
      stageContext={{
        stage: 'video_prompts',
        requiredInputs: [{ artifactId: 'storyboard.storyboard_prompt_pack', title: '故事板提示词包', stage: 'storyboard', artifactKey: 'storyboard_prompt_pack', content: 'x', satisfied: true }],
        optionalInputs: [],
        outputContract: { requiredArtifacts: [] },
        forbiddenActions: [],
        warnings: [],
        handoffRefs: [],
      }}
    />,
  );

  expect(html).toContain('已折叠');
  expect(html).toContain('必需 1 项');
});

it('does not render workspace copy-summary buttons for Segment prompts', () => {
  const html = renderToStaticMarkup(<SceneForgeStudio />);
  expect(html).not.toContain('data-testid="scene-workspace-copy"');
});

it('uses the real video_prompts core artifact count', () => {
  vi.stubGlobal('window', {
    electronAPI: {
      sceneGetProjectState: vi.fn().mockResolvedValue({
        entryPath: 'topic_gate',
        approvalPolicies: { video_prompts: 'required' },
        state: {
          currentStage: 'video_prompts',
          stages: { video_prompts: { status: 'approved' } },
        },
        artifacts: [
          { id: 'video_prompts.video_prompt_pack_cn', stage: 'video_prompts', kind: 'final', coreAsset: true, title: '中文包' },
          { id: 'video_prompts.video_prompt_review', stage: 'video_prompts', kind: 'final', coreAsset: true, title: '审查记录' },
          { id: 'video_prompts.video_prompt_trace', stage: 'video_prompts', kind: 'final', coreAsset: true, title: '溯源记录' },
        ],
      }),
      sceneGetStageContext: vi.fn().mockResolvedValue({
        stage: 'video_prompts',
        requiredInputs: [],
        optionalInputs: [],
        outputContract: { requiredArtifacts: [] },
        forbiddenActions: [],
        warnings: [],
        handoffRefs: [],
      }),
      sceneReadArtifact: vi.fn().mockResolvedValue({ content: '# x', displayModel: null }),
    },
  });
  const html = renderToStaticMarkup(<SceneForgeStudio projectDir="/tmp/sceneforge-project" />);
  expect(html).toContain('3 / 3');
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-artifact-copy-panel.test.tsx`

Expected: FAIL because the panel is still always expanded, the workspace still renders `scene-workspace-copy`, and the count still uses `2`.

- [ ] **Step 3: Add a focused disclosure component for stage inputs**

```tsx
// src/sceneforge/components/studio/SceneStageInputsDisclosure.tsx
interface SceneStageInputsDisclosureProps {
  title: string;
  summary: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function SceneStageInputsDisclosure({
  title,
  summary,
  defaultExpanded = false,
  children,
}: SceneStageInputsDisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <section>
      <button type="button" onClick={() => setExpanded((value) => !value)}>
        <strong>{title}</strong>
        <span>{summary}</span>
        <span>{expanded ? '收起' : '展开'}</span>
      </button>
      {expanded ? children : null}
    </section>
  );
}
```

- [ ] **Step 4: Update `SceneStageInputsPanel` and `SceneForgeStudio` to use folded inputs and remove duplicate copy summaries**

```tsx
const missingRequiredCount = stageContext.requiredInputs.filter(
  (input) => input.satisfied === false,
).length;

<SceneStageInputsDisclosure
  title="本阶段输入"
  summary={`必需 ${stageContext.requiredInputs.length} 项 · 可选 ${stageContext.optionalInputs.length} 项${missingRequiredCount > 0 ? ` · 缺失 ${missingRequiredCount} 项` : ' · 已折叠'}`}
  defaultExpanded={missingRequiredCount > 0}
>
  <InputGroup ... />
  <InputGroup ... />
</SceneStageInputsDisclosure>
```

```tsx
const CORE_EXPECTED_COUNTS: Partial<Record<SceneStageId, number>> = {
  design: 5,
  storyboard: 4,
  video_prompts: 3,
};

{/* remove this block entirely */}
{displayModel && selectedArtifact && selectedArtifact.stage === selectedStage ? (
  <ul className={styles.copyBlockSummary}>...</ul>
) : null}
```

- [ ] **Step 5: Keep Copy UI focused on pack-level blocks**

```tsx
const promptBlocks = blocksForTarget(displayModel.copyBlocks, 'prompt');
const sectionBlocks = blocksForTarget(displayModel.copyBlocks, 'section');

return (
  <div className={styles.panel}>
    {renderGroup('Copy Full', fullBlocks)}
    {promptBlocks.length > 0 ? renderGroup('Copy Prompt', promptBlocks) : null}
    {promptBlocks.length === 0 ? renderGroup('Copy Section', sectionBlocks) : null}
  </div>
);
```

- [ ] **Step 6: Run UI tests to verify the workspace is quieter**

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-artifact-copy-panel.test.tsx`

Expected: PASS; collapsed inputs render, `scene-workspace-copy` no longer appears, and copy groups prefer pack-level prompt blocks.

- [ ] **Step 7: Commit workspace and copy UI cleanup**

```bash
git add src/sceneforge/components/studio/SceneStageInputsDisclosure.tsx \
  src/sceneforge/components/studio/SceneStageInputsPanel.tsx \
  src/sceneforge/pages/SceneForgeStudio.tsx \
  src/sceneforge/components/artifacts/ArtifactCopyPanel.tsx \
  src/sceneforge/components/studio/SceneForgeStudioInspector.tsx \
  src/sceneforge/pages/SceneForgeStudio.module.css \
  tests/sceneforge-ui.test.tsx \
  tests/sceneforge-artifact-copy-panel.test.tsx
git commit -m "feat: simplify sceneforge workspace copy surfaces"
```

### Task 4: Separate support-stage light-confirmation structure from core-stage confirmation

**Files:**
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/components/workspace/SceneStageFlowActions.tsx`
- Modify: `src/sceneforge/hooks/useSceneStageContinuation.ts`
- Modify: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: Write failing UI tests for support-stage “light confirmation” framing**

```ts
it('keeps core stages on Validate + Continue flow', () => {
  const html = renderToStaticMarkup(<SceneForgeStudio />);
  expect(html).toContain('Validate');
  expect(html).toContain('Continue');
});

it('renders a distinct support-stage flow hint for light confirmation paths', () => {
  const html = renderToStaticMarkup(
    <SceneStageFlowActions
      canValidate={true}
      validatePassed={true}
      canContinue={true}
      onValidate={vi.fn()}
      onContinue={vi.fn()}
      stageMode="support_light"
    />,
  );
  expect(html).toContain('当前阶段为轻确认路径');
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `npx vitest run tests/sceneforge-ui.test.tsx -t "light confirmation"`

Expected: FAIL because `stageMode` and support-light hint do not exist.

- [ ] **Step 3: Add the smallest possible structural split without changing `Continue` semantics**

```tsx
// SceneStageFlowActions.tsx
export interface SceneStageFlowActionsProps {
  stageMode?: 'core_confirm' | 'support_light';
  ...
}

{stageMode === 'support_light' ? (
  <p className={styles.hint}>当前阶段为轻确认路径，后续可演进为“提交并继续”。</p>
) : null}
```

```tsx
// SceneForgeStudio.tsx
const flowStageMode =
  CORE_STUDIO_STAGES.has(selectedStage) ? 'core_confirm' : 'support_light';

<SceneStageFlowActions
  stageMode={flowStageMode}
  ...
/>
```

```ts
// useSceneStageContinuation.ts
export interface ContinueSceneStageInput {
  currentStage: SceneStageId;
  currentStatus: SceneStageStatus;
  mode: SceneContinuationMode;
  runnerType: SceneStageRunnerType;
  stageMode?: 'core_confirm' | 'support_light';
}
```

- [ ] **Step 4: Run UI tests to verify the split is in place without behavior regression**

Run: `npx vitest run tests/sceneforge-ui.test.tsx`

Expected: PASS; core paths still expose `Validate` + `Continue`, support paths now expose a dedicated structural hint for light-confirmation evolution.

- [ ] **Step 5: Run a focused typecheck and core regression suite**

Run: `npx tsc --noEmit`

Expected: PASS with no prop/type mismatches introduced by `stageMode`.

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-artifact-display-model.test.ts tests/sceneforge-validator.test.ts`

Expected: PASS; copy protocol, display parsing, and UI flow all remain green together.

- [ ] **Step 6: Commit the light-confirmation structure**

```bash
git add src/sceneforge/pages/SceneForgeStudio.tsx \
  src/sceneforge/components/workspace/SceneStageFlowActions.tsx \
  src/sceneforge/hooks/useSceneStageContinuation.ts \
  tests/sceneforge-ui.test.tsx
git commit -m "refactor: separate support light-confirmation flow"
```

## Self-Review

### Spec coverage

- `copy-block` 显式协议：Task 1
- Display Model 优先解析 `copy-block` + fallback：Task 2
- 本阶段输入默认折叠：Task 3
- 中间工作区去掉重复 copy 摘要：Task 3
- `video_prompts` 数量修正：Task 3
- support 阶段轻确认边界：Task 4

### Placeholder scan

- 没有 `TODO`、`TBD` 或“后续补充”式执行步骤。
- 每个任务都给了明确文件、命令和最小代码方向。

### Type consistency

- 新 helper 名统一为 `parseSceneCopyBlocks`
- 新 UI 模式统一为 `stageMode: 'core_confirm' | 'support_light'`
- `copy-block` 结构统一使用 `type / id / label / body`

## Verification Commands

- `npx vitest run tests/sceneforge-validator.test.ts -t "copy-block"`
- `npx vitest run tests/sceneforge-copy-blocks.test.ts tests/sceneforge-artifact-display-model.test.ts`
- `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-artifact-copy-panel.test.tsx`
- `npx tsc --noEmit`

## Risks

- prompt、validator、display model 三层若不同步，最容易出现假绿测试与真机复制错位。
- `SceneForgeStudio.tsx` 仍较大，实施时应优先提小 helper / 小组件，不要整块替换。
- support 阶段“轻确认”本轮只收结构，不要在同一补丁里顺手改成真正自动推进。

## Rollout Strategy

1. 先让 `video_prompts` / `storyboard` 产物能显式输出 `copy-block`
2. 再让 Display Model 优先消费新协议
3. 然后收口中间工作区和 Copy 面板
4. 最后只做 support 轻确认的结构边界，不做语义大翻转
