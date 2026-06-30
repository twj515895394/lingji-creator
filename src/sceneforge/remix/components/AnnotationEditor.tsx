import { Button, Input, Textarea } from '../../../ui';
import styles from './RemixWorkspacePanels.module.css';

interface AnnotationEditorProps {
  prefillHint?: string | null;
  tags: string[];
  draftTag: string;
  note: string;
  onDraftTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onNoteChange: (value: string) => void;
}

export function AnnotationEditor({
  prefillHint = null,
  tags,
  draftTag,
  note,
  onDraftTagChange,
  onAddTag,
  onRemoveTag,
  onNoteChange,
}: AnnotationEditorProps) {
  return (
    <div className={styles.stack} data-testid="remix-annotation-editor">
      {prefillHint ? <p className={styles.copyFeedback}>{prefillHint}</p> : <p className={styles.copyFeedback}>为整条源素材添加至少一个标签；备注可选，建议补充检索与二创说明。</p>}
      <div className={styles.fieldStack}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldName}>资产标签</span>
          <div className={styles.tagEditor}>
            <Input
              value={draftTag}
              onChange={(event) => onDraftTagChange(event.target.value)}
              placeholder="例如：压迫感、角色反打"
              size="sm"
            />
            <Button variant="outline" size="sm" onClick={onAddTag}>
              添加
            </Button>
          </div>
        </label>

        <div className={styles.tagList}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tagBadge}>
              {tag}
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => onRemoveTag(tag)}
                aria-label={`移除标签 ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <label className={styles.fieldLabel}>
          <span className={styles.fieldName}>资产备注（可选）</span>
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="补充哪些情绪、停顿、动作和镜头关系必须被保留。"
            size="sm"
            resize="vertical"
          />
        </label>
      </div>
    </div>
  );
}
