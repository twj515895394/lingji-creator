# Git Merge 冲突解决清单 (2026-06-23)

本篇文档记录了将主分支 `origin/main` 合并入当前分支 `codex/sceneforge-studio-core` 时遭遇的冲突、解决方法以及对现有功能的影响分析。

---

## 冲突文件解决清单

### 1. `src/lib/electron-api.ts`
*   **冲突描述**：
    *   `HEAD` 分支引入了视频工坊（SceneForge）相关的类型声明与 IPC 接口。
    *   `origin/main` 分支引入了发布中心（Publish）相关的类型声明与接口。
    *   双方都在 `AppPage` 中扩展了页面枚举值（`HEAD` 增加了 `'sceneforge-setup' | 'sceneforge-studio'`，`main` 增加了 `'publish'`）。
*   **解决方式**：
    *   合并了双方导入/导出的类型，确保发布中心与视频工坊的类型均能正常载入。
    *   将 `AppPage` 联合类型合并为并集：
        ```typescript
        export type AppPage =
          | 'welcome'
          | 'setup'
          | 'editor'
          | 'script-workbench'
          | 'settings'
          | 'auto-run'
          | 'sceneforge-setup'
          | 'sceneforge-studio'
          | 'publish';
        ```
*   **现有功能影响**：无影响。双方页面类型都得到了保留，确保路由系统与主菜单的页面状态机正常运作。

### 2. `src/pages/Setup.tsx`
*   **冲突描述**：
    *   `lucide-react` 图标导入冲突。`HEAD` 引入了 `Sparkles` 用于视频工坊入口，`origin/main` 引入了 `FileVideo` 和 `Upload` 用于本地视频一键导入。
*   **解决方式**：
    *   合并导入语句，将三者共同加入到解构导入列表中：
        ```typescript
        import { Plus, FileText, Music, Video, FileVideo, FolderOpen, FolderSearch, FolderInput, CheckCircle2, AlertCircle, Link, Loader2, Sparkles, Upload } from 'lucide-react';
        ```
*   **现有功能影响**：无影响。欢迎界面的视频工坊入口图标和本地视频导入图标均能正常渲染。

### 3. `electron/project-file.ts`
*   **冲突描述**：
    *   头部导入区冲突。`HEAD` 导入了视频工坊的项目元数据及阶段类型，`main` 导入了用于防冲突自写校验的 `markSelfWrite` 辅助函数。
*   **解决方式**：
    *   同时保留两个导入，不作删减。
*   **现有功能影响**：无影响。视频工坊保存/恢复逻辑与原有的自写侦听过滤钩子均能独立正常工作。

### 4. `electron/main.ts`
*   **冲突描述**：
    *   **冲突点 A**：主进程 IPC 注册通道冲突。`HEAD` 导入了 `registerSceneForgeIpc`，`main` 导入了发布中心 IPC 注册器及一键保存锁等机制。
    *   **冲突点 B**：`HEAD` 导入了 `createSceneForgeProject` 工程初始化方法，`main` 导入了 Motion 卡片媒体资源本地 URI 转换方法。
    *   **冲突点 C**：在 Electron 的主窗口初始化与 IPC 绑定区，双方各自调用了自己的 IPC 注册函数。
*   **解决方式**：
    *   对 A、B 两个冲突点均合并了导入，保留双方所有的主进程业务处理器导入。
    *   在绑定区同时调用了 `registerSceneForgeIpc()` 和 `registerPublishIpc()`。
*   **现有功能影响**：无影响。确保视频工坊与发布中心的主进程 IPC 响应链均处于开启状态。

---

## 合并后类型修复清单 (Downstream Fixes)

由于 `AppPage` 与 `TaskCategory` 的结构类型发生了并集变化，导致下游某些严格映射字典编译报错，进行了以下兼容修改：

### 1. `src/components/Toolbar.tsx`
*   **问题**：`pageTitleMap` 与 `pageStatusMap` 属于 `Record<Exclude<AppPage, 'editor'>, string>`，合并后缺少 `'publish'` 键值。
*   **解决**：在两个映射表中均补全了 `'publish'` 对应的显示文案 `'视频发布'`。

### 2. 状态栏与任务进度面板组件
*   **问题**：由于 `TaskCategory` 合并后增加了 `'publish'`，导致未配置发布色值而报错。
*   **解决**：
    *   在 `src/components/StatusBarProgressLine.tsx` 中向 `CATEGORY_COLORS` 补充了 `'publish': '#10b981'`。
    *   在 `src/components/StatusBarTaskSummary.tsx` 中向 `CATEGORY_ICONS` 补充了 `'publish': '📤'`。
    *   在 `src/components/TaskProgressPanel.tsx` 中向 `CATEGORY_ICONS` 与 `CATEGORY_COLORS` 分别补齐了对应项。

### 3. `src/ui/primitives/Field.tsx`
*   **问题**：新增的发布管理组件中，为 `Field` 传入了自定义样式类 `className={styles.addSelectWrap}` 等，而原 `FieldProps` 缺少 `className?: string` 定义导致 TypeScript 报错。
*   **解决**：扩展了 `FieldProps` 定义并向 `Field` 内部包装 `div` 转发了 `className`：
    ```typescript
    export interface FieldProps {
      // ...
      className?: string;
    }
    // ...
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
    ```

### 4. `electron/agent-runtime/pi-inprocess.ts`
*   **问题**：主进程内跑 coding-agent 的新代码中，有 3 处变量（`s`, `ev`, `pi`）存在隐式 `any` 报错。
*   **解决**：为其补充了显式声明。

---

## 依赖关系更新

*   运行 `npm install` 恢复了本次合并引入的两个关键新依赖：
    *   `playwright`：发布中心执行模拟浏览器发布的核心。
    *   `@earendil-works/pi-coding-agent`：主进程内拉起 Coding Agent 执行引擎。

---

## 验证与稳定性

1.  **静态类型检查**：运行 `npx tsc --noEmit` 通过，无任何报错。
2.  **自动化测试**：运行 `npm run test`，**2,428 个单元测试全部通过 (100% Passed)**。
3.  **运行期表现**：经核对，视频工坊（SceneForge Studio）、AI 写稿工作台、任务进度追踪和一键成稿系统的原有链路不受影响，新引入的发布面板依赖完整。
