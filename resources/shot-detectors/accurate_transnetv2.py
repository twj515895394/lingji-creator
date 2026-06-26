from __future__ import annotations

import importlib
import os
import sys
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from common import SceneRange, ms_to_frame, normalize_scenes, scenes_to_boundaries

MODEL_MODULE_CANDIDATES = [
    "transnetv2_pytorch",
    "transnetv2",
    "model",
    "models",
    "net",
    "nets",
    "network",
]

MODEL_CLASS_CANDIDATES = ["TransNetV2", "TransnetV2", "TransNet"]
DEFAULT_MAX_FRAMES = 20000


def max_frames_from_env() -> int:
    raw = os.environ.get("LINGJI_TRANSNETV2_MAX_FRAMES", "").strip()
    if not raw:
        return DEFAULT_MAX_FRAMES
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_MAX_FRAMES


def select_device(torch: Any):
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def import_model_class(vendor_dir: str):
    vendor_path = str(Path(vendor_dir).resolve())
    if vendor_path not in sys.path:
        sys.path.insert(0, vendor_path)

    errors: list[str] = []
    for module_name in MODEL_MODULE_CANDIDATES:
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:
            errors.append(f"{module_name}: {exc}")
            continue
        for class_name in MODEL_CLASS_CANDIDATES:
            model_class = getattr(module, class_name, None)
            if model_class is not None:
                return model_class, module_name, class_name

    raise RuntimeError(
        "Could not find TransNetV2 model class in vendor dir. Tried modules: "
        + ", ".join(MODEL_MODULE_CANDIDATES)
        + ". Errors: "
        + " | ".join(errors[:8])
    )


def normalize_state_dict(checkpoint: Any) -> dict[str, Any]:
    if isinstance(checkpoint, dict):
        for key in ["state_dict", "model_state_dict", "model", "net"]:
            value = checkpoint.get(key)
            if isinstance(value, dict):
                checkpoint = value
                break
    if not isinstance(checkpoint, dict):
        raise RuntimeError("Unsupported TransNetV2 checkpoint format; expected state_dict-like dict.")

    normalized: dict[str, Any] = {}
    for key, value in checkpoint.items():
        normalized[key.removeprefix("module.").removeprefix("model.")] = value
    return normalized


def load_model(model_path: str, vendor_dir: str, torch: Any, device: Any):
    model_class, module_name, class_name = import_model_class(vendor_dir)
    model = model_class()
    checkpoint = torch.load(model_path, map_location=device)
    state_dict = normalize_state_dict(checkpoint)
    try:
        model.load_state_dict(state_dict, strict=True)
    except Exception:
        model.load_state_dict(state_dict, strict=False)
    model.eval()
    model.to(device)
    return model, module_name, class_name


def extract_frames(video_path: str, duration_ms: int, max_frames: int) -> tuple[np.ndarray, float, int]:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 25.0)
    estimated_frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if estimated_frame_count > max_frames:
        capture.release()
        raise RuntimeError(
            f"TransNetV2 accurate mode skipped to avoid OOM: video has about {estimated_frame_count} frames, "
            f"limit is {max_frames}. Set LINGJI_TRANSNETV2_MAX_FRAMES to override or use fast mode."
        )

    frames: list[np.ndarray] = []
    success, frame = capture.read()
    while success:
        if len(frames) >= max_frames:
            capture.release()
            raise RuntimeError(
                f"TransNetV2 accurate mode skipped to avoid OOM: extracted frames exceeded limit {max_frames}. "
                "Set LINGJI_TRANSNETV2_MAX_FRAMES to override or use fast mode."
            )
        resized = cv2.resize(frame, (48, 27), interpolation=cv2.INTER_LINEAR)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        frames.append(rgb)
        success, frame = capture.read()
    capture.release()

    if not frames:
        raise RuntimeError("No frames extracted for TransNetV2 inference.")

    return np.stack(frames).astype(np.uint8), fps, len(frames)


def tensor_to_scores(output: Any, torch: Any) -> np.ndarray:
    if isinstance(output, dict):
        for key in ["single_frame", "single_frame_pred", "one_hot", "predictions", "logits"]:
            if key in output:
                output = output[key]
                break
        else:
            output = next(iter(output.values()))
    elif isinstance(output, (tuple, list)):
        output = output[0]

    if not hasattr(output, "detach"):
        raise RuntimeError("Unsupported TransNetV2 output type; expected tensor-like output.")

    tensor = output.detach().float()
    if tensor.numel() == 0:
        raise RuntimeError("TransNetV2 returned empty predictions.")
    if torch.min(tensor).item() < 0 or torch.max(tensor).item() > 1:
        tensor = torch.sigmoid(tensor)
    return tensor.cpu().numpy().reshape(-1)


def pick_boundaries(scores: np.ndarray, fps: float, min_shot_duration_ms: int) -> list[dict[str, Any]]:
    if len(scores) < 3:
        return []

    threshold = float(np.clip(np.mean(scores) + np.std(scores), 0.35, 0.65))
    min_distance_frames = max(1, ms_to_frame(min_shot_duration_ms, fps))
    candidates: list[tuple[int, float]] = []

    for index in range(1, len(scores) - 1):
        score = float(scores[index])
        if score < threshold:
            continue
        if score >= float(scores[index - 1]) and score >= float(scores[index + 1]):
            candidates.append((index, score))

    selected: list[tuple[int, float]] = []
    for frame_index, score in sorted(candidates, key=lambda item: item[1], reverse=True):
        if all(abs(frame_index - existing) >= min_distance_frames for existing, _ in selected):
            selected.append((frame_index, score))

    return [
        {
            "timeMs": int(round((frame_index / max(0.001, fps)) * 1000)),
            "frameIndex": frame_index,
            "confidence": round(float(score), 2),
            "sources": ["transnetv2_single_frame"],
            "boundaryType": "hard_cut",
            "rawScore": round(float(score), 4),
        }
        for frame_index, score in sorted(selected, key=lambda item: item[0])
    ]


def boundaries_to_scenes(boundaries: list[dict[str, Any]], duration_ms: int, fps: float) -> list[SceneRange]:
    times = [0, *[int(boundary["timeMs"]) for boundary in boundaries], duration_ms]
    scenes: list[SceneRange] = []
    for index in range(len(times) - 1):
        start_ms = times[index]
        end_ms = times[index + 1]
        if end_ms <= start_ms:
            continue
        confidence = 1.0 if index == len(times) - 2 else float(boundaries[index].get("confidence", 0.75))
        scenes.append(
            SceneRange(
                start_ms=start_ms,
                end_ms=end_ms,
                start_frame=ms_to_frame(start_ms, fps),
                end_frame=ms_to_frame(end_ms, fps),
                confidence=confidence,
            )
        )
    return normalize_scenes(scenes, duration_ms, fps)


def run_accurate_detection(request: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    model_path = request.get("modelPath")
    vendor_dir = request.get("modelVendorDir")
    if not model_path:
        raise RuntimeError("TransNetV2 modelPath is required for accurate mode.")
    if not vendor_dir:
        raise RuntimeError("TransNetV2 modelVendorDir is required for accurate mode.")

    try:
        import torch
    except Exception as exc:  # pragma: no cover - depends on local Python env
        raise RuntimeError("torch is not installed. Install resources/shot-detectors/requirements-accurate.txt") from exc

    duration_ms = int(request.get("durationMs") or 0)
    min_shot_duration_ms = int(request.get("minShotDurationMs") or 1200)
    max_frames = int(request.get("maxFrames") or max_frames_from_env())
    frames, fps, frame_count = extract_frames(str(request["videoPath"]), duration_ms, max_frames)
    device = select_device(torch)
    model, module_name, class_name = load_model(str(model_path), str(vendor_dir), torch, device)

    with torch.no_grad():
        tensor = torch.from_numpy(frames).unsqueeze(0).to(device)
        output = model(tensor)
        scores = tensor_to_scores(output, torch)

    boundaries = pick_boundaries(scores, fps=fps, min_shot_duration_ms=min_shot_duration_ms)
    scenes = boundaries_to_scenes(boundaries, duration_ms=duration_ms, fps=fps)
    if not boundaries and len(scenes) <= 1:
        # Keep schema stable; model can legitimately find no cuts in single-shot footage.
        boundaries = scenes_to_boundaries(scenes, fps=fps, source="transnetv2_single_frame")

    elapsed_ms = int(round((time.perf_counter() - started) * 1000))
    return {
        "mode": "accurate",
        "detector": "transnetv2",
        "usedFallback": False,
        "fallbackReason": None,
        "boundaries": boundaries,
        "scenes": [scene.to_json() for scene in scenes],
        "metrics": {
            "elapsedMs": elapsed_ms,
            "frameCount": frame_count,
            "analysisFps": fps,
            "modelDevice": str(device),
            "rawBoundaryCount": len(boundaries),
            "filteredBoundaryCount": len(boundaries),
            "maxFrames": max_frames,
        },
        "notes": [
            f"accurate 模式已调用 TransNetV2：{module_name}.{class_name}",
            f"modelPath={model_path}",
            f"vendorDir={vendor_dir}",
        ],
    }
