# SceneForge Issue 10 Findings

## Migration source

- Root: `/Users/tangwujun/Documents/trae_projects/scene_forge`
- Include: `assets/adaptation`, `animation-stylization`, `cinematic-language`, `storyboard-methodology`, `style_profiles/`
- Exclude: `assets/source-materials`

## Stage Context extension (Task 12)

```json
{
  "assetLibrary": {
    "selectedAssets": [],
    "snippets": []
  }
}
```

Snippets must include asset `id` and `title` for trace.

## Service hook

`SceneForgeService.getStageContext(projectDir, stage, options?)` — add optional `selectedAssetIds: string[]`.