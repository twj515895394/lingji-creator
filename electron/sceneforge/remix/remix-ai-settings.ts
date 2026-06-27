import { loadFullHeadlessAISettings } from '../../pipeline/headless-settings';
import { getAISettingsIssue } from '../../../src/lib/ai-settings';
import type { AISettings } from '../../../src/types/ai';

/** 与 SceneForge 主进程阶段一致：从 userData/settings.json 读取全局 AI 配置。 */
export async function loadRemixUnderstandingAISettings(
  userDataPath: string,
): Promise<AISettings | null> {
  try {
    const settings = await loadFullHeadlessAISettings(userDataPath);
    const issue = getAISettingsIssue(settings);
    if (issue) {
      return null;
    }
    return settings;
  } catch {
    return null;
  }
}
