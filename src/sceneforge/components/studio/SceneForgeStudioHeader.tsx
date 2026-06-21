import { CircleDashed, CheckCircle2, Loader2 } from 'lucide-react';
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
        <svg
          viewBox="0 0 160 32"
          fill="none"
          className={styles.headerLogo}
          data-testid="sceneforge-logo"
          style={{ width: 'auto', height: '36px' }}
        >
          {/* Viewport Outer Corner Brackets */}
          <path d="M4 2H10V0H2C0.9 0 0 0.9 0 2V10H2V4H4" fill="#38BDF8" />
          <path d="M28 2H22V0H30C31.1 0 32 0.9 32 2V10H30V4H28" fill="#38BDF8" />
          <path d="M4 30H10V32H2C0.9 32 0 31.1 0 30V22H2V28H4" fill="#38BDF8" />
          <path d="M28 30H22V32H30C31.1 32 32 31.1 32 30V22H30V28H28" fill="#38BDF8" />
          
          {/* Aperture / Lens shutter center */}
          <circle cx="16" cy="16" r="8" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Aperture Blades */}
          <path d="M16 8L20 12" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 16L20 20" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 24L12 20" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 16L12 12" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="16" r="3" fill="#38BDF8" />
          
          {/* Text Typography */}
          <text
            x="44"
            y="22"
            fill="#FFFFFF"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            fontSize="18"
            letterSpacing="-0.02em"
          >
            Scene
          </text>
          <text
            x="96"
            y="22"
            fill="#38BDF8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="18"
            letterSpacing="-0.01em"
          >
            Forge
          </text>
        </svg>
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