import { describe, expect, it } from 'vitest';
import { isSidebarStageDoneStatus } from '../src/sceneforge/components/studio/SceneForgeStudioPipelineSidebar';

describe('SceneForge pipeline sidebar status badge', () => {
  it.each(['validated', 'waiting_approval', 'approved', 'completed', 'skipped'] as const)(
    'treats %s as a done status',
    (status) => {
      expect(isSidebarStageDoneStatus(status)).toBe(true);
    },
  );

  it.each(['ready', 'in_progress', 'draft_submitted', 'validation_failed', 'revision_requested'] as const)(
    'keeps %s as a pending status',
    (status) => {
      expect(isSidebarStageDoneStatus(status)).toBe(false);
    },
  );
});
