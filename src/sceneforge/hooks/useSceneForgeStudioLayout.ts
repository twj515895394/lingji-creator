import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_SIDEBAR = 'sceneforge-studio-sidebar-width-v1';
const STORAGE_INSPECTOR = 'sceneforge-studio-inspector-width-v1';
const HANDLE = 6;
const SIDEBAR_DEFAULT = 272;
const INSPECTOR_DEFAULT = 280;
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 400;
const INSPECTOR_MIN = 220;
const INSPECTOR_MAX = 420;
const CENTER_MIN = 320;

function readStored(key: string, fallback: number): number {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function useSceneForgeStudioLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  useEffect(() => {
    setSidebarWidth(readStored(STORAGE_SIDEBAR, SIDEBAR_DEFAULT));
    setInspectorWidth(readStored(STORAGE_INSPECTOR, INSPECTOR_DEFAULT));
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sidebarMax = useMemo(
    () =>
      clamp(
        SIDEBAR_MAX,
        SIDEBAR_MIN,
        viewportWidth - inspectorWidth - CENTER_MIN - HANDLE * 2,
      ),
    [inspectorWidth, viewportWidth],
  );

  const inspectorMax = useMemo(
    () =>
      clamp(
        INSPECTOR_MAX,
        INSPECTOR_MIN,
        viewportWidth - sidebarWidth - CENTER_MIN - HANDLE * 2,
      ),
    [sidebarWidth, viewportWidth],
  );

  useEffect(() => {
    setSidebarWidth((w) => clamp(w, SIDEBAR_MIN, sidebarMax));
  }, [sidebarMax]);

  useEffect(() => {
    setInspectorWidth((w) => clamp(w, INSPECTOR_MIN, inspectorMax));
  }, [inspectorMax]);

  const persistSidebar = useCallback((next: number) => {
    setSidebarWidth(next);
    try {
      window.localStorage.setItem(STORAGE_SIDEBAR, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const persistInspector = useCallback((next: number) => {
    setInspectorWidth(next);
    try {
      window.localStorage.setItem(STORAGE_INSPECTOR, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const shellGridColumns = `${sidebarWidth}px ${HANDLE}px minmax(0, 1fr) ${HANDLE}px ${inspectorWidth}px`;

  return {
    sidebarWidth,
    inspectorWidth,
    sidebarMin: SIDEBAR_MIN,
    sidebarMax,
    inspectorMin: INSPECTOR_MIN,
    inspectorMax,
    handleThickness: HANDLE,
    shellGridColumns,
    setSidebarWidth: persistSidebar,
    setInspectorWidth: persistInspector,
  };
}

export function shortenStageHint(text: string, maxLen = 22): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}