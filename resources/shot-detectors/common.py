from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SceneRange:
    start_ms: int
    end_ms: int
    start_frame: int
    end_frame: int
    confidence: float

    @property
    def duration_ms(self) -> int:
        return max(0, self.end_ms - self.start_ms)

    def to_json(self) -> dict[str, Any]:
        return {
            "startMs": self.start_ms,
            "endMs": self.end_ms,
            "durationMs": self.duration_ms,
            "startFrame": self.start_frame,
            "endFrame": self.end_frame,
            "confidence": self.confidence,
        }


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def frame_to_ms(frame_index: int, fps: float) -> int:
    safe_fps = max(0.001, fps)
    return int(round((frame_index / safe_fps) * 1000))


def ms_to_frame(time_ms: int, fps: float) -> int:
    safe_fps = max(0.001, fps)
    return int(round((time_ms / 1000) * safe_fps))


def normalize_scenes(raw_scenes: list[SceneRange], duration_ms: int, fps: float) -> list[SceneRange]:
    if duration_ms <= 0:
        return []

    if not raw_scenes:
        return [
            SceneRange(
                start_ms=0,
                end_ms=duration_ms,
                start_frame=0,
                end_frame=ms_to_frame(duration_ms, fps),
                confidence=0.55,
            )
        ]

    normalized: list[SceneRange] = []
    cursor = 0
    for scene in sorted(raw_scenes, key=lambda item: item.start_ms):
        start_ms = int(clamp(scene.start_ms, 0, duration_ms))
        end_ms = int(clamp(scene.end_ms, start_ms, duration_ms))
        if start_ms > cursor:
            start_ms = cursor
        if end_ms <= start_ms:
            continue
        normalized.append(
            SceneRange(
                start_ms=start_ms,
                end_ms=end_ms,
                start_frame=ms_to_frame(start_ms, fps),
                end_frame=ms_to_frame(end_ms, fps),
                confidence=scene.confidence,
            )
        )
        cursor = end_ms

    if not normalized:
        return [
            SceneRange(
                start_ms=0,
                end_ms=duration_ms,
                start_frame=0,
                end_frame=ms_to_frame(duration_ms, fps),
                confidence=0.55,
            )
        ]

    last = normalized[-1]
    if last.end_ms < duration_ms:
        normalized[-1] = SceneRange(
            start_ms=last.start_ms,
            end_ms=duration_ms,
            start_frame=last.start_frame,
            end_frame=ms_to_frame(duration_ms, fps),
            confidence=last.confidence,
        )

    first = normalized[0]
    if first.start_ms > 0:
        normalized[0] = SceneRange(
            start_ms=0,
            end_ms=first.end_ms,
            start_frame=0,
            end_frame=first.end_frame,
            confidence=first.confidence,
        )

    return normalized


def scenes_to_boundaries(scenes: list[SceneRange], fps: float, source: str) -> list[dict[str, Any]]:
    boundaries: list[dict[str, Any]] = []
    for previous, current in zip(scenes, scenes[1:]):
        confidence = round(max(previous.confidence, current.confidence), 2)
        boundaries.append(
            {
                "timeMs": current.start_ms,
                "frameIndex": ms_to_frame(current.start_ms, fps),
                "confidence": confidence,
                "sources": [source],
                "boundaryType": "hard_cut",
                "rawScore": None,
            }
        )
    return boundaries
