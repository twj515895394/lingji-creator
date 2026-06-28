import { useState } from 'react';
import { Button } from '../../../ui';
import type { RemixUnderstandingWorkbenchSnapshot } from '../../../../electron/sceneforge/remix/remix-understanding-workbench';
import styles from './RemixWorkspacePanels.module.css';

interface UnderstandingWorkbenchPanelProps {
  workbench: RemixUnderstandingWorkbenchSnapshot | null;
  loading?: boolean;
  copiedSegmentId: string | null;
  pendingSegmentId: string | null;
  disabled?: boolean;
  onCopyPrompt: (segmentId: string, text: string) => void;
  onRerunSegment: (segmentId: string) => void;
  onRerunRollup?: () => void;
  onRerunStaleSegments?: () => void;
  onUpdateTranscript?: (
    segmentId: string,
    correctedText: string,
    markConfirmed?: boolean,
  ) => Promise<void>;
}

export function UnderstandingWorkbenchPanel({
  workbench,
  loading = false,
  copiedSegmentId,
  pendingSegmentId,
  disabled = false,
  onCopyPrompt,
  onRerunSegment,
  onRerunRollup,
  onRerunStaleSegments,
  onUpdateTranscript,
}: UnderstandingWorkbenchPanelProps) {
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showDimensions, setShowDimensions] = useState<Record<string, boolean>>({});
  const [copiedDimension, setCopiedDimension] = useState<{ segmentId: string; dimName: string } | null>(null);

  const toggleDimensions = (segmentId: string) => {
    setShowDimensions((prev) => ({
      ...prev,
      [segmentId]: !prev[segmentId],
    }));
  };

  const handleCopyDim = (segmentId: string, dimName: string, text: string) => {
    onCopyPrompt(segmentId, text);
    setCopiedDimension({ segmentId, dimName });
    setTimeout(() => {
      setCopiedDimension(null);
    }, 1500);
  };

  const toggleExpand = (segmentId: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [segmentId]: !prev[segmentId],
    }));
  };

  const startEditing = (segmentId: string, currentText: string) => {
    setEditingSegmentId(segmentId);
    setEditingText(currentText);
    setExpandedCardIds((prev) => ({
      ...prev,
      [segmentId]: true,
    }));
  };

  const handleSave = async (segmentId: string, markConfirmed = false) => {
    if (onUpdateTranscript) {
      await onUpdateTranscript(segmentId, editingText, markConfirmed);
    }
    setEditingSegmentId(null);
  };

  const handleConfirmDirect = async (segmentId: string, currentText: string) => {
    if (onUpdateTranscript) {
      await onUpdateTranscript(segmentId, currentText, true);
    }
  };

  if (loading) {
    return <p className={styles.copyFeedback}>正在加载理解结果…</p>;
  }
  if (!workbench) {
    return (
      <p className={styles.copyFeedback}>
        尚未生成真实片段理解。点击「生成原片理解」后，这里会展示每段剧情、镜头与 video prompt。
      </p>
    );
  }
  if (workbench.isPlaceholder) {
    return (
      <div className={styles.stack} data-testid="remix-understanding-workbench-placeholder">
        <p className={styles.copyFeedback}>
          当前仍是占位或未完成理解（{workbench.understoodSegmentCount}/{workbench.segmentCount} 段）。
          {workbench.errors[0] ? ` ${workbench.errors[0]}` : ''}
        </p>
      </div>
    );
  }

  // 计算 ASR 状态徽标样式
  const getBadgeStyle = (status: 'raw' | 'edited' | 'confirmed') => {
    const base = {
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontWeight: 500,
    };
    if (status === 'confirmed') {
      return {
        ...base,
        border: '1px solid rgba(34, 197, 94, 0.3)',
        background: 'rgba(34, 197, 94, 0.08)',
        color: '#4ade80',
      };
    }
    if (status === 'edited') {
      return {
        ...base,
        border: '1px solid rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.08)',
        color: '#60a5fa',
      };
    }
    return {
      ...base,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      background: 'rgba(255, 255, 255, 0.04)',
      color: 'rgba(255, 255, 255, 0.5)',
    };
  };

  const getStatusLabel = (status: 'raw' | 'edited' | 'confirmed') => {
    if (status === 'confirmed') return '已确认台词';
    if (status === 'edited') return '已校对台词';
    return 'ASR 识别';
  };

  return (
    <div className={styles.stack} data-testid="remix-understanding-workbench">
      {workbench.storyStale && (
        <div
          style={{
            border: '1px solid var(--color-warning-border, #f97316)',
            background: 'rgba(249, 115, 22, 0.06)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#fb923c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>⚠️ 局部片段台词已校对更新，当前全片故事串联已过期，建议重跑以刷新汇总。</span>
            {workbench.segments.some((s) => s.isStale) && (
              <span style={{ fontSize: '12px', opacity: 0.85 }}>检测到有过期的局部理解段，您可以先一键重跑它们。</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {workbench.segments.some((s) => s.isStale) && onRerunStaleSegments && (
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={onRerunStaleSegments}
              >
                只重跑过期片段
              </Button>
            )}
            <Button
              variant="accent"
              size="sm"
              disabled={disabled}
              onClick={onRerunRollup}
            >
              重跑全片故事
            </Button>
          </div>
        </div>
      )}

      {workbench.rollupFallbackUsed ? (
        <section
          className={styles.overviewSummary}
          style={{
            border: '1px solid var(--color-warning-border, #e0a800)',
            background: 'rgba(224, 168, 0, 0.05)',
            padding: '16px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              color: 'var(--color-warning-text, #e0a800)',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>全片故事未成功生成，当前显示的是系统兜底信息。请检查 LLM 配置后重跑全片故事。</span>
            {workbench.errors.length > 0 && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>错误原因: {workbench.errors.join('; ')}</span>
            )}
            <div>
              <Button
                variant="accent"
                size="sm"
                disabled={disabled}
                onClick={onRerunRollup}
              >
                重跑全片故事
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.overviewSummary}>
          <div className={styles.overviewLead}>
            <div className={styles.overviewLeadLabel}>故事内容</div>
            <div className={styles.overviewLeadText}>{workbench.overviewSummary || '正在生成故事内容…'}</div>
          </div>
          {workbench.remixPotential.length > 0 ? (
            <p className={styles.copyFeedback} style={{ marginTop: '12px', fontSize: '13px' }}>
              二创方向：{workbench.remixPotential.join(' / ')}
            </p>
          ) : null}
        </section>
      )}

      <section className={styles.segmentAnalysisList}>
        {workbench.segments.map((segment) => {
          const isExpanded = expandedCardIds[segment.segmentId] ?? segment.isStale;
          const isEditing = editingSegmentId === segment.segmentId;
          const cardStyle = segment.isStale
            ? (!segment.mainAction && !segment.positivePrompt)
              ? {
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.01)',
                  opacity: 0.8,
                }
              : {
                  border: '1px solid rgba(249, 115, 22, 0.35)',
                  background: 'rgba(249, 115, 22, 0.02)',
                }
            : undefined;

          return (
            <article
              key={segment.segmentId}
              className={styles.segmentAnalysisCard}
              style={cardStyle}
              data-testid={`remix-understanding-card-${segment.segmentId}`}
            >
              <div
                className={styles.segmentAnalysisHeader}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpand(segment.segmentId)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div className={styles.segmentAnalysisTitle}>
                    {String(segment.segmentIndex).padStart(2, '0')} · {segment.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={(e) => e.stopPropagation()} // 防止徽标及 Chevron 点击穿透
                  >
                    <span style={getBadgeStyle(segment.transcriptCorrectionStatus)}>
                      {getStatusLabel(segment.transcriptCorrectionStatus)}
                    </span>
                    <span className={styles.segmentAnalysisMeta}>{segment.timeRangeLabel}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'rgba(255, 255, 255, 0.4)',
                      }}
                      onClick={() => toggleExpand(segment.segmentId)}
                    >
                      ▶
                    </span>
                  </div>
                </div>
              </div>

              {segment.isStale && (
                <div
                  style={{
                    color: (!segment.mainAction && !segment.positivePrompt) ? '#ef4444' : '#fb923c',
                    fontSize: '12px',
                    background: (!segment.mainAction && !segment.positivePrompt) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>
                    {!segment.mainAction && !segment.positivePrompt
                      ? '⚠️ 台词发生剧烈修改，本段大模型分析已失效置空，请立即重跑理解。'
                      : '⚠️ 台词已被修改，本段大模型分析已过期，建议重跑本段理解。'}
                  </span>
                </div>
              )}

              <div className={styles.segmentAnalysisFacts}>
                <span className={styles.segmentAnalysisFact}>动作：{segment.mainAction || '已失效，请重跑'}</span>
                <span className={styles.segmentAnalysisFact}>镜头：{segment.shotSummary || '已失效，请重跑'}</span>
              </div>

              {/* 台词编辑区域 */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>片段台词</span>
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => startEditing(segment.segmentId, segment.transcriptCorrectionText || segment.transcriptSummary)}
                      >
                        编辑台词
                      </Button>
                      {segment.transcriptCorrectionStatus !== 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleConfirmDirect(segment.segmentId, segment.transcriptCorrectionText || segment.transcriptSummary)}
                          style={{ color: '#4ade80' }}
                        >
                          确认无误
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        background: '#0a0d14',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        color: 'rgba(255, 248, 235, 0.9)',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingSegmentId(null)}
                      >
                        取消
                      </Button>
                      <Button
                        variant="accent"
                        size="xs"
                        onClick={() => handleSave(segment.segmentId, false)}
                      >
                        保存
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSave(segment.segmentId, true)}
                        style={{ color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                      >
                        保存并确认
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => startEditing(segment.segmentId, segment.transcriptCorrectionText || segment.transcriptSummary)}
                    style={{
                      fontSize: '13px',
                      color: 'rgba(255, 248, 235, 0.85)',
                      lineHeight: '1.5',
                      minHeight: '20px',
                      cursor: 'pointer',
                    }}
                    title="双击进行编辑"
                  >
                    {segment.transcriptCorrectionText || segment.transcriptSummary || '（无台词）'}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '8px',
                  }}
                >
                  <div className={styles.segmentAnalysisNote}>剧情功能：{segment.plotFunction || '已失效，请重跑'}</div>
                  <div className={styles.segmentAnalysisNote}>正向 prompt：{segment.positivePrompt || '已失效，请重跑'}</div>

                  {segment.chineseVideoPrompt && (
                    <div style={{ marginTop: '4px' }}>
                      <div
                        onClick={() => toggleDimensions(segment.segmentId)}
                        style={{
                          fontSize: '12px',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          userSelect: 'none',
                          padding: '4px 0',
                        }}
                      >
                        <span>{showDimensions[segment.segmentId] ? '▼ 收起影视级 Prompt 维度' : '▶ 展开影视级 Prompt 维度'}</span>
                      </div>

                      {showDimensions[segment.segmentId] && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '8px',
                            marginTop: '8px',
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '10px',
                          }}
                        >
                          {[
                            { label: '👤 人物主体', text: segment.chineseVideoPrompt.subjectPrompt },
                            { label: '🏠 空间场景', text: segment.chineseVideoPrompt.scenePrompt },
                            { label: '🏃 动作流程', text: segment.chineseVideoPrompt.actionPrompt },
                            { label: '🎭 表演状态', text: segment.chineseVideoPrompt.performancePrompt },
                            { label: '🎥 镜头语言', text: segment.chineseVideoPrompt.cameraPrompt },
                            { label: '☀️ 光影明暗', text: segment.chineseVideoPrompt.lightingPrompt },
                            { label: '🎨 色调色彩', text: segment.chineseVideoPrompt.colorPrompt },
                            { label: '❤️ 情绪氛围', text: segment.chineseVideoPrompt.emotionPrompt },
                            { label: '⏱️ 动作节奏', text: segment.chineseVideoPrompt.rhythmPrompt },
                            { label: '💬 台词语气', text: segment.chineseVideoPrompt.dialoguePrompt },
                            { label: '🔊 环境声音', text: segment.chineseVideoPrompt.soundPrompt },
                            { label: '🌟 风格质感', text: segment.chineseVideoPrompt.stylePrompt },
                            { label: '⛓️ 时序连续', text: segment.chineseVideoPrompt.continuityPrompt },
                            { label: '🎛️ 二创控制', text: segment.chineseVideoPrompt.remixControlPrompt },
                            { label: '🚫 负向约束', text: segment.chineseVideoPrompt.negativePrompt },
                          ]
                            .filter((d) => d.text)
                            .map((dim) => (
                              <div
                                key={dim.label}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid rgba(255, 255, 255, 0.04)',
                                  borderRadius: '6px',
                                  padding: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
                                    {dim.label}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    disabled={disabled}
                                    onClick={() => handleCopyDim(segment.segmentId, dim.label, dim.text)}
                                    style={{
                                      padding: '2px 6px',
                                      height: '18px',
                                      fontSize: '10px',
                                      color:
                                        copiedDimension?.segmentId === segment.segmentId &&
                                        copiedDimension.dimName === dim.label
                                          ? '#4ade80'
                                          : 'rgba(255, 255, 255, 0.4)',
                                    }}
                                  >
                                    {copiedDimension?.segmentId === segment.segmentId &&
                                    copiedDimension.dimName === dim.label
                                      ? '已复制'
                                      : '复制'}
                                  </Button>
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255, 248, 235, 0.8)', lineHeight: '1.4' }}>
                                  {dim.text}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.copyRow}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || !segment.positivePrompt}
                  onClick={() => onCopyPrompt(segment.segmentId, segment.positivePrompt)}
                >
                  复制 video prompt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || pendingSegmentId === segment.segmentId}
                  onClick={() => onRerunSegment(segment.segmentId)}
                >
                  {pendingSegmentId === segment.segmentId ? '重跑中…' : '重跑本段'}
                </Button>
                {copiedSegmentId === segment.segmentId ? (
                  <span className={styles.copyFeedback}>已复制</span>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
