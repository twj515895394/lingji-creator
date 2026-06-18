import { CircleDashed } from 'lucide-react';
import styles from '../../pages/SceneForgeStudio.module.css';

export function SceneForgeStudioHeader() {
  return (
    <section className={styles.header}>
      <div>
        <p className={styles.eyebrow} data-testid="sceneforge-product-eyebrow">
          视频内容创作工坊
        </p>
        <h1 className={styles.headerTitle}>创作流水线</h1>
        <p className={styles.headerLead}>从选题与素材到设定、分镜与视频模型提示词</p>
      </div>
      <div className={styles.statusPill}>
        <CircleDashed size={14} />
        已就绪
      </div>
    </section>
  );
}