import { useState } from 'react';
import { Button } from '../../../ui';
import type { RemixUnderstandingWorkbenchSnapshot } from '../../../../electron/sceneforge/remix/remix-understanding-workbench';
import styles from './RemixWorkspacePanels.module.css';

interface UnderstandingWorkbenchPanelProps {
  workbench: RemixUnderstandingWorkbenchSnapshot | null;
  loading?: boolean;
  copiedSegmentId: string | null;
  pendingSegmentId: string | null;
  pendingTranscriptSegmentId?: string | null;
  activeSegmentId?: string | null;
  disabled?: boolean;
  onCopyPrompt: (segmentId: string, text: string) => void;
  onRerunSegment: (segmentId: string) => void;
  onRerunSegmentTranscript?: (segmentId: string) => void;
  onSelectSegment?: (segmentId: string) => void;
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
  pendingTranscriptSegmentId = null,
  activeSegmentId = null,
  disabled = false,
  onCopyPrompt,
  onRerunSegment,
  onRerunSegmentTranscript,
  onSelectSegment,
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

  const handleSave = async (segmentId: string, markConfirmed = true) => {
    if (onUpdateTranscript) {
      await onUpdateTranscript(segmentId, editingText, markConfirmed);
    }
    setEditingSegmentId(null);
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
    const understoodCount = workbench.segments.filter(s => !s.isPlaceholder).length;
    const totalCount = workbench.segments.length;
    return (
      <div className={styles.stack} data-testid="remix-understanding-workbench-placeholder">
        <p className={styles.copyFeedback}>
          当前仍是占位或未完成理解（{understoodCount}/{totalCount} 段）。
          {workbench.errors[0] ? ` ${workbench.errors[0]}` : ''}
        </p>
      </div>
    );
  }

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
      {workbench.isStale && (
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
            <span>⚠️ 局部台词校对或关键帧画面有更新，当前全片故事理解已过期，建议重跑以刷新。</span>
            {workbench.segments.some((s) => s.isStale) && (
              <span style={{ fontSize: '12px', opacity: 0.85 }}>检测到过期的局部理解段，您可以先一键重跑它们。</span>
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
        <section className={styles.overviewSummary} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            <div className={styles.overviewLead} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={styles.overviewLeadLabel} style={{ fontWeight: 'bold', fontSize: '14px', color: '#60a5fa' }}>故事内容</div>
              <div className={styles.overviewLeadText} style={{ fontSize: '13px', color: 'rgba(255, 248, 235, 0.85)', lineHeight: '1.6' }}>{workbench.overview.storyContent || '正在生成故事内容…'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {workbench.overview.logline && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>一句话梗概 (Logline)</strong>
                  <p style={{ fontSize: '13px', color: 'rgba(255,248,235,0.85)', marginTop: '6px', lineHeight: '1.4' }}>{workbench.overview.logline}</p>
                </div>
              )}
              
              {workbench.overview.storySummaryShort && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>故事短摘要 (Summary)</strong>
                  <p style={{ fontSize: '13px', color: 'rgba(255,248,235,0.85)', marginTop: '6px', lineHeight: '1.4' }}>{workbench.overview.storySummaryShort}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            {workbench.overview.eventChain && workbench.overview.eventChain.length > 0 && (
              <div>
                <strong style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>剧情事件链 (Event Chain)</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {workbench.overview.eventChain.map((ev, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,248,235,0.8)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', borderLeft: '2px solid #60a5fa' }}>
                      {idx + 1}. {ev}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {workbench.overview.characterMap && workbench.overview.characterMap.length > 0 && (
              <div>
                <strong style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>角色关系图谱 (Characters)</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {workbench.overview.characterMap.map((ch, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,248,235,0.8)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
                      <strong>{ch.nameOrRole}</strong>：{ch.description} {ch.relation ? `(${ch.relation})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {workbench.overview.remixDirections && workbench.overview.remixDirections.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <strong style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>推荐二创改造方案 (Remix Ideas)</strong>
              {workbench.overview.remixDirections.map((dir, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,248,235,0.8)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                  - <strong>【{dir.title}】</strong>：{dir.idea}
                  {dir.suitableStyle ? <span style={{ color: '#60a5fa', marginLeft: '6px' }}>(推荐风格: {dir.suitableStyle})</span> : null}
                  {dir.risk ? <span style={{ color: '#fb923c', marginLeft: '6px' }}>(风险点: {dir.risk})</span> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.segmentAnalysisList}>
        {workbench.segments.map((segment) => {
          const isExpanded = expandedCardIds[segment.segmentId] ?? segment.isStale;
          const isEditing = editingSegmentId === segment.segmentId;
          const cardStyle = segment.isStale
            ? (!segment.visual.mainAction && !segment.videoPrompt.fullChinesePrompt)
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
              style={{
                ...cardStyle,
                ...(activeSegmentId === segment.segmentId
                  ? {
                      borderColor: 'rgba(96, 165, 250, 0.5)',
                      boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.18) inset',
                    }
                  : null),
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
                padding: '0px',
                overflow: 'hidden',
              }}
              data-testid={`remix-understanding-card-${segment.segmentId}`}
              onClick={() => onSelectSegment?.(segment.segmentId)}
            >
              <div
                className={styles.segmentAnalysisHeader}
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '8px 8px 0 0',
                  transition: 'background-color 0.15s ease',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => {
                  onSelectSegment?.(segment.segmentId);
                  toggleExpand(segment.segmentId);
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div className={styles.segmentAnalysisTitle} style={{ fontSize: '13px', fontWeight: 600 }}>
                    {String(segment.segmentIndex).padStart(2, '0')} · {segment.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={getBadgeStyle(segment.transcript.correctionStatus)}>
                      {getStatusLabel(segment.transcript.correctionStatus)}
                    </span>
                    <span className={styles.segmentAnalysisMeta}>{segment.timeRangeLabel}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#60a5fa',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        userSelect: 'none',
                      }}
                      onClick={() => {
                        onSelectSegment?.(segment.segmentId);
                        toggleExpand(segment.segmentId);
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 500 }}>{isExpanded ? '收起详情' : '展开详情'}</span>
                      <span
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          display: 'inline-block',
                        }}
                      >
                        ▶
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {segment.isStale && (
                <div
                  style={{
                    color: (!segment.visual.mainAction && !segment.videoPrompt.fullChinesePrompt) ? '#ef4444' : '#fb923c',
                    fontSize: '12px',
                    background: (!segment.visual.mainAction && !segment.videoPrompt.fullChinesePrompt) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span>
                    {!segment.visual.mainAction && !segment.videoPrompt.fullChinesePrompt
                      ? '⚠️ 台词发生剧烈修改，本段大模型分析已失效置空，请立即重跑理解。'
                      : '⚠️ 台词已被修改，本段大模型分析已过期，建议重跑本段理解。'}
                  </span>
                </div>
              )}

              {/* 去容器化台词编辑展示区 */}
              <div
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '2px', opacity: 0.8 }} title="台词">🗣️</span>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button variant="ghost" size="xs" onClick={() => setEditingSegmentId(null)}>取消</Button>
                          <Button variant="accent" size="xs" onClick={() => handleSave(segment.segmentId, true)}>保存</Button>
                        </div>
                      </div>
                    ) : (
                      <span
                        onDoubleClick={() => startEditing(segment.segmentId, segment.transcript.correctedText || segment.transcript.asrText)}
                        style={{
                          fontSize: '13px',
                          color: 'rgba(255, 248, 235, 0.85)',
                          lineHeight: '1.5',
                          cursor: 'pointer',
                        }}
                        title="双击进行编辑"
                      >
                        {segment.transcript.correctedText || segment.transcript.asrText || '（无台词）'}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => startEditing(segment.segmentId, segment.transcript.correctedText || segment.transcript.asrText)}
                        style={{ padding: '2px 6px', height: '22px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}
                      >
                        ✏️ 编辑
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 折叠预览与主要 Facts 区 */}
              <div style={{ padding: '10px 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className={styles.segmentAnalysisFacts} style={{ marginTop: '0px', marginBottom: '0px' }}>
                  <span className={styles.segmentAnalysisFact} style={{ fontSize: '12px' }}>🎬 动作：{segment.visual.mainAction || '已失效，请重跑'}</span>
                  <span className={styles.segmentAnalysisFact} style={{ fontSize: '12px' }}>🎥 镜头：{segment.camera.shotSize ? `${segment.camera.shotSize} / ${segment.camera.movement}` : '已失效，请重跑'}</span>
                </div>

                {segment.frameVision.available && segment.frameVision.segmentVisualSummary && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.55)',
                      background: 'rgba(255, 255, 255, 0.015)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      borderLeft: '2px solid rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    👁️ <strong>画面视觉描述：</strong>{segment.frameVision.segmentVisualSummary}
                    {segment.frameVision.warnings.length > 0 && (
                      <span style={{ color: '#e0a800', marginLeft: '6px', fontSize: '11px' }}>
                        ({segment.frameVision.warnings.join(', ')})
                      </span>
                    )}
                  </div>
                )}

                {/* 折叠时提供一行小字 Prompt 预览 */}
                {!isExpanded && segment.videoPrompt.fullChinesePrompt && (
                  <div
                    onClick={() => {
                      onSelectSegment?.(segment.segmentId);
                      toggleExpand(segment.segmentId);
                    }}
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      padding: '2px 0 0 0',
                    }}
                    title="点击展开查看详情"
                  >
                    ✍️ <strong>提示词预览：</strong>{segment.videoPrompt.fullChinesePrompt.slice(0, 60)}
                    {segment.videoPrompt.fullChinesePrompt.length > 60 ? '...' : ''}
                  </div>
                )}

                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      paddingTop: '10px',
                      marginTop: '4px',
                    }}
                  >
                    <div className={styles.segmentAnalysisNote} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>剧情功能：{segment.story.plotFunction || '已失效，请重跑'}</div>

                    {/* 正向 Prompt 影视代码板高亮渲染 */}
                    <div
                      style={{
                        background: 'rgba(20, 24, 33, 0.65)',
                        border: '1px solid rgba(96, 165, 250, 0.15)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✍️ 正向 Video Prompt
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onCopyPrompt(segment.segmentId, segment.videoPrompt.fullChinesePrompt)}
                          style={{ fontSize: '10px', height: '18px', padding: '2px 6px', color: '#60a5fa' }}
                        >
                          复制
                        </Button>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 248, 235, 0.85)', lineHeight: '1.4' }}>
                        {segment.videoPrompt.fullChinesePrompt || '已失效，请重跑'}
                      </div>
                    </div>

                  {segment.videoPrompt.dimensions && segment.videoPrompt.dimensions.length > 0 && (
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
                          {segment.videoPrompt.dimensions.map((dim) => (
                            <div
                              key={dim.key}
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
              </div>

              <div className={styles.copyRow}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || pendingTranscriptSegmentId === segment.segmentId}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRerunSegmentTranscript?.(segment.segmentId);
                  }}
                >
                  {pendingTranscriptSegmentId === segment.segmentId ? 'ASR 重跑中…' : '重跑 ASR'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || !segment.videoPrompt.fullChinesePrompt}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopyPrompt(segment.segmentId, segment.videoPrompt.fullChinesePrompt);
                  }}
                >
                  复制 video prompt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || pendingSegmentId === segment.segmentId}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRerunSegment(segment.segmentId);
                  }}
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
