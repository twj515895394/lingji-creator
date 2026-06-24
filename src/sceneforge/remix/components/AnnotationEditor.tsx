import { Button, Input, Textarea } from '../../../ui';
import styles from './RemixWorkspacePanels.module.css';

interface AnnotationEditorProps {
  tags: string[];
  draftTag: string;
  note: string;
  onDraftTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onNoteChange: (value: string) => void;
}

export function AnnotationEditor({
  tags,
  draftTag,
  note,
  onDraftTagChange,
  onAddTag,
  onRemoveTag,
  onNoteChange,
}: AnnotationEditorProps) {
  return (
    <div className={styles.fieldStack} data-testid="remix-annotation-editor">
      <label className={styles.fieldLabel}>
        <span className={styles.fieldName}>人工标签</span>
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
        <span className={styles.fieldName}>人工备注</span>
        <Textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="补充哪些情绪、停顿、动作和镜头关系必须被保留。"
          size="sm"
          resize="vertical"
        />
      </label>
    </div>
  );
}
