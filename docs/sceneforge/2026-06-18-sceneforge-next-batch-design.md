# SceneForge 下一批（P1–P4）— 详细设计

> 日期：2026-06-18  
> 状态：已定稿（与实现 06–09 对齐）  
> PRD：`.scratch/sceneforge-next-batch/PRD.md`  
> 前置：ADR-0002、`docs/sceneforge/2026-06-18-sceneforge-mvp-pipeline-closure-design.md`

## 1. 范围

| 优先级 | 能力 | issue |
| --- | --- | --- |
| P1 | Core MVP 占位：storyboard（4 key）、video_prompts（2 key） | 06 |
| P2 | handoff / 验收清单 | 07 |
| P3 | Direct LLM 未配置引导 | 08 |
| P4 | 制作链支撑：script、performance、audio | 09 |

## 2. 产物契约（引擎对齐）

### 2.1 制作链支撑（P4）

| stage | artifactKey | manifest id |
| --- | --- | --- |
| script | `script_draft` | `script.script_draft` |
| performance | `performance_direction` | `performance.performance_direction` |
| audio | `audio_design` | `audio.audio_design` |

写入规则同 ADR-0002：`submitSupportStageDraft`、`role: support_direction_asset`。

### 2.2 Core MVP 占位（P1）

| stage | 必填 keys | 占位特殊规则 |
| --- | --- | --- |
| design | 5（已有） | 通用 `# MVP 占位` |
| storyboard | 4 | 通用占位 |
| video_prompts | 2 | 正文须含 **Segment** 与 **Audio**（满足 `validators.video-prompts.ts` 语义校验） |

组件：`SceneCoreMvpPlaceholder`；Studio 对 `CORE_STUDIO_STAGES` 均展示按钮。

### 2.3 依赖链（验收顺序）

```text
… → design → script → performance → storyboard → audio → video_prompts → export
```

## 3. Studio 路由

- `MARKDOWN_SUPPORT_SUBMIT_STAGES` = prep（reference/story/assets）+ production（script/performance/audio）
- `ScenePrepSupportWorkspace` 泛化 stage 类型
- `SUPPORT_SUBMIT_STAGES` 含 intake/gate + 上述六阶段 → `SceneStageFlowActions`

`scene-stage-capabilities`：script/performance/audio → `studio` + `support` 模板。

## 4. P3 行为

`StageRunPanel.extractErrorMessage`：检测 `SCENE_DIRECT_LLM_NO_SETTINGS` 或「未找到应用 LLM 设置」，追加「设置 → AI」文案。

## 5. 测试

- `tests/sceneforge-core-mvp-placeholder.test.ts`
- `tests/sceneforge-support-submit.test.ts` 扩展 script/performance/audio
- `tests/sceneforge-workspace-routing.test.ts` 扩展 production support

## 6. 非目标

见 PRD；P5 见 issue 10。