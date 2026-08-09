# SceneForge Topic Intent Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `topic_gate` 中新增“创作意图检查”前置闸门，用独立 LLM 检查链路拦截信息不足的创作意图，并在未通过时给出缺失项与补充建议提示，只有检查通过后才解锁“分析选题”。

**Architecture:** 沿用现有 `topic_gate` 的 Markdown artifact + Electron IPC + renderer workspace 三层结构，新增 `intent_check` artifact、独立 checker analyzer 和独立 UI 检查面板。通过 `intentHash` 将 `topic_brief` 与 `intent_check` 绑定，确保用户修改文本后旧结果立即失效。

**Tech Stack:** React、TypeScript、Electron IPC、现有 SceneForge artifact store、现有 Direct LLM provider 管线、Vitest

---

## 实施范围总览

### 目标模块

1. `Topic Brief Form`
   - 负责多行创作意图输入、保存、回填与本地失效状态触发
2. `Topic Intent Check`
   - 负责独立 LLM 检查、缺失项判断、建议提示生成和 artifact 落盘
3. `Topic Gate Workspace Orchestration`
   - 负责把 `topic_brief`、`intent_check`、`topic_analysis` 串成严格顺序
4. `Contracts & Parsing`
   - 负责 `intent_check` 的 IPC、Markdown、解析与过期规则
5. `Validation & Tests`
   - 负责回归现有 `topic_gate` 不崩、检查通过前分析被锁住、修改后状态失效

### 计划输出

1. 一组代码改动，覆盖 UI / IPC / service / parsing / tests
2. 一组可直接被 `to-prd` 吸收的模块决策
3. 一组可直接被 `to-issues` 拆成垂直切片的问题建议

## 文件结构

### 预计修改

- Modify: `src/sceneforge/components/workspace/SceneGateBriefForm.tsx`
- Modify: `src/sceneforge/components/workspace/SceneStageBriefForms.module.css`
- Modify: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.module.css`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/lib/topic-gate-form.ts`
- Modify: `src/sceneforge/lib/scene-hitl-markdown.ts`
- Modify: `src/lib/electron-api.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/sceneforge/scene-ipc-types.ts`
- Modify: `electron/sceneforge/ipc.ts`
- Modify: `electron/sceneforge/service.ts`
- Modify: `tests/sceneforge-topic-gate-form.test.ts`
- Modify: `tests/sceneforge-hitl-markdown.test.ts`
- Modify: `tests/sceneforge-service.test.ts`
- Modify: `tests/sceneforge-ipc-contract.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`
- Modify: `tests/sceneforge-card-hitl-ui.test.tsx`

### 预计新增

- Create: `src/sceneforge/components/workspace/SceneTopicIntentCheckPanel.tsx`
- Create: `electron/sceneforge/topic-intent-check.ts`
- Create: `tests/sceneforge-topic-intent-check.test.ts`

### 模块职责边界

1. `SceneGateBriefForm`
   - 只负责 brief 输入和保存，不负责 LLM 判断
2. `SceneTopicIntentCheckPanel`
   - 只负责检查意图与展示补充建议，不负责评分分析
3. `SceneGateAnalysisPanel`
   - 只负责分析选题，在前置检查未通过时解释为什么不能分析
4. `topic-intent-check.ts`
   - 只负责 checker prompt、结构化返回、Markdown 产物生成
5. `scene-hitl-markdown.ts`
   - 负责 `intent_check` 的构建与解析，不做业务决策

## Task 1: 定义 `intent_check` 契约与解析

**Files:**
- Modify: `src/sceneforge/lib/topic-gate-form.ts`
- Modify: `src/sceneforge/lib/scene-hitl-markdown.ts`
- Modify: `electron/sceneforge/scene-ipc-types.ts`
- Modify: `src/lib/electron-api.ts`
- Test: `tests/sceneforge-topic-gate-form.test.ts`
- Test: `tests/sceneforge-hitl-markdown.test.ts`

- [ ] **Step 1: 先为多行创作意图和 `intent_check` 解析写失败测试**

```ts
it('parses multiline intent from topic brief markdown', () => {
  const markdown = `# 选题简报

## 创作意图
第一行：讲一个婚礼现场突然翻车的爆笑桥段。
第二行：核心是新郎强装镇定、新娘闺蜜疯狂补救。
第三行：整体要偏夸张喜剧。

## 成片规格
total_duration_sec: 60
segment_duration_sec: 8
`;

  expect(parseTopicBriefForm(markdown).intent).toContain('第一行');
  expect(parseTopicBriefForm(markdown).intent).toContain('第三行');
});

it('parses topic intent check markdown with suggestions', () => {
  const markdown = `# 创作意图检查

status: needs_more
intent_hash: abc123
summary: 当前描述还不足以稳定推导整段视频方向。

## 缺失项
- id: narrative_hook | label: 改编角度 / 叙事抓手 | reason: 没写从哪个切口讲

## 补充建议
- dimension_id: narrative_hook | tip: 你最想放大的冲突、反差或情绪点是什么？
- dimension_id: narrative_hook | tip: 如果只能保留一个记忆点，希望观众记住什么？
`;

  const result = parseTopicIntentCheckFromMarkdown(markdown);
  expect(result.status).toBe('needs_more');
  expect(result.missingDimensions[0]?.id).toBe('narrative_hook');
  expect(result.suggestions[0]?.tips).toHaveLength(2);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-topic-gate-form.test.ts tests/sceneforge-hitl-markdown.test.ts`
Expected: FAIL，提示多行 intent 尚未完整回填，且 `parseTopicIntentCheckFromMarkdown` / `buildTopicIntentCheckMarkdown` 尚不存在。

- [ ] **Step 3: 最小实现多行 intent 与 intent_check Markdown 契约**

```ts
export interface SceneTopicIntentCheckState {
  status: 'pass' | 'needs_more' | 'stale' | 'unknown';
  summary: string | null;
  intentHash: string | null;
  missingDimensions: Array<{ id: string; label: string; reason: string }>;
  suggestions: Array<{ dimensionId: string; tips: string[] }>;
}

export function buildTopicIntentCheckMarkdown(input: {
  status: 'pass' | 'needs_more';
  summary: string;
  intentHash: string;
  missingDimensions: Array<{ id: string; label: string; reason: string }>;
  suggestions: Array<{ dimensionId: string; tips: string[] }>;
}): string {
  const missingLines =
    input.missingDimensions.length > 0
      ? input.missingDimensions
          .map((item) => `- id: ${item.id} | label: ${item.label} | reason: ${item.reason}`)
          .join('\n')
      : '- 无';
  const suggestionLines =
    input.suggestions.length > 0
      ? input.suggestions
          .flatMap((item) => item.tips.map((tip) => `- dimension_id: ${item.dimensionId} | tip: ${tip}`))
          .join('\n')
      : '- 无';

  return `# 创作意图检查

status: ${input.status}
intent_hash: ${input.intentHash}
summary: ${input.summary}

## 缺失项
${missingLines}

## 补充建议
${suggestionLines}
`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-topic-gate-form.test.ts tests/sceneforge-hitl-markdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sceneforge/lib/topic-gate-form.ts src/sceneforge/lib/scene-hitl-markdown.ts electron/sceneforge/scene-ipc-types.ts src/lib/electron-api.ts tests/sceneforge-topic-gate-form.test.ts tests/sceneforge-hitl-markdown.test.ts
git commit -m "feat: add topic intent check contract"
```

## Task 2: 实现独立的 Topic Intent Checker 后端链路

**Files:**
- Create: `electron/sceneforge/topic-intent-check.ts`
- Modify: `electron/sceneforge/service.ts`
- Modify: `electron/sceneforge/ipc.ts`
- Modify: `electron/preload.ts`
- Modify: `src/lib/electron-api.ts`
- Test: `tests/sceneforge-topic-intent-check.test.ts`
- Test: `tests/sceneforge-service.test.ts`
- Test: `tests/sceneforge-ipc-contract.test.ts`

- [ ] **Step 1: 先为 checker analyzer 与 service 写失败测试**

```ts
it('returns missing dimensions and suggestions when intent is too thin', async () => {
  const checker = createTopicIntentDirectLlmChecker({
    loadSettings: async () => mockSettings,
    generateText: async () =>
      JSON.stringify({
        status: 'needs_more',
        summary: '当前描述太薄。',
        missingDimensions: [
          {
            id: 'style_direction',
            label: '目标画面或风格倾向',
            reason: '没有说明偏动画还是实拍',
          },
        ],
        suggestions: [
          {
            dimensionId: 'style_direction',
            tips: ['更偏动画、实拍、纪实、夸张喜剧还是治愈感？'],
          },
        ],
      }),
  });

  const result = await checker.check({
    topicBriefMarkdown: '# 选题简报\n\n## 创作意图\n做个有意思的视频',
  });

  expect(result.artifactKey).toBe('intent_check');
  expect(result.content).toContain('style_direction');
  expect(result.content).toContain('更偏动画、实拍、纪实');
});

it('writes topic_gate.intent_check artifact through service', async () => {
  const result = await service.checkTopicIntent({ projectDir: tmpDir });
  expect(result.artifactKey).toBe('intent_check');
  expect(result.content).toContain('# 创作意图检查');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-topic-intent-check.test.ts tests/sceneforge-service.test.ts tests/sceneforge-ipc-contract.test.ts`
Expected: FAIL，提示 checker 文件、service 方法和 IPC 合约尚不存在。

- [ ] **Step 3: 实现独立 checker、service、IPC 与 preload 暴露**

```ts
export interface SceneTopicIntentCheckResult {
  artifactKey: 'intent_check';
  content: string;
}

export class SceneTopicIntentCheckerError extends Error {
  code:
    | 'SCENE_TOPIC_INTENT_NO_SETTINGS'
    | 'SCENE_TOPIC_INTENT_NO_MODEL'
    | 'SCENE_TOPIC_INTENT_PARSE_FAILED'
    | 'SCENE_TOPIC_INTENT_MISSING_FIELDS';
}

export function createTopicIntentDirectLlmChecker(deps: SceneTopicIntentCheckerDeps) {
  return {
    async check(input: SceneTopicIntentCheckInput): Promise<SceneTopicIntentCheckResult> {
      const intentHash = createHash('sha1')
        .update(input.topicBriefMarkdown.trim(), 'utf8')
        .digest('hex');

      const raw = await deps.generateText(settings, systemPrompt, userPrompt);
      const parsed = parseLLMJsonResponse(raw) as Record<string, unknown>;

      return {
        artifactKey: 'intent_check',
        content: buildTopicIntentCheckMarkdown({
          status: parsed.status === 'pass' ? 'pass' : 'needs_more',
          summary: String(parsed.summary ?? ''),
          intentHash,
          missingDimensions: normalizeMissingDimensions(parsed.missingDimensions),
          suggestions: normalizeSuggestions(parsed.suggestions),
        }),
      };
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-topic-intent-check.test.ts tests/sceneforge-service.test.ts tests/sceneforge-ipc-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/sceneforge/topic-intent-check.ts electron/sceneforge/service.ts electron/sceneforge/ipc.ts electron/preload.ts src/lib/electron-api.ts tests/sceneforge-topic-intent-check.test.ts tests/sceneforge-service.test.ts tests/sceneforge-ipc-contract.test.ts
git commit -m "feat: add sceneforge topic intent checker"
```

## Task 3: 增加 Topic Intent Check UI 面板与 3 行输入框

**Files:**
- Create: `src/sceneforge/components/workspace/SceneTopicIntentCheckPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateBriefForm.tsx`
- Modify: `src/sceneforge/components/workspace/SceneStageBriefForms.module.css`
- Modify: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.module.css`
- Test: `tests/sceneforge-card-hitl-ui.test.tsx`
- Test: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: 先写 UI 失败测试，覆盖 3 行输入、建议提示和分析禁用**

```tsx
it('renders topic intent textarea and check panel entry', () => {
  const html = renderToStaticMarkup(
    <SceneGateBriefForm projectDir="/tmp/project" initialMarkdown="# 选题简报" />,
  );

  expect(html).toContain('textarea');
  expect(html).toContain('创作意图');
});

it('renders missing dimension suggestions when intent check fails', () => {
  const html = renderToStaticMarkup(
    <SceneTopicIntentCheckPanel
      projectDir="/tmp/project"
      topicBriefMarkdown="# 选题简报"
      initialCheckMarkdown={`# 创作意图检查

status: needs_more
intent_hash: abc
summary: 信息不足

## 缺失项
- id: narrative_hook | label: 改编角度 / 叙事抓手 | reason: 没有切口

## 补充建议
- dimension_id: narrative_hook | tip: 你最想放大的冲突、反差或情绪点是什么？
`}
    />,
  );

  expect(html).toContain('改编角度 / 叙事抓手');
  expect(html).toContain('你最想放大的冲突、反差或情绪点是什么？');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-card-hitl-ui.test.tsx tests/sceneforge-ui.test.tsx`
Expected: FAIL，提示 `SceneTopicIntentCheckPanel` 不存在，且当前简报表单仍然是单行输入。

- [ ] **Step 3: 实现 textarea、检查面板和建议提示展示**

```tsx
<label className={styles.field}>
  <span className={styles.label}>创作意图</span>
  <textarea
    className={styles.textareaIntent}
    rows={3}
    placeholder="用 2-4 句写清楚你想讲什么、想做成什么感觉、从哪个切口展开"
    value={form.intent}
    onChange={(e) => {
      const nextIntent = e.target.value;
      setForm((f) => ({ ...f, intent: nextIntent }));
      onIntentDirtyChange?.(true);
    }}
  />
</label>
```

```tsx
{checkState.status === 'needs_more' ? (
  <Alert
    variant="warning"
    title="还不能分析选题"
    description={checkState.summary ?? '当前描述还不足以稳定推导整段视频方向。'}
  />
) : null}

<ul className={styles.missingDimensionList}>
  {checkState.missingDimensions.map((item) => (
    <li key={item.id}>
      <strong>{item.label}</strong>
      <p>{item.reason}</p>
      <ul>
        {(suggestionMap.get(item.id) ?? []).map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </li>
  ))}
</ul>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-card-hitl-ui.test.tsx tests/sceneforge-ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sceneforge/components/workspace/SceneTopicIntentCheckPanel.tsx src/sceneforge/components/workspace/SceneGateBriefForm.tsx src/sceneforge/components/workspace/SceneStageBriefForms.module.css src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx src/sceneforge/components/workspace/SceneGateAnalysisPanel.module.css tests/sceneforge-card-hitl-ui.test.tsx tests/sceneforge-ui.test.tsx
git commit -m "feat: add topic intent check workspace ui"
```

## Task 4: 串联 Studio 状态与“修改后失效”规则

**Files:**
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneTopicIntentCheckPanel.tsx`
- Test: `tests/sceneforge-ui.test.tsx`
- Test: `tests/sceneforge-card-hitl-ui.test.tsx`

- [ ] **Step 1: 先写失败测试，覆盖“检查通过后可分析、修改后失效”**

```tsx
it('keeps analyze button disabled until topic intent check passes', () => {
  const html = renderToStaticMarkup(
    <SceneGateAnalysisPanel
      projectDir="/tmp/project"
      topicBriefMarkdown="# 选题简报"
      intentCheckStatus="needs_more"
      intentCheckStale={false}
    />,
  );

  expect(html).toContain('请先补齐缺失信息');
});

it('shows stale hint after intent changes', () => {
  const html = renderToStaticMarkup(
    <SceneTopicIntentCheckPanel
      projectDir="/tmp/project"
      topicBriefMarkdown="# 选题简报"
      initialCheckMarkdown="# 创作意图检查\n\nstatus: pass\nintent_hash: old"
      stale={true}
    />,
  );

  expect(html).toContain('你已修改创作意图，请重新检查');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-card-hitl-ui.test.tsx`
Expected: FAIL，提示 `SceneGateAnalysisPanel` 还未接入检查状态与失效规则。

- [ ] **Step 3: 在 `SceneForgeStudio` 中编排 `topic_brief → intent_check → topic_analysis`**

```tsx
const [intentCheckMarkdown, setIntentCheckMarkdown] = useState('');
const [intentDirtySinceLastCheck, setIntentDirtySinceLastCheck] = useState(false);

const intentCheck = useMemo(
  () => parseTopicIntentCheckFromMarkdown(intentCheckMarkdown),
  [intentCheckMarkdown],
);

const intentCheckStale =
  intentDirtySinceLastCheck ||
  (intentCheck.intentHash !== null &&
    intentCheck.intentHash !== createTopicIntentHash(topicBriefMarkdown));

const intentCheckPassed = intentCheck.status === 'pass' && !intentCheckStale;
```

```tsx
<SceneTopicIntentCheckPanel
  projectDir={projectDir}
  topicBriefMarkdown={topicBriefMarkdown}
  initialCheckMarkdown={intentCheckMarkdown}
  stale={intentCheckStale}
  onChecked={() => {
    setIntentDirtySinceLastCheck(false);
    void refreshProjectState();
  }}
/>

<SceneGateAnalysisPanel
  projectDir={projectDir}
  topicBriefMarkdown={topicBriefMarkdown}
  initialAnalysisMarkdown={topicAnalysisMarkdown}
  intentCheckStatus={intentCheckPassed ? 'pass' : 'needs_more'}
  intentCheckStale={intentCheckStale}
/>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-card-hitl-ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sceneforge/pages/SceneForgeStudio.tsx src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx src/sceneforge/components/workspace/SceneTopicIntentCheckPanel.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-card-hitl-ui.test.tsx
git commit -m "feat: gate topic analysis behind intent check"
```

## Task 5: 全链路回归与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md`（如实施中发现决策偏差再回写）
- Modify: `docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md`（仅在计划执行过程中记录偏差时更新）
- Test: `tests/sceneforge-topic-gate-form.test.ts`
- Test: `tests/sceneforge-hitl-markdown.test.ts`
- Test: `tests/sceneforge-topic-intent-check.test.ts`
- Test: `tests/sceneforge-service.test.ts`
- Test: `tests/sceneforge-ipc-contract.test.ts`
- Test: `tests/sceneforge-card-hitl-ui.test.tsx`
- Test: `tests/sceneforge-ui.test.tsx`

- [ ] **Step 1: 运行 topic gate 相关完整测试集**

Run: `npx vitest run tests/sceneforge-topic-gate-form.test.ts tests/sceneforge-hitl-markdown.test.ts tests/sceneforge-topic-intent-check.test.ts tests/sceneforge-topic-gate-llm-analysis.test.ts tests/sceneforge-service.test.ts tests/sceneforge-ipc-contract.test.ts tests/sceneforge-card-hitl-ui.test.tsx tests/sceneforge-ui.test.tsx`
Expected: PASS

- [ ] **Step 2: 人工检查关键交互**

Run: `npm run dev`
Expected:
- `topic_gate` 中“创作意图”显示为 3 行输入框
- 保存后可以点击“检查意图”
- 未通过时出现缺失项和建议提示
- 未通过时“分析选题”禁用且有明确原因
- 修改文本后出现“请重新检查”的过期提示

- [ ] **Step 3: 更新实现偏差记录（如有）**

```md
## 实施偏差记录

- 若 checker 返回字段和设计稿略有调整，在 spec 中同步更新最终契约
- 若 UI 为适配现有工作区做了轻微样式调整，在 spec 中同步说明
```

- [ ] **Step 4: 最终提交**

```bash
git add docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md
git commit -m "docs: finalize topic intent check design and plan"
```

## PRD 对齐输入

下面这些内容可直接被后续 `to-prd` 吸收进“实现决策 / 测试决策”：

### 建议的深模块

1. `Topic Intent Checker`
   - 简单接口：输入 `topic_brief`，输出 `intent_check`
   - 封装大量 LLM prompt、字段校验、建议提示归一化逻辑
2. `Topic Gate State Orchestrator`
   - 简单接口：决定当前 `topic_gate` 能否分析、为什么不能分析、是否已过期
   - 封装 `topic_brief`、`intent_check`、`topic_analysis` 三者依赖关系
3. `Topic Intent Check Presenter`
   - 简单接口：接收检查状态，输出缺失项、建议提示和解锁文案
   - 封装全部用户态 copy 与展示逻辑

### 推荐测试决策

1. 重点测外部行为，不测内部 hook 细节
2. 重点模块：
   - `topic-gate-form`
   - `scene-hitl-markdown`
   - `topic-intent-check` checker/service
   - `SceneTopicIntentCheckPanel`
   - `SceneGateAnalysisPanel`
3. 参考先例：
   - `tests/sceneforge-topic-gate-llm-analysis.test.ts`
   - `tests/sceneforge-card-hitl-ui.test.tsx`
   - `tests/sceneforge-ui.test.tsx`
   - `tests/sceneforge-service.test.ts`

## Issue 切片建议

下面的切片粒度适合后续交给 `to-issues` 转成垂直切片 issue。

1. **标题**：Topic Gate 多行创作意图输入与本地失效态
   - **类型**：AFK
   - **被阻塞于**：无
   - **覆盖的用户故事**：用户可以更自然地写创作意图；修改后系统知道旧检查结果已失效

2. **标题**：SceneForge Topic Intent Checker 后端链路
   - **类型**：AFK
   - **被阻塞于**：无
   - **覆盖的用户故事**：系统能判断创作意图是否足够，并返回缺失项与建议提示

3. **标题**：Topic Gate 检查结果展示与分析解锁联动
   - **类型**：AFK
   - **被阻塞于**：1、2
   - **覆盖的用户故事**：用户能看到为什么还不能分析，以及补什么才能继续

4. **标题**：Topic Gate 全链路回归与产品文案校准
   - **类型**：HITL
   - **被阻塞于**：1、2、3
   - **覆盖的用户故事**：最终交互语气、建议提示质量和禁用原因说明达到产品预期

## 自检结果

### Spec 覆盖

已覆盖 spec 中以下关键要求：

1. 3 行输入框
2. 独立 `检查意图` 按钮
3. 缺失项列表
4. 建议提示
5. 分析选题硬性解锁
6. 修改后失效
7. 旧项目兼容
8. LLM 独立 checker 链路

### Placeholder 扫描

本计划未使用任何未落地的占位语。

### 类型一致性

计划中统一使用以下命名：

1. `intent_check`
2. `SceneTopicIntentCheckPanel`
3. `createTopicIntentDirectLlmChecker`
4. `parseTopicIntentCheckFromMarkdown`
5. `buildTopicIntentCheckMarkdown`

Plan complete and saved to `docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
