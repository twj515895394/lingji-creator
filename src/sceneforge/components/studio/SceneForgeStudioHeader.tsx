import { CircleDashed } from 'lucide-react';
import logoHorizontal from '../../assets/sceneforge-logo-horizontal.png';
import styles from '../../pages/SceneForgeStudio.module.css';

export function SceneForgeStudioHeader() {
  return (
    <section className={styles.header}>
      <div className={styles.headerMain}>
        <span style={{ display: 'none' }} data-testid="sceneforge-product-eyebrow">
          视频内容创作工坊
        </span>
        <img
          src={logoHorizontal}
          alt="SceneForge"
          className={styles.headerLogo}
          data-testid="sceneforge-logo"
        />
        <span className={styles.headerDivider}>/</span>
        <h1 className={styles.headerTitle}>创作流水线</h1>
        <span className={styles.headerLead}>从选题与素材到设定、分镜与视频模型提示词</span>
      </div>
      <div className={styles.statusPill}>
        <CircleDashed size={12} className={styles.statusIcon} />
        已就绪
      </div>
    </section>
  );
}