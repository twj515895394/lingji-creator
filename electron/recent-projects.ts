import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ProjectData } from '../src/lib/project-persistence';
import type { RecentProjectIdentity, RecentProjectEntry } from '../src/lib/electron-api';
import { loadProjectFile } from './project-file';
import { normalizeRecentProjectIdentity } from '../src/lib/recent-project-identity';

const RECENT_PROJECTS_FILE = 'recent-projects.json';
const MAX_RECENT_PROJECTS = 20;

const RECENT_PROJECTS_BACKUP_FILE = 'recent-projects.json.bak';

async function readRecentProjectsFile(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  try {
    const raw = await fs.readFile(
      path.join(userDataPath, RECENT_PROJECTS_FILE),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as RecentProjectEntry[];
    return parsed.filter((p) => Boolean(p?.path));
  } catch {
    return [];
  }
}

/** @deprecated 内部兼容名：读取 JSON 全部有效 path 条目（含缺失目录） */
async function loadRecentProjectsRaw(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  return readRecentProjectsFile(userDataPath);
}

async function enrichRecentProjectEntryAsync(
  entry: RecentProjectEntry,
): Promise<RecentProjectEntry> {
  if (!existsSync(entry.path)) {
    return { ...entry, missing: true };
  }

  const projectData = await tryLoadProjectData(entry.path);
  const coverImageUrl = getSelectedCoverImageUrl(projectData);
  const normalizedIdentity = normalizeRecentProjectIdentity(
    deriveRecentProjectIdentity(projectData, {
      projectKind: entry.projectKind ?? 'script',
      remixEntryIntent: entry.remixEntryIntent,
      remixRoutePath: entry.remixRoutePath,
    }),
  );

  return {
    ...entry,
    missing: false,
    createdAt: projectData?.createdAt ?? entry.createdAt,
    updatedAt: projectData?.updatedAt ?? entry.updatedAt,
    coverImageUrl,
    projectKind: normalizedIdentity.projectKind,
    remixEntryIntent: normalizedIdentity.remixEntryIntent ?? null,
    remixRoutePath: normalizedIdentity.remixRoutePath ?? null,
  };
}

/**
 * 首页加载：只读 JSON + 内存纠偏，不写盘，不删除缺失路径条目。
 */
export async function loadRecentProjects(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  const existing = await readRecentProjectsFile(userDataPath);
  const enriched: RecentProjectEntry[] = [];
  for (const entry of existing) {
    enriched.push(await enrichRecentProjectEntryAsync(entry));
  }
  return enriched;
}

export async function saveRecentProjects(
  userDataPath: string,
  projects: RecentProjectEntry[],
): Promise<void> {
  await fs.mkdir(userDataPath, { recursive: true });
  const target = path.join(userDataPath, RECENT_PROJECTS_FILE);
  const backup = path.join(userDataPath, RECENT_PROJECTS_BACKUP_FILE);
  try {
    await fs.access(target);
    await fs.copyFile(target, backup);
  } catch {
    // 首次写入或无旧文件时不备份
  }
  const serializable = projects.map(({ missing: _missing, ...rest }) => rest);
  await fs.writeFile(target, JSON.stringify(serializable, null, 2), 'utf-8');
}

function isRemixProjectData(projectData: ProjectData | null | undefined): boolean {
  // 必须以 pipelineId === 'reference_remake' 物理字段为唯一真理判定是否是二创 Remix 项目
  return projectData?.type === 'sceneforge' && projectData.sceneforge?.pipelineId === 'reference_remake';
}

function deriveRecentProjectIdentity(
  projectData: ProjectData | null,
  preferredIdentity?: RecentProjectIdentity | null,
): RecentProjectIdentity {
  if (isRemixProjectData(projectData)) {
    const preferred = normalizeRecentProjectIdentity(preferredIdentity);
    return {
      projectKind: 'remix',
      remixEntryIntent: preferred.projectKind === 'remix'
        ? preferred.remixEntryIntent ?? 'asset-ingestion'
        : 'asset-ingestion',
      remixRoutePath: preferred.projectKind === 'remix'
        ? preferred.remixRoutePath ?? '/remix/assets'
        : '/remix/assets',
    };
  }

  if (projectData?.type === 'sceneforge') {
    return { projectKind: 'sceneforge', remixEntryIntent: null, remixRoutePath: null };
  }

  return { projectKind: 'script', remixEntryIntent: null, remixRoutePath: null };
}

function getSelectedCoverImageUrl(projectData: ProjectData | null): string | undefined {
  if (!projectData?.aiAnalysis?.coverCandidates) {
    return undefined;
  }

  const selectedCover = projectData.aiAnalysis.coverCandidates.find(
    (c) => c.selected && c.imageUrl,
  );
  return selectedCover?.imageUrl;
}

async function tryLoadProjectData(projectDir: string): Promise<ProjectData | null> {
  try {
    return await loadProjectFile(projectDir);
  } catch {
    return null;
  }
}

export async function addRecentProject(
  userDataPath: string,
  projectDir: string,
  projectName?: string,
  identity?: RecentProjectIdentity,
): Promise<RecentProjectEntry[]> {
  const existing = await loadRecentProjectsRaw(userDataPath);
  const now = Date.now();

  // 加载项目数据获取封面、时间信息，并用物理项目文件纠偏项目类型。
  const projectData = await tryLoadProjectData(projectDir);
  const coverImageUrl = getSelectedCoverImageUrl(projectData);
  const normalizedIdentity = normalizeRecentProjectIdentity(
    deriveRecentProjectIdentity(projectData, identity),
  );

  const entry: RecentProjectEntry = {
    path: projectDir,
    name: projectName || path.basename(projectDir),
    lastOpenedAt: now,
    createdAt: projectData?.createdAt,
    updatedAt: projectData?.updatedAt,
    coverImageUrl,
    projectKind: normalizedIdentity.projectKind,
    remixEntryIntent: normalizedIdentity.remixEntryIntent ?? null,
    remixRoutePath: normalizedIdentity.remixRoutePath ?? null,
  };

  // 移除已存在的同路径项目，添加到开头
  const filtered = existing.filter((p) => p.path !== projectDir);
  const nextProjects = [entry, ...filtered].slice(0, MAX_RECENT_PROJECTS);

  await saveRecentProjects(userDataPath, nextProjects);
  return loadRecentProjects(userDataPath);
}

export async function removeRecentProject(
  userDataPath: string,
  projectDir: string,
): Promise<RecentProjectEntry[]> {
  const existing = await loadRecentProjectsRaw(userDataPath);
  const filtered = existing.filter((p) => p.path !== projectDir);
  await saveRecentProjects(userDataPath, filtered);
  return loadRecentProjects(userDataPath);
}

export async function refreshRecentProjects(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  const existing = await readRecentProjectsFile(userDataPath);
  const refreshed: RecentProjectEntry[] = [];

  for (const entry of existing) {
    refreshed.push(await enrichRecentProjectEntryAsync(entry));
  }

  await saveRecentProjects(userDataPath, refreshed);
  return refreshed;
}
