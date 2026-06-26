import type { RemixSegmentationMode } from '../../../../src/sceneforge/remix/types';

export type ShotDetectorName = 'pyscenedetect_adaptive' | 'transnetv2' | 'hybrid_fallback';
export type ShotBoundaryKind = 'hard_cut' | 'gradual' | 'inferred';

export interface ShotDetectionRequest {
  projectDir: string;
  sourceAssetId: string;
  videoPath: string;
  mode: RemixSegmentationMode;
  minShotDurationMs: number;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  threshold?: number | null;
  modelPath?: string | null;
  modelVendorDir?: string | null;
}

export interface ShotBoundaryCandidate {
  timeMs: number;
  frameIndex: number;
  confidence: number;
  sources: string[];
  boundaryType: ShotBoundaryKind;
  rawScore?: number | null;
}

export interface ShotSceneRange {
  startMs: number;
  endMs: number;
  durationMs: number;
  startFrame: number;
  endFrame: number;
  confidence?: number | null;
}

export interface ShotDetectionMetrics {
  elapsedMs?: number;
  frameCount?: number;
  analysisFps?: number;
  modelDevice?: 'cpu' | 'cuda' | 'mps' | 'unknown';
  rawBoundaryCount?: number;
  filteredBoundaryCount?: number;
}

export interface ShotDetectionResult {
  mode: RemixSegmentationMode;
  detector: ShotDetectorName;
  usedFallback: boolean;
  fallbackReason?: string | null;
  boundaries: ShotBoundaryCandidate[];
  scenes: ShotSceneRange[];
  metrics?: ShotDetectionMetrics;
  notes: string[];
}
