import { describe, expect, it } from 'vitest';
import { registerPipelineMcpTools } from '../electron/pipeline/tools/register';

class FakeMcpServer {
  tools = new Map<string, { def: unknown; handler: unknown }>();

  registerTool(name: string, def: unknown, handler: unknown): void {
    this.tools.set(name, { def, handler });
  }
}

describe('SceneForge MCP tools', () => {
  it('registers SceneForge tools through the pipeline MCP registry', () => {
    const server = new FakeMcpServer();

    registerPipelineMcpTools(
      server as never,
      () => null,
      () => '/tmp/lingji-userdata',
    );

    expect([...server.tools.keys()]).toEqual(expect.arrayContaining([
      'scene_get_project_state',
      'scene_get_stage_context',
      'scene_submit_stage_draft',
      'scene_validate_stage',
      'scene_approve_stage',
      'scene_set_approval_policy',
      'scene_list_artifacts',
      'scene_read_artifact',
      'scene_export_prompt_pack',
    ]));

    expect(JSON.stringify(server.tools.get('scene_submit_stage_draft')?.def)).toContain('artifactKey');
    expect(JSON.stringify(server.tools.get('scene_submit_stage_draft')?.def)).not.toContain('"path"');
  });
});
