from __future__ import annotations

import time
from typing import Any

from common import SceneRange, normalize_scenes, scenes_to_boundaries


def run_fast_detection(request: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        from scenedetect import SceneManager, open_video
        from scenedetect.detectors import AdaptiveDetector
    except Exception as exc:  # pragma: no cover - depends on local Python env
        raise RuntimeError(
            "PySceneDetect is not installed. Install resources/shot-detectors/requirements-fast.txt"
        ) from exc

    video_path = str(request["videoPath"])
    fps = float(request.get("fps") or 25)
    duration_ms = int(request.get("durationMs") or 0)
    min_scene_len = max(1, int(round((int(request.get("minShotDurationMs") or 1800) / 1000) * fps)))

    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(
        AdaptiveDetector(
            adaptive_threshold=3.0,
            min_scene_len=min_scene_len,
            window_width=2,
            min_content_val=15.0,
        )
    )
    scene_manager.detect_scenes(video=video, show_progress=False)
    scene_list = scene_manager.get_scene_list()

    raw_scenes: list[SceneRange] = []
    for start_time, end_time in scene_list:
        start_ms = int(round(start_time.get_seconds() * 1000))
        end_ms = int(round(end_time.get_seconds() * 1000))
        raw_scenes.append(
            SceneRange(
                start_ms=start_ms,
                end_ms=end_ms,
                start_frame=start_time.get_frames(),
                end_frame=end_time.get_frames(),
                confidence=0.72,
            )
        )

    scenes = normalize_scenes(raw_scenes, duration_ms=duration_ms, fps=fps)
    boundaries = scenes_to_boundaries(scenes, fps=fps, source="pyscenedetect_adaptive")
    elapsed_ms = int(round((time.perf_counter() - started) * 1000))

    return {
        "mode": request.get("mode", "fast"),
        "detector": "pyscenedetect_adaptive",
        "usedFallback": False,
        "fallbackReason": None,
        "boundaries": boundaries,
        "scenes": [scene.to_json() for scene in scenes],
        "metrics": {
            "elapsedMs": elapsed_ms,
            "frameCount": max(1, int(round((duration_ms / 1000) * fps))) if duration_ms else None,
            "analysisFps": fps,
            "modelDevice": "cpu",
            "rawBoundaryCount": len(boundaries),
            "filteredBoundaryCount": len(boundaries),
        },
        "notes": [
            "fast 模式已调用 PySceneDetect AdaptiveDetector。",
            f"min_scene_len={min_scene_len} frames。",
        ],
    }
