import { describe, expect, it } from 'vitest';
import {
  listSceneAssets,
  loadSceneAsset,
  loadSceneStyleProfile,
  resolveSceneAssetsForStage,
} from '../electron/sceneforge/assets/scene-asset-library';

describe('Scene Asset Library', () => {
  it('indexes reusable assets but excludes source-materials', async () => {
    const assets = await listSceneAssets();
    expect(assets.some((asset) => asset.id === 'style.pixar_like')).toBe(true);
    expect(assets.some((asset) => asset.id.includes('source-materials'))).toBe(false);
    const registryText = JSON.stringify(assets);
    expect(registryText).not.toContain('source-materials');
  });

  it('loads a style profile by id', async () => {
    const profile = await loadSceneStyleProfile('style.pixar_like');
    expect(profile.id).toBe('style.pixar_like');
    expect(profile.title).toBeTruthy();
    expect(profile.files.profile).toContain('pixar_like');
    expect(profile.files.negative).toBeTruthy();
  });

  it('loads a methodology asset via loadSceneAsset', async () => {
    const asset = await loadSceneAsset('cinematic.shot_language');
    expect(asset.id).toBe('cinematic.shot_language');
    expect(asset.content.main).toBeTruthy();
  });

  it('resolves stage-specific asset snippets with id and title', async () => {
    const snippets = await resolveSceneAssetsForStage({
      stage: 'storyboard',
      selectedAssetIds: ['style.pixar_like', 'cinematic.shot_language'],
    });
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets.every((s) => s.id && s.title && s.text)).toBe(true);
    expect(snippets.map((s) => s.id)).toEqual(
      expect.arrayContaining(['style.pixar_like', 'cinematic.shot_language']),
    );
    expect(snippets.map((s) => s.text).join('\n')).not.toContain('source-materials');
  });

  it('filters assets by stage usedBy and selected ids only', async () => {
    const snippets = await resolveSceneAssetsForStage({
      stage: 'design',
      selectedAssetIds: ['cinematic.shot_language'],
    });
    expect(snippets).toEqual([]);
  });
});