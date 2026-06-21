import { CircleDashed, CheckCircle2, Loader2 } from 'lucide-react';
import logoHorizontal from '../../../assets/sceneforge-logo-horizontal.png';
import styles from '../../pages/SceneForgeStudio.module.css';

interface SceneForgeStudioHeaderProps {
  projectStatus?: string;
  isAnyStageRunning?: boolean;
}

export function SceneForgeStudioHeader({ projectStatus, isAnyStageRunning }: SceneForgeStudioHeaderProps) {
  let statusText = '已就绪';
  let StatusIcon = CircleDashed;
  let statusKey = 'ready';

  if (isAnyStageRunning) {
    statusText = '生成中…';
    StatusIcon = Loader2;
    statusKey = 'running';
  } else if (projectStatus === 'completed') {
    statusText = '已完成';
    StatusIcon = CheckCircle2;
    statusKey = 'completed';
  }

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
      <div className={styles.statusPill} data-status={statusKey}>
        <StatusIcon size={12} className={`${styles.statusIcon} ${statusKey === 'running' ? styles.spin : ''}`} />
        <span>{statusText}</span>
      </div>
    </section>
  );
}