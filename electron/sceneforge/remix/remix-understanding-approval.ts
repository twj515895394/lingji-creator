import type { RemixStageStatus } from '../../../src/sceneforge/remix/types';
import { readStoredSourceAsset } from './remix-store';
import { validateRemixUnderstandingArtifacts } from './remix-understanding-gate';
import type { RemixTranscriptCorrectionService } from './remix-transcript-correction-service';
import type { RemixUnderstandingService } from './remix-understanding-service';

export interface RemixUnderstandingApprovalBlocker {
  code: 'artifacts_invalid' | 'segments_stale' | 'transcripts_unconfirmed';
  message: string;
}

export interface RemixUnderstandingApprovalEvaluation {
  canApprove: boolean;
  nextStageStatus: RemixStageStatus | null;
  blockers: RemixUnderstandingApprovalBlocker[];
}

/**
 * 台词全部确认后，判断是否可将「原片理解」阶段收口为 approved。
 * 不隐藏真实 stale（关键帧 / frame vision / 缺失 analysis）。
 */
export async function evaluateRemixUnderstandingApproval(
  projectDir: string,
  sourceAssetId: string,
  deps: {
    understandingService: Pick<RemixUnderstandingService, 'validateUnderstandingFreshness'>;
    transcriptCorrectionService: Pick<RemixTranscriptCorrectionService, 'getSegmentTranscriptCorrection'>;
  },
): Promise<RemixUnderstandingApprovalEvaluation> {
  const document = await readStoredSourceAsset(projectDir, sourceAssetId);
  const blockers: RemixUnderstandingApprovalBlocker[] = [];

  const artifactValidation = await validateRemixUnderstandingArtifacts(projectDir, document);
  if (!artifactValidation.ok) {
    blockers.push({
      code: 'artifacts_invalid',
      message: artifactValidation.errors[0] ?? '原片理解产物未通过校验。',
    });
  }

  const freshness = await deps.understandingService.validateUnderstandingFreshness(
    projectDir,
    sourceAssetId,
  );
  if (freshness.isStale) {
    blockers.push({
      code: 'segments_stale',
      message: '部分片段理解与当前关键帧或画面输入不一致，请先重跑过期片段。',
    });
  }

  for (const segment of document.sourceAsset.segments) {
    const correction = await deps.transcriptCorrectionService.getSegmentTranscriptCorrection(
      projectDir,
      sourceAssetId,
      segment.id,
    );
    if (correction.transcript.correctionStatus !== 'confirmed') {
      blockers.push({
        code: 'transcripts_unconfirmed',
        message: `片段 ${segment.index} 台词尚未确认。`,
      });
      break;
    }
  }

  if (blockers.length > 0) {
    return { canApprove: false, nextStageStatus: null, blockers };
  }

  return {
    canApprove: true,
    nextStageStatus: 'approved',
    blockers: [],
  };
}