# SenseVoice GGUF Spike Test Report

## Environment & Prerequisites
- **Binary Path**: `/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/funasr-sensevoice-spike/llama-funasr-sensevoice`
- **Model Path**: `/Users/tangwujun/Downloads/sensevoice-small-f16.gguf`
- **VAD Model Path**: `/Users/tangwujun/Downloads/fsmn-vad.gguf`
- **Test Audio**: `/Users/tangwujun/Downloads/Roy1.wav`

## Test Results

### 1. Without VAD (Single Segment Transcription)
- **Transcription Duration**: 11572 ms
- **Raw output starts with**: `<|zh|><|NEUTRAL|><|Speech|><|woitn|>他曾因学业成绩太差而错过了二零零二年参加和姚明同届选秀直到二零零六年才加入 nba 并且...`
- **Parsed Utterances**: 1
- **Detected Language**: `zh`
- **Detected Emotion**: `NEUTRAL`
- **Detected Event**: `Speech`

### 2. With FSMN-VAD (Segmented Transcription)
- **Transcription Duration**: 4368 ms
- **VAD Segment Count (from stderr)**: `[sensevoice] 24 vad segments
[sensevoice] done 4.19s`
- **Parsed Utterances**: 24

### 3. Text Quality Comparison (First 3 segments from VAD mode)
#### Segment 1
- **Tags**: `{"language":"zh","emotion":"NEUTRAL","event":"Speech"}`
- **Text**: 他曾因学业成绩太差而错过了二零零二年参加和姚明同届选秀直到二零零六年才加入 nba a 并且拿到了那个赛季的最佳新秀说的就是他布兰登罗伊

#### Segment 2
- **Tags**: `{"language":"zh","emotion":"NEUTRAL","event":"Speech","itn":"woitn"}`
- **Text**: 二零零二年罗伊原本打算高中毕业准备投入全部精力到 n b a 选秀但是由于学习成绩不理想而退出了选秀最后他进入了华盛顿大学就读想要进入大学球队打 n c a 他必须通过最基本的学习测验而他一共参加了四次才得以通过及格线

#### Segment 3
- **Tags**: `{"language":"zh","emotion":"NEUTRAL","event":"Speech","itn":"woitn"}`
- **Text**: 加入华盛顿大学球队的布兰登罗伊大一赛季场均仅仅能够得到六点一分大二赛季有了一定提升但是大三赛季出场时间下降他的提升看起来并不大直到大四那一年罗伊取得了较为长足的进步场均能够贡献二十点二分五点六个篮板以及四点一次助攻投篮命中率能达到百分之五十点八

## Feasibility Feedback
1. **Local Run Stability**: Yes, runs successfully on macOS arm64 without Gatekeeper blocks.
2. **Speed**: Extremely fast. Processing took ~4 seconds.
3. **Tags**: `--keep-tags` outputs clean XML-like tags (e.g. `<|zh|><|NEUTRAL|><|Speech|>`) which can be parsed via standard regex.
4. **VAD Integration**: Native FSMN-VAD splits the audio and outputs concatenated segmented text successfully.
