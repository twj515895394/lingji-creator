import fs from 'node:fs/promises';
import type { RemixSourceAssetMediaValidation } from '../../../src/sceneforge/remix/types';
import type { StoredSourceAssetDocument } from './remix-store';
import { writeStoredSourceAsset } from './remix-store';
import { resolveProjectFile } from './remix-validators';

async function canReadFile(filePath: string): Promise<{ exists: boolean; readable: boolean }> {
  try {
    await fs.access(filePath);
    return { exists: true, readable: true };
  } catch {
    return { exists: false, readable: false };
  }
}

export interface RemixMediaValidationServiceOptions {
  now?: () => Date;
}

export class RemixMediaValidationService {
  private readonly now;

  constructor(options: RemixMediaValidationServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async validate(
    projectDir: string,
    document: StoredSourceAssetDocument,
  ): Promise<RemixSourceAssetMediaValidation> {
    const sourceVideoPath = document.sourceAsset.sourceVideoPath?.trim() || null;
    const resolvedSourceVideoPath = sourceVideoPath ? resolveProjectFile(projectDir, sourceVideoPath) : null;
    const sourceVideoState = resolvedSourceVideoPath
      ? await canReadFile(resolvedSourceVideoPath)
      : { exists: false, readable: false };

    const keyframeItems = await Promise.all(
      document.sourceAsset.segments
        .flatMap((segment) => segment.keyframes)
        .map(async (keyframe) => {
          const resolvedKeyframePath = resolveProjectFile(projectDir, keyframe.imagePath);
          const status = await canReadFile(resolvedKeyframePath);
          return {
            keyframeId: keyframe.id,
            imagePath: keyframe.imagePath,
            exists: status.exists,
            readable: status.readable,
            error: status.readable ? null : '关键帧文件不存在或不可读',
          };
        }),
    );

    const validKeyframes = keyframeItems.filter((item) => item.readable);
    const invalidKeyframes = keyframeItems.filter((item) => !item.readable);

    const validation: RemixSourceAssetMediaValidation = {
      sourceVideo: {
        path: sourceVideoPath,
        exists: sourceVideoState.exists,
        readable: sourceVideoState.readable,
        error: sourceVideoPath
          ? sourceVideoState.readable
            ? null
            : '源视频不存在或不可读'
          : '缺少源视频路径',
      },
      keyframes: {
        totalCount: keyframeItems.length,
        validCount: validKeyframes.length,
        invalidCount: invalidKeyframes.length,
        items: keyframeItems,
      },
      thumbnail: validKeyframes.length > 0
        ? {
            source: 'keyframe',
            status: 'ready',
            error: null,
          }
        : sourceVideoState.readable
          ? {
              source: 'video_frame',
              status: 'ready',
              error: invalidKeyframes.length > 0 ? '关键帧不可用，已回退到视频首帧。' : null,
            }
          : {
              source: 'fallback',
              status: 'failed',
              error: sourceVideoPath ? '缺少可用关键帧，且源视频不可读。' : '缺少源视频路径与可用关键帧。',
            },
      validatedAt: this.now().toISOString(),
    };

    document.sourceAsset.mediaValidation = validation;
    await writeStoredSourceAsset(projectDir, document);
    return validation;
  }
}
