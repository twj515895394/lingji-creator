import styles from './StageRunSignalOrb.module.css';

export interface StageRunSignalOrbProps {
  /** 有分步进度时略加快旋转 */
  determinate?: boolean;
}

/**
 * LLM 运行指示器：多层旋转环 + 脉冲 + 轨道点，动效仅使用 transform/opacity。
 */
export function StageRunSignalOrb({ determinate = false }: StageRunSignalOrbProps) {
  const outerAnimClass = determinate ? 'stage-orb-spin-outer-determinate' : 'stage-orb-spin-outer';
  const midAnimClass = determinate ? 'stage-orb-spin-mid-determinate' : 'stage-orb-spin-mid';
  const orbitAnimClass = determinate ? 'stage-orb-spin-orbit-determinate' : 'stage-orb-spin-orbit';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stageOrbPulseAuraGlobal {
          0% { transform: scale(0.92) translateZ(0); opacity: 0.65; }
          100% { transform: scale(1.08) translateZ(0); opacity: 0.95; }
        }
        @keyframes stageOrbRippleGlobal {
          0% { transform: scale(0.85) translateZ(0); opacity: 0.75; }
          100% { transform: scale(1.35) translateZ(0); opacity: 0; }
        }
        @keyframes stageOrbSpinGlobal {
          0% { transform: rotate(0deg) translateZ(0); }
          100% { transform: rotate(360deg) translateZ(0); }
        }
        @keyframes stageOrbCorePulseGlobal {
          0%, 100% {
            transform: scale(1) translateZ(0);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -2px 6px rgba(0, 0, 0, 0.8);
          }
          50% {
            transform: scale(1.06) translateZ(0);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 8px 30px rgba(0, 240, 255, 0.25), inset 0 2px 5px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(0, 0, 0, 0.7);
          }
        }
        @keyframes stageOrbSparkGlobal {
          0%, 100% {
            transform: rotate(45deg) scale(0.9) translateZ(0);
            filter: brightness(1);
          }
          50% {
            transform: rotate(225deg) scale(1.15) translateZ(0);
            filter: brightness(1.25);
          }
        }

        .stage-orb-root-glow {
          animation: stageOrbPulseAuraGlobal 3s ease-in-out infinite alternate !important;
        }
        .stage-orb-ripple-effect {
          animation: stageOrbRippleGlobal 2s cubic-bezier(0.25, 1, 0.5, 1) infinite !important;
        }
        .stage-orb-spin-outer {
          animation: stageOrbSpinGlobal 2.2s linear infinite !important;
        }
        .stage-orb-spin-outer-determinate {
          animation: stageOrbSpinGlobal 1.2s linear infinite !important;
        }
        .stage-orb-spin-mid {
          animation: stageOrbSpinGlobal 3.3s linear infinite reverse !important;
        }
        .stage-orb-spin-mid-determinate {
          animation: stageOrbSpinGlobal 1.8s linear infinite reverse !important;
        }
        .stage-orb-spin-orbit {
          animation: stageOrbSpinGlobal 2.8s linear infinite !important;
        }
        .stage-orb-spin-orbit-determinate {
          animation: stageOrbSpinGlobal 1.6s linear infinite !important;
        }
        .stage-orb-core-glow {
          animation: stageOrbCorePulseGlobal 1.6s ease-in-out infinite !important;
        }
        .stage-orb-core-shine-spin {
          animation: stageOrbSpinGlobal 4.5s linear infinite !important;
        }
        .stage-orb-spark-effect {
          animation: stageOrbSparkGlobal 2.4s ease-in-out infinite !important;
        }
      ` }} />
      <div
        className={`${styles.root} stage-orb-root-glow`}
        data-determinate={determinate ? 'true' : 'false'}
        data-testid="scene-run-signal-orb"
        aria-hidden
      >
        <div className={`${styles.pulseA} stage-orb-ripple-effect`} />
        <div className={`${styles.pulseB} stage-orb-ripple-effect`} style={{ animationDelay: '1s' }} />
        <div className={`${styles.ringOuter} ${outerAnimClass}`}>
          <div className={styles.ringOuterTrack} />
        </div>
        <div className={`${styles.ringMid} ${midAnimClass}`}>
          <div className={styles.ringMidTrack} />
        </div>
        <div className={`${styles.orbitShell} ${orbitAnimClass}`}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <div className={`${styles.core} stage-orb-core-glow`}>
          <div className={`${styles.coreShine} stage-orb-core-shine-spin`} />
          <div className={`${styles.spark} stage-orb-spark-effect`} />
        </div>
      </div>
    </>
  );
}