import { useState } from 'react';
import { Button } from '../../../ui';

export interface SegmentClipActionsPanelProps {
  projectDir: string;
  sourceAssetId: string;
  activeSegmentId?: string | null;
  disabled?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export function SegmentClipActionsPanel({
  projectDir,
  sourceAssetId,
  activeSegmentId = null,
  disabled = false,
  onRefresh,
}: SegmentClipActionsPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const api = window.sceneForgeRemixSegmentClips;

  async function run(label: string, fn: () => Promise<void>) {
    if (!api) {
      setMessage('片段文件操作 API 尚未就绪，请重启应用后重试。');
      return;
    }
    setPending(label);
    setMessage(null);
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '片段操作失败。');
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      <Button
        variant="outline"
        disabled={disabled || Boolean(pending)}
        onClick={() => {
          void run('export', async () => {
            const result = await api!.exportSourceSegmentClips({ projectDir, sourceAssetId });
            setMessage(`已导出 ${result.exportedCount}/${result.totalCount} 个片段：${result.outputDir}`);
            window.electronAPI?.showItemInFolder?.(result.manifestPath);
          });
        }}
      >
        {pending === 'export' ? '导出中…' : '导出全部片段'}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || Boolean(pending)}
        onClick={() => {
          void run('regenerate', async () => {
            const result = await api!.regenerateSourceSegmentClips({ projectDir, sourceAssetId });
            setMessage(`已重新生成 ${result.clipGeneration.successCount}/${result.clipGeneration.totalCount} 个片段。`);
            await onRefresh?.();
          });
        }}
      >
        {pending === 'regenerate' ? '生成中…' : '重新生成片段'}
      </Button>
      <Button
        variant="outline"
        disabled={disabled || Boolean(pending) || !activeSegmentId}
        onClick={() => {
          void run('open-current', async () => {
            const result = await api!.openSourceSegmentClipFolder({ projectDir, sourceAssetId, segmentId: activeSegmentId });
            setMessage(`当前片段路径：${result.targetPath}`);
            window.electronAPI?.showItemInFolder?.(result.targetPath);
          });
        }}
      >
        打开当前片段
      </Button>
      {message ? <span style={{ fontSize: 12, opacity: 0.78 }}>{message}</span> : null}
    </div>
  );
}
