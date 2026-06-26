import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import type { RemixSegmentTranscriptDocument, RemixTranscriptUtterance } from './remix-transcript-types';

const MIN_INTERSECTION_MS = 100;

function intersectionMs(
  utteranceStart: number,
  utteranceEnd: number,
  segmentStart: number,
  segmentEnd: number,
): number {
  const start = Math.max(utteranceStart, segmentStart);
  const end = Math.min(utteranceEnd, segmentEnd);
  return Math.max(0, end - start);
}

export function assignUtteranceToSegment(
  utterance: RemixTranscriptUtterance,
  segments: SourceSegment[],
): string | null {
  const center = (utterance.startMs + utterance.endMs) / 2;
  const byCenter = segments.find(
    (segment) => center >= segment.timeRange.startMs && center < segment.timeRange.endMs,
  );
  if (byCenter) {
    return byCenter.id;
  }

  let bestSegmentId: string | null = null;
  let bestOverlap = 0;
  for (const segment of segments) {
    const overlap = intersectionMs(
      utterance.startMs,
      utterance.endMs,
      segment.timeRange.startMs,
      segment.timeRange.endMs,
    );
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestSegmentId = segment.id;
    }
  }

  return bestOverlap >= MIN_INTERSECTION_MS ? bestSegmentId : null;
}

export function alignUtterancesToSegments(
  sourceAssetId: string,
  sourceTranscriptPath: string,
  utterances: RemixTranscriptUtterance[],
  segments: SourceSegment[],
): RemixSegmentTranscriptDocument[] {
  const grouped = new Map<string, RemixSegmentTranscriptDocument['utterances']>();

  for (const utterance of utterances) {
    const segmentId = assignUtteranceToSegment(utterance, segments);
    if (!segmentId) {
      continue;
    }
    const segment = segments.find((item) => item.id === segmentId);
    if (!segment) {
      continue;
    }
    const items = grouped.get(segmentId) ?? [];
    items.push({
      sourceUtteranceId: utterance.id,
      text: utterance.text,
      sourceStartMs: utterance.startMs,
      sourceEndMs: utterance.endMs,
      relativeStartMs: Math.max(0, utterance.startMs - segment.timeRange.startMs),
      relativeEndMs: Math.max(0, utterance.endMs - segment.timeRange.startMs),
      confidence: utterance.confidence ?? null,
    });
    grouped.set(segmentId, items);
  }

  return segments.map((segment) => {
    const segmentUtterances = (grouped.get(segment.id) ?? []).sort(
      (left, right) => left.sourceStartMs - right.sourceStartMs,
    );
    const confidences = segmentUtterances
      .map((item) => item.confidence)
      .filter((value): value is number => typeof value === 'number');
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : null;

    return {
      schema: 'sceneforge-remix-segment-transcript',
      version: 1,
      segmentId: segment.id,
      sourceAssetId,
      timeRange: {
        sourceStartMs: segment.timeRange.startMs,
        sourceEndMs: segment.timeRange.endMs,
        durationMs: segment.timeRange.durationMs,
      },
      source: 'aligned_from_source_transcript',
      sourceTranscriptPath,
      utterances: segmentUtterances,
      plainText: segmentUtterances.map((item) => item.text).join('\n'),
      quality: {
        hasSpeech: segmentUtterances.length > 0,
        avgConfidence,
        needsReview: false,
      },
    };
  });
}
