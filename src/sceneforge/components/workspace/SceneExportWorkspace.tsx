import { useCallback, useState } from 'react';
import { Button } from '../../../ui/components/button';
import styles from './SceneExportWorkspace.module.css';

export interface SceneExportWorkspaceProps {
  projectDir: string | null;
  onExported?: (result: { exportDir: string; manifestPath: string; artifactIds: string[] }) => void;
  onError?: (message: string) => void;
}

export function SceneExportWorkspace({ projectDir, onExported, onError }: SceneExportWorkspaceProps) {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{
    exportDir: string;
    manifestPath: string;
    artifactIds: string[];
  } | null>(null);

  const handleExport = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneExportPromptPack) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    setBusy(true);
    try {
      const result = await window.electronAPI.sceneExportPromptPack(projectDir);
      setLastResult(result);
      onExported?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '导出失败');
    } finally {
      setBusy(false);
    }
  }, [onError, onExported, projectDir]);

  return (
    <section className={styles.root} data-testid="scene-export-workspace">
      <p className={styles.lead}>
        将已通过校验的核心 final 产物汇总为导出清单，写入项目目录下的导出文件夹，便于外发或备份。
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={busy || !projectDir}
        onClick={() => void handleExport()}
      >
        {busy ? '导出中…' : '导出核心产物包'}
      </Button>
      {lastResult ? (
        <dl className={styles.result} data-testid="scene-export-result">
          <div>
            <dt>目录</dt>
            <dd className={styles.path}>{lastResult.exportDir}</dd>
          </div>
          <div>
            <dt>清单</dt>
            <dd className={styles.path}>{lastResult.manifestPath}</dd>
          </div>
          <div>
            <dt>产物数</dt>
            <dd>{lastResult.artifactIds.length}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}