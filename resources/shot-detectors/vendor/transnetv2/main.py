from transnetv2_pytorch import TransNetV2
from typing import Optional
import torch
import os
import numpy as np
from PIL import Image, ImageDraw
import argparse
from tqdm import tqdm

try:
    import ffmpeg
except ModuleNotFoundError:
    raise ModuleNotFoundError("For `predict_video` function `ffmpeg` needs to be installed in order to extract "
                                "individual frames from video file. Install `ffmpeg` command line tool and then "
                                "install python wrapper by `pip install ffmpeg-python`.")


class TransNetV2Torch:
    def __init__(self, model_path: Optional[str] = None):
        weights_path = model_path or os.path.join(os.path.dirname(__file__), "transnetv2-pytorch-weights.pth")
        if not os.path.isfile(weights_path):
            raise FileNotFoundError(f"[TransNetV2] ERROR: weights file not found at {weights_path}.")
        else:
            print(f"[TransNetV2] Using weights from {weights_path}.")

        self._input_size = (27, 48, 3)
        self.model = TransNetV2()
        try:
            self.model.load_state_dict(torch.load(weights_path))
        except Exception as exc:
            raise IOError(f"[TransNetV2] Could not load weights from {weights_path}.") from exc
        self.model.eval()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)


    def predict_raw(self, frames: np.ndarray):
        assert len(frames.shape) == 5 and frames.shape[2:] == self._input_size, \
            "[TransNetV2] Input shape must be [batch, frames, height, width, 3]."
        
        frames_tensor = torch.from_numpy(frames)
        with torch.no_grad():
            single_frame_pred, all_frames_pred = self.model(frames_tensor.to(self.device))
            
            single_frame_pred = torch.sigmoid(single_frame_pred).cpu().numpy()
            all_frames_pred = torch.sigmoid(all_frames_pred["many_hot"]).cpu().numpy()

        return single_frame_pred, all_frames_pred

    def predict_frames(self, frames: np.ndarray):
        assert len(frames.shape) == 4 and frames.shape[1:] == self._input_size, \
            "[TransNetV2] Input shape must be [frames, height, width, 3]."

        total = len(frames)

        def input_iterator():
            # return windows of size 100 where the first/last 25 frames are from the previous/next batch
            # the first and last window must be padded by copies of the first and last frame of the video
            no_padded_frames_start = 25
            no_padded_frames_end = 25 + 50 - (total % 50 if total % 50 != 0 else 50)  # 25 - 74

            start_frame = np.expand_dims(frames[0], 0)
            end_frame = np.expand_dims(frames[-1], 0)
            padded_inputs = np.concatenate(
                [start_frame] * no_padded_frames_start + [frames] + [end_frame] * no_padded_frames_end, 0
            )

            ptr = 0
            while ptr + 100 <= len(padded_inputs):
                out = padded_inputs[ptr:ptr + 100]
                ptr += 50
                yield out[np.newaxis]

        predictions = []

        with tqdm(total=total, desc="[TransNetV2] Processing video frames", unit="frames") as pbar:
            for inp in input_iterator():
                single_frame_pred, all_frames_pred = self.predict_raw(inp)
                predictions.append((single_frame_pred[0, 25:75, 0],
                                    all_frames_pred[0, 25:75, 0]))

                processed = min(len(predictions) * 50, total)
                pbar.n = processed
                pbar.last_print_n = processed
                pbar.refresh()

        single_frame_pred = np.concatenate([single_ for single_, _ in predictions])
        all_frames_pred = np.concatenate([all_ for _, all_ in predictions])

        return single_frame_pred[:total], all_frames_pred[:total]


    def predict_video(self, video_fn: str):
        print("[TransNetV2] Extracting frames from {}".format(video_fn))
        video_stream, _ = ffmpeg.input(video_fn).output(
            "pipe:", format="rawvideo", pix_fmt="rgb24", s="48x27"
        ).run(capture_stdout=True, capture_stderr=True)

        video = np.frombuffer(video_stream, np.uint8).reshape([-1, 27, 48, 3])
        return (video, *self.predict_frames(video))

    @staticmethod
    def predictions_to_scenes(predictions: np.ndarray, threshold: float = 0.5):
        predictions = (predictions > threshold).astype(np.uint8)

        scenes = []
        t_prev, start = 0, 0
        for i, t in enumerate(predictions):
            if t_prev == 1 and t == 0:
                start = i
            if t_prev == 0 and t == 1 and i != 0:
                scenes.append([start, i])
            t_prev = t
        if t == 0:
            scenes.append([start, i])
        if len(scenes) == 0: # just fix if all predictions are 1
            return np.array([[0, len(predictions) - 1]], dtype=np.int32)

        return np.array(scenes, dtype=np.int32)

    @staticmethod
    def visualize_predictions(frames: np.ndarray, predictions):

        if isinstance(predictions, np.ndarray):
            predictions = [predictions]

        ih, iw, ic = frames.shape[1:]
        width = 25

        # pad frames so that length of the video is divisible by width
        # pad frames also by len(predictions) pixels in width in order to show predictions
        pad_with = width - len(frames) % width if len(frames) % width != 0 else 0
        frames = np.pad(frames, [(0, pad_with), (0, 1), (0, len(predictions)), (0, 0)])

        predictions = [np.pad(x, (0, pad_with)) for x in predictions]
        height = len(frames) // width

        img = frames.reshape([height, width, ih + 1, iw + len(predictions), ic])
        img = np.concatenate(np.split(
            np.concatenate(np.split(img, height), axis=2)[0], width
        ), axis=2)[0, :-1]

        img = Image.fromarray(img)
        draw = ImageDraw.Draw(img)

        for i, pred in enumerate(zip(*predictions)):
            x, y = i % width, i // width
            x, y = x * (iw + len(predictions)) + iw, y * (ih + 1) + ih - 1

            # we can visualize multiple predictions per single frame
            for j, p in enumerate(pred):
                color = [0, 0, 0]
                color[(j + 1) % 3] = 255

                value = round(p * (ih - 1))
                if value != 0:
                    draw.line((x + j, y, x + j, y - value), fill=tuple(color), width=1)
        return img

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--files", type=str, help="path to video files to process")
    parser.add_argument("--weights", type=str, default=None,
                        help="path to TransNet V2 weights, tries to infer the location if not specified")
    parser.add_argument('--visualize', action="store_true",
                        help="save a png file with prediction visualization for each extracted video")
    args = parser.parse_args()
    
    return args

def main(args):
    model = TransNetV2Torch(args.weights)

    files = []
    if os.path.isdir(args.files):
        for f in os.listdir(args.files):
            if f.lower().endswith(".mp4"):
                files.append(os.path.join(args.files, f))
    else:
        files = [args.files]

    for file in files:
        video_frames, single_frame_predictions, all_frames_predictions = \
            model.predict_video(file)

        predictions = np.stack([single_frame_predictions, all_frames_predictions], 1)
        np.savetxt(file + ".predictions.txt", predictions, fmt="%.6f")

        scenes = model.predictions_to_scenes(single_frame_predictions)
        np.savetxt(file + ".scenes.txt", scenes, fmt="%d")

        if args.visualize:
            pil_image = model.visualize_predictions(
                video_frames, predictions=(single_frame_predictions, all_frames_predictions))
            pil_image.save(file + ".vis.png")

if __name__ == "__main__":
    args = parse_args()
    main(args)