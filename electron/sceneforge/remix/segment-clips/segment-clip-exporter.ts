export interface ExportSegmentClipItem {
  segmentId: string;
  fileName: string;
  exportedPath: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface ExportSegmentClipsResult {
  outputDir: string;
  manifestPath: string;
  totalCount: number;
  exportedCount: number;
  items: ExportSegmentClipItem[];
}
