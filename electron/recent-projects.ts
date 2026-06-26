import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ProjectData } from '../src/lib/project-persistence';
import type { RecentProjectIdentity, RecentProjectEntry } from '../src/lib/electron-api';
import { loadProjectFile } from './project-file';
import { normalizeRecentProjectIdentity } from '../src/lib/recent-project-identity';

const RECENT_PROJECTS_FILE = 'recent-projects.json';
const MAX_RECENT_PROJECTS = 20;

async function loadRecentProjectsRaw(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  try {
    const raw = await fs.readFile(
      path.join(userDataPath, RECENT_PROJECTS_FILE),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as RecentProjectEntry[];
    // 过滤掉无效条目
    return parsed.filter((p) => Boolean(p?.path) && existsSync(p.path));
  } catch {
    return [];
  }
}

/**
 * 最近项目列表是首页展示与点击跳转的数据源。这里不能直接信任
 * recent-projects.json 中的 projectKind 缓存，因为它可能被旧版本或错误路由污染。
 * 因此所有对外读取都先走 refreshRecentProjects，用项目目录里的 project.json 纠偏。
 */
export async function loadRecentProjects(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  return refreshRecentProjects(userDataPath);
}

export async function saveRecentProjects(
  userDataPath: string,
  projects: RecentProjectEntry[],
): Promise<void> {
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(
    path.join(userDataPath, RECENT_PROJECTS_FILE),
    JSON.stringify(projects, null, 2),
    'utf-8',
  );
}

function isRemixProjectData(projectData: ProjectData | null | undefined): boolean {
  return projectData?.type === 'sceneforge' && projectData.sceneforge?.entryPath === 'source_intake';
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
  return nextProjects;
}

export async function removeRecentProject(
  userDataPath: string,
  projectDir: string,
): Promise<RecentProjectEntry[]> {
  const existing = await loadRecentProjectsRaw(userDataPath);
  const filtered = existing.filter((p) => p.path !== projectDir);
  await saveRecentProjects(userDataPath, filtered);
  return filtered;
}

export async function refreshRecentProjects(
  userDataPath: string,
): Promise<RecentProjectEntry[]> {
  const existing = await loadRecentProjectsRaw(userDataPath);
  const refreshed: RecentProjectEntry[] = [];

  for (const entry of existing) {
    if (!existsSync(entry.path)) {
      continue;
    }

    // 重新加载项目数据获取最新信息，并以 project.json 为真理源纠偏 projectKind。
    const projectData = await tryLoadProjectData(entry.path);
    const coverImageUrl = getSelectedCoverImageUrl(projectData);
    const normalizedIdentity = normalizeRecentProjectIdentity(
      deriveRecentProjectIdentity(projectData, {
        projectKind: entry.projectKind ?? 'script',
        remixEntryIntent: entry.remixEntryIntent,
        remixRoutePath: entry.remixRoutePath,
      }),
    );

    refreshed.push({
      ...entry,
      createdAt: projectData?.createdAt ?? entry.createdAt,
      updatedAt: projectData?.updatedAt ?? entry.updatedAt,
      coverImageUrl,
      projectKind: normalizedIdentity.projectKind,
      remixEntryIntent: normalizedIdentity.remixEntryIntent ?? null,
      remixRoutePath: normalizedIdentity.remixRoutePath ?? null,
    });
  }

  await saveRecentProjects(userDataPath, refreshed);
  return refreshed;
}
