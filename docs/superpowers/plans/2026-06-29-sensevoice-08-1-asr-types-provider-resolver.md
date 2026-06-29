# SenseVoice 08-1 ASR Types And Provider Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Remix 原片理解新增统一 ASR 类型系统与 Provider Resolver，使后续 SenseVoice / Whisper 切换不再依赖硬编码。

**Architecture:** 本计划先把“选择哪种 ASR 引擎”和“如何表达 ASR 能力”从具体 provider 实现中剥离出来。通过新增 `remix-asr-types.ts` 与 `remix-asr-provider-resolver.ts`，先稳定 engine/mode/timestampLevel/capabilities 契约，并用 resolver 统一表达 `auto`、强制 Whisper、强制 SenseVoice 和 fallback 规则，为后续 08-2/08-3/08-4 铺路。

**Tech Stack:** TypeScript, Electron main-process modules, Vitest

---

## File Structure

| File | Responsibility |
|------|----------------|
| `electron/sceneforge/remix/remix-asr-types.ts` | 定义统一 ASR engine、mode、timestampLevel、capabilities、resolver 输入输出类型 |
| `electron/sceneforge/remix/remix-asr-provider-resolver.ts` | 根据环境变量/显式选项/资源探测结果决定当前应使用的 ASR 路线 |
| `electron/sceneforge/remix/remix-transcript-types.ts` | 复用新建 ASR 类型，避免 transcript 类型继续硬编码 Whisper-only 枚举 |
| `tests/sceneforge-remix-asr-provider-resolver.test.ts` | 覆盖类型契约、resolver forced/auto/fallback 行为 |

## Task 1: 抽离统一 ASR 类型

**Files:**
- Create: `electron/sceneforge/remix/remix-asr-types.ts`
- Modify: `electron/sceneforge/remix/remix-transcript-types.ts`
- Test: `tests/sceneforge-remix-asr-provider-resolver.test.ts`

- [ ] **Step 1: 先写失败测试，锁定类型和 resolver 输出形状**

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMIX_ASR_ENGINE,
  resolveRemixAsrEnginePreference,
  type RemixAsrEngine,
} from '../electron/sceneforge/remix/remix-asr-provider-resolver';

describe('resolveRemixAsrEnginePreference', () => {
  it('defaults to auto when no explicit option or env is provided', () => {
    const result = resolveRemixAsrEnginePreference({});
    expect(result).toBe(DEFAULT_REMIX_ASR_ENGINE);
  });

  it('accepts funasr_sensevoice_gguf and local_whisper_cpp as explicit values', () => {
    const sensevoice = resolveRemixAsrEnginePreference({ preferredEngine: 'funasr_sensevoice_gguf' });
    const whisper = resolveRemixAsrEnginePreference({ preferredEngine: 'local_whisper_cpp' });

    expect(sensevoice).toBe('funasr_sensevoice_gguf');
    expect(whisper).toBe('local_whisper_cpp');
  });
});
```

- [ ] **Step 2: 运行单测确认当前会失败**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: FAIL，提示 `remix-asr-provider-resolver` 不存在，或导出的常量/函数未定义。

- [ ] **Step 3: 新建统一 ASR 类型文件**

```ts
export type RemixAsrEngine =
  | 'auto'
  | 'funasr_sensevoice_gguf'
  | 'local_whisper_cpp'
  | 'bcut'
  | 'imported_srt'
  | 'no_audio';

export type RemixAsrMode =
  | 'segment_audio_asr'
  | 'source_audio_asr'
  | 'imported_srt'
  | 'no_audio';

export type RemixAsrTimestampLevel =
  | 'none'
  | 'segment_range'
  | 'vad_segment'
  | 'sentence'
  | 'word';

export interface RemixAsrProviderCapabilities {
  engine: Exclude<RemixAsrEngine, 'auto'>;
  mode: RemixAsrMode;
  timestampLevel: RemixAsrTimestampLevel;
  canGenerateAccurateSrt: boolean;
  canProvideSegmentDialogue: boolean;
  supportsTags?: boolean;
  supportsEmotion?: boolean;
  supportsEvent?: boolean;
}
```

- [ ] **Step 4: 在 transcript 类型里复用新类型，不再手写 engine/mode 字面量**

```ts
import type {
  RemixAsrEngine,
  RemixAsrMode,
  RemixAsrTimestampLevel,
} from './remix-asr-types';

export interface RemixSourceTranscriptDocument {
  schema: 'sceneforge-remix-source-transcript';
  version: 1;
  sourceAssetId: string;
  language: string;
  engine: Exclude<RemixAsrEngine, 'auto'>;
  mode: Exclude<RemixAsrMode, 'source_audio_asr'> | 'full_source_asr';
  timestampLevel?: RemixAsrTimestampLevel;
  // 其余字段保持现状，避免本票引入非必要行为改动
}
```

- [ ] **Step 5: 重新运行测试，确认类型导出层通过**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: 仍有部分 FAIL，但错误收敛到 `resolveRemixAsrEnginePreference` 或 resolver 主逻辑未实现，而不是类型文件不存在。

- [ ] **Step 6: Commit**

```bash
git add electron/sceneforge/remix/remix-asr-types.ts \
  electron/sceneforge/remix/remix-transcript-types.ts \
  tests/sceneforge-remix-asr-provider-resolver.test.ts
git commit -m "feat(remix): add shared asr type contracts"
```

## Task 2: 实现 Engine Preference 解析

**Files:**
- Modify: `electron/sceneforge/remix/remix-asr-provider-resolver.ts`
- Test: `tests/sceneforge-remix-asr-provider-resolver.test.ts`

- [ ] **Step 1: 扩展测试，覆盖 env 和显式 preferredEngine 的优先级**

```ts
it('uses explicit preferredEngine before env', () => {
  process.env.REMIX_STT_ENGINE = 'local_whisper_cpp';

  const result = resolveRemixAsrEnginePreference({
    preferredEngine: 'funasr_sensevoice_gguf',
  });

  expect(result).toBe('funasr_sensevoice_gguf');
});

it('uses REMIX_STT_ENGINE when explicit preferredEngine is omitted', () => {
  process.env.REMIX_STT_ENGINE = 'local_whisper_cpp';
  expect(resolveRemixAsrEnginePreference({})).toBe('local_whisper_cpp');
});
```

- [ ] **Step 2: 运行单测确认新增断言失败**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: FAIL，提示 preference 解析函数未实现 env/显式优先级。

- [ ] **Step 3: 实现 Engine Preference 解析函数**

```ts
import type { RemixAsrEngine } from './remix-asr-types';

export const DEFAULT_REMIX_ASR_ENGINE: RemixAsrEngine = 'auto';

function isSupportedRemixAsrEngine(value: string): value is RemixAsrEngine {
  return [
    'auto',
    'funasr_sensevoice_gguf',
    'local_whisper_cpp',
    'bcut',
    'imported_srt',
    'no_audio',
  ].includes(value);
}

export function resolveRemixAsrEnginePreference(input: {
  preferredEngine?: RemixAsrEngine | null;
}): RemixAsrEngine {
  if (input.preferredEngine) {
    return input.preferredEngine;
  }

  const envValue = process.env.REMIX_STT_ENGINE?.trim();
  if (envValue && isSupportedRemixAsrEngine(envValue)) {
    return envValue;
  }

  return DEFAULT_REMIX_ASR_ENGINE;
}
```

- [ ] **Step 4: 运行测试确认 preference 层通过**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: PASS 当前已写断言；如果后续 resolver 决策测试已补充，则剩余失败应集中在资源 fallback 逻辑。

- [ ] **Step 5: Commit**

```bash
git add electron/sceneforge/remix/remix-asr-provider-resolver.ts \
  tests/sceneforge-remix-asr-provider-resolver.test.ts
git commit -m "feat(remix): resolve asr engine preference"
```

## Task 3: 实现 Resolver 的资源探测与 fallback 决策

**Files:**
- Modify: `electron/sceneforge/remix/remix-asr-provider-resolver.ts`
- Test: `tests/sceneforge-remix-asr-provider-resolver.test.ts`

- [ ] **Step 1: 增加 failing tests，锁定 auto / forced / fallback 行为**

```ts
it('falls back to local_whisper_cpp when auto mode cannot use sensevoice', async () => {
  const result = await resolveRemixAsrProviderPlan({
    preferredEngine: 'auto',
    probes: {
      sensevoice: async () => ({ available: false, reason: 'missing model' }),
      whisper: async () => ({ available: true }),
    },
  });

  expect(result.engine).toBe('local_whisper_cpp');
  expect(result.reason).toBe('sensevoice_unavailable_fallback_to_whisper');
});

it('throws when forced sensevoice is unavailable', async () => {
  await expect(
    resolveRemixAsrProviderPlan({
      preferredEngine: 'funasr_sensevoice_gguf',
      probes: {
        sensevoice: async () => ({ available: false, reason: 'missing model' }),
        whisper: async () => ({ available: true }),
      },
    }),
  ).rejects.toThrow('SenseVoice');
});
```

- [ ] **Step 2: 跑测试确认 fallback 决策尚未实现**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: FAIL，提示 `resolveRemixAsrProviderPlan` 未实现或返回结构不匹配。

- [ ] **Step 3: 实现 Resolver 主决策逻辑**

```ts
export interface RemixAsrAvailability {
  available: boolean;
  reason?: string;
}

export interface RemixAsrProviderPlan {
  engine: Exclude<RemixAsrEngine, 'auto'>;
  reason:
    | 'forced_sensevoice'
    | 'forced_whisper'
    | 'auto_sensevoice_available'
    | 'sensevoice_unavailable_fallback_to_whisper'
    | 'no_audio';
}

export async function resolveRemixAsrProviderPlan(input: {
  preferredEngine?: RemixAsrEngine | null;
  hasAudio?: boolean;
  probes: {
    sensevoice: () => Promise<RemixAsrAvailability>;
    whisper: () => Promise<RemixAsrAvailability>;
  };
}): Promise<RemixAsrProviderPlan> {
  if (input.hasAudio === false) {
    return { engine: 'no_audio', reason: 'no_audio' };
  }

  const preferred = resolveRemixAsrEnginePreference({
    preferredEngine: input.preferredEngine ?? null,
  });

  if (preferred === 'local_whisper_cpp') {
    return { engine: 'local_whisper_cpp', reason: 'forced_whisper' };
  }

  if (preferred === 'funasr_sensevoice_gguf') {
    const sensevoice = await input.probes.sensevoice();
    if (!sensevoice.available) {
      throw new Error(`SenseVoice 不可用：${sensevoice.reason ?? 'unknown reason'}`);
    }
    return { engine: 'funasr_sensevoice_gguf', reason: 'forced_sensevoice' };
  }

  const sensevoice = await input.probes.sensevoice();
  if (sensevoice.available) {
    return { engine: 'funasr_sensevoice_gguf', reason: 'auto_sensevoice_available' };
  }

  const whisper = await input.probes.whisper();
  if (whisper.available) {
    return { engine: 'local_whisper_cpp', reason: 'sensevoice_unavailable_fallback_to_whisper' };
  }

  throw new Error(
    `未找到可用的 Remix ASR Provider：SenseVoice=${sensevoice.reason ?? 'unavailable'}，Whisper=${whisper.reason ?? 'unavailable'}`,
  );
}
```

- [ ] **Step 4: 跑 resolver 单测确认 PASS**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts`

Expected: PASS

- [ ] **Step 5: 顺手回归现有 transcript / orchestrator 测试，确认本票未破坏旧行为**

Run: `npx vitest run tests/sceneforge-remix-transcript.test.ts tests/sceneforge-remix-understanding-orchestrator.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron/sceneforge/remix/remix-asr-provider-resolver.ts \
  tests/sceneforge-remix-asr-provider-resolver.test.ts \
  electron/sceneforge/remix/remix-transcript-types.ts
git commit -m "feat(remix): add asr provider resolver"
```

## Task 4: 收口导出与实现边界说明

**Files:**
- Modify: `electron/sceneforge/remix/remix-service.ts`
- Modify: `docs/sceneforge-remix/sensevoice-asr-integration-design.md`
- Test: `tests/sceneforge-remix-asr-provider-resolver.test.ts`

- [ ] **Step 1: 写一个最小 failing test，确认 resolver 模块可被主流程依赖但尚未改动主流程行为**

```ts
it('exports a resolver plan that future transcript service can consume', async () => {
  const result = await resolveRemixAsrProviderPlan({
    preferredEngine: 'auto',
    probes: {
      sensevoice: async () => ({ available: true }),
      whisper: async () => ({ available: true }),
    },
  });

  expect(result.engine).toBe('funasr_sensevoice_gguf');
});
```

- [ ] **Step 2: 如果需要，在 `remix-service.ts` 或同层入口增加只读导出，不触发行为切换**

```ts
export {
  DEFAULT_REMIX_ASR_ENGINE,
  resolveRemixAsrEnginePreference,
  resolveRemixAsrProviderPlan,
} from './remix-asr-provider-resolver';
```

- [ ] **Step 3: 在设计文档相应章节补一行“08-1 已落地的边界”说明**

```md
- 08-1 仅引入类型系统与 resolver，不切换 `RemixTranscriptService` 默认行为；
- 真正默认切换发生在 08-4。
```

- [ ] **Step 4: 跑本票全部测试**

Run: `npx vitest run tests/sceneforge-remix-asr-provider-resolver.test.ts tests/sceneforge-remix-transcript.test.ts tests/sceneforge-remix-understanding-orchestrator.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/sceneforge/remix/remix-service.ts \
  electron/sceneforge/remix/remix-asr-provider-resolver.ts \
  docs/sceneforge-remix/sensevoice-asr-integration-design.md \
  tests/sceneforge-remix-asr-provider-resolver.test.ts
git commit -m "docs(remix): clarify issue 08-1 resolver boundary"
```

## Self-Review

- `08-1` 的范围只到“类型 + resolver + fallback 规则”，不提前实现 SenseVoice provider、本地 binary 调用或 segment transcript 写盘。
- 所有计划步骤都落在已存在目录下，没有引入 08-2/08-3 才应该出现的文件。
- 回归测试只覆盖 resolver 不应破坏的既有 transcript/orchestrator 测试集，符合“小票先稳边界”的目标。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-sensevoice-08-1-asr-types-provider-resolver.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
