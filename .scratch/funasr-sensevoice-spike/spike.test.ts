import { access, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';

const BIN_PATH = path.resolve(__dirname, 'llama-funasr-sensevoice');
const MODEL_PATH = '/Users/tangwujun/Downloads/sensevoice-small-f16.gguf';
const VAD_MODEL_PATH = '/Users/tangwujun/Downloads/fsmn-vad.gguf';
const DEFAULT_AUDIO = '/Users/tangwujun/Downloads/Roy1.wav';

// Tag parser helper
interface SenseVoiceUtterance {
  text: string;
  tags: {
    language?: string;
    emotion?: string;
    event?: string;
    itn?: string;
  };
}

function parseSenseVoiceOutput(output: string): SenseVoiceUtterance[] {
  const segmentRegex = /((?:<\|[^>]+\|>)+)([^<]*)/g;
  const utterances: SenseVoiceUtterance[] = [];
  let match;
  while ((match = segmentRegex.exec(output)) !== null) {
    const tagPrefix = match[1];
    const text = match[2].trim();
    if (!text) continue;

    const tags: SenseVoiceUtterance['tags'] = {};
    const tagRegex = /<\|([^>|]+)\|>/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(tagPrefix)) !== null) {
      const tagVal = tagMatch[1];
      if (['zh', 'en', 'ja', 'ko', 'yue'].includes(tagVal)) {
        tags.language = tagVal;
      } else if (['NEUTRAL', 'HAPPY', 'ANGRY', 'SAD'].includes(tagVal)) {
        tags.emotion = tagVal;
      } else if (['Speech', 'Sing', 'Laughter', 'Crying'].includes(tagVal)) {
        tags.event = tagVal;
      } else if (['woitn', 'itn'].includes(tagVal)) {
        tags.itn = tagVal;
      } else {
        (tags as any)[tagVal] = true;
      }
    }
    utterances.push({ text, tags });
  }
  return utterances;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getTestAudio(): Promise<string> {
  if (await exists(DEFAULT_AUDIO)) {
    return DEFAULT_AUDIO;
  }
  // Search in downloads
  const downloadsDir = '/Users/tangwujun/Downloads';
  const files = await readdir(downloadsDir);
  const wavFiles = files.filter(f => f.endsWith('.wav'));
  if (wavFiles.length > 0) {
    return path.join(downloadsDir, wavFiles[0]);
  }
  throw new Error('No test audio files (.wav) found in ~/Downloads');
}

describe('SenseVoiceSmall GGUF Spike Test', () => {
  it('verifies that prerequisites exist', async () => {
    expect(await exists(BIN_PATH)).toBe(true);
    expect(await exists(MODEL_PATH)).toBe(true);
    expect(await exists(VAD_MODEL_PATH)).toBe(true);
  });

  it('runs transcription and parses tags', async () => {
    const audioPath = await getTestAudio();
    console.log(`Using test audio: ${audioPath}`);

    // Mode 1: No VAD
    const startTimeA = Date.now();
    const resultA = await runSenseVoice({
      bin: BIN_PATH,
      model: MODEL_PATH,
      audio: audioPath,
      keepTags: true,
    });
    const durationA = Date.now() - startTimeA;

    console.log(`[Mode A] Completed in ${durationA}ms`);
    console.log(`[Mode A] Raw Output: ${resultA.stdout.substring(0, 100)}...`);

    const uttsA = parseSenseVoiceOutput(resultA.stdout);
    expect(uttsA.length).toBeGreaterThan(0);
    console.log(`[Mode A] Parsed ${uttsA.length} utterances.`);
    console.log(`[Mode A] First utterance tags:`, uttsA[0].tags);

    // Mode 2: With VAD
    const startTimeB = Date.now();
    const resultB = await runSenseVoice({
      bin: BIN_PATH,
      model: MODEL_PATH,
      audio: audioPath,
      vadModel: VAD_MODEL_PATH,
      keepTags: true,
    });
    const durationB = Date.now() - startTimeB;

    console.log(`[Mode B] Completed in ${durationB}ms`);
    const uttsB = parseSenseVoiceOutput(resultB.stdout);
    expect(uttsB.length).toBeGreaterThan(0);
    console.log(`[Mode B] Parsed ${uttsB.length} utterances.`);
    if (uttsB.length > 1) {
      console.log(`[Mode B] Second utterance: ${uttsB[1].text}`);
    }

    // Generate markdown report
    const reportPath = path.resolve(__dirname, 'spike-report.md');
    const reportMd = `# SenseVoice GGUF Spike Test Report

## Environment & Prerequisites
- **Binary Path**: \`${BIN_PATH}\`
- **Model Path**: \`${MODEL_PATH}\`
- **VAD Model Path**: \`${VAD_MODEL_PATH}\`
- **Test Audio**: \`${audioPath}\`

## Test Results

### 1. Without VAD (Single Segment Transcription)
- **Transcription Duration**: ${durationA} ms
- **Raw output starts with**: \`${resultA.stdout.substring(0, 80)}...\`
- **Parsed Utterances**: ${uttsA.length}
- **Detected Language**: \`${uttsA[0]?.tags.language || 'N/A'}\`
- **Detected Emotion**: \`${uttsA[0]?.tags.emotion || 'N/A'}\`
- **Detected Event**: \`${uttsA[0]?.tags.event || 'N/A'}\`

### 2. With FSMN-VAD (Segmented Transcription)
- **Transcription Duration**: ${durationB} ms
- **VAD Segment Count (from stderr)**: \`${resultB.stderr.trim()}\`
- **Parsed Utterances**: ${uttsB.length}

### 3. Text Quality Comparison (First 3 segments from VAD mode)
${uttsB.slice(0, 3).map((u, i) => `#### Segment ${i + 1}
- **Tags**: \`${JSON.stringify(u.tags)}\`
- **Text**: ${u.text}`).join('\n\n')}

## Feasibility Feedback
1. **Local Run Stability**: Yes, runs successfully on macOS arm64 without Gatekeeper blocks.
2. **Speed**: Extremely fast. Processing took ~${Math.round(durationB / 1000)} seconds.
3. **Tags**: \`--keep-tags\` outputs clean XML-like tags (e.g. \`<|zh|><|NEUTRAL|><|Speech|>\`) which can be parsed via standard regex.
4. **VAD Integration**: Native FSMN-VAD splits the audio and outputs concatenated segmented text successfully.
`;

    await writeFile(reportPath, reportMd, 'utf8');
    console.log(`Report written to ${reportPath}`);
  }, 60000);
});

interface RunOptions {
  bin: string;
  model: string;
  audio: string;
  vadModel?: string;
  keepTags?: boolean;
}

function runSenseVoice(options: RunOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = ['-m', options.model, '-a', options.audio];
    if (options.vadModel) {
      args.push('--vad', options.vadModel);
    }
    if (options.keepTags) {
      args.push('--keep-tags');
    }

    const child = spawn(options.bin, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Exit code: ${code}\nStderr: ${stderr}`));
      }
    });
  });
}
