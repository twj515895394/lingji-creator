import { describe, expect, it } from 'vitest';
import {
  validateAssetPlanSemantic,
  validateAudioDesignSemantic,
  validatePerformanceDirectionSemantic,
  validateScriptDraftSemantic,
} from '../electron/sceneforge/validators/semantic-support-stages';
import {
  extractPerformanceTopicAnchorFromScript,
  validatePerformanceTopicDrift,
} from '../electron/sceneforge/validators/performance-topic-anchor';

describe('semantic support stage validators', () => {
    it('does not flag beat-level ranges in handoff as segment_strategy boundary cross', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        '- **单段目标时长 (segment_duration_seconds)**: 10秒',
        '- **分段规划**:',
        '  - **Segment 1 (0-10s)**: 街头运球',
        '  - **Segment 2 (10-20s)**: 小院射门',
        '',
        '## story_beats',
        '- **beat_01 (0-3s)**: 启程',
        '- **beat_02 (3-7s)**: 避障',
        '- **beat_03 (7-10s)**: 进门',
        '- **beat_04 (10-15s)**: 抽射',
        '- **beat_05 (15-20s)**: 庆祝',
        '',
        '## video_generation_unit_plan',
        '### VGU 1 (0-10s)',
        '- **Narrative Goal**: 运球',
        '- **Pacing Profile**: Dynamic',
        '- **Shot Density Hint**: 高动势拆镜头',
        '### VGU 2 (10-20s)',
        '- **Narrative Goal**: 射门',
        '- **Pacing Profile**: Build-up',
        '- **Shot Density Hint**: 中密度',
        '',
        '## script_body',
        '### Segment 1 (0-10s)',
        '**[声音轨道]**: 呼吸与球声。无台词。',
        '* **0-3s**: 动作：盘带。视线：专注。停顿：0.3秒。',
        '* **3-7s**: 动作：变向。视线：扫视障碍。',
        '### Segment 2 (10-20s)',
        '* **10-15s**: 动作：凌空抽射。停顿：滞空。',
        '* **15-20s**: 动作：奔跑庆祝。',
        '',
        '## performance_handoff',
        '- 12s-13s 滞空停顿，视线与表情节奏要明确。',
        '',
        '## storyboard_handoff',
        '- 镜头：低机位跟拍。',
        '- boundary_lock: 10秒处绝对剪辑，不得跨 10.0s 边界。',
        '- beat_04 (10-15s) 用侧面中景承接。',
      ].join('\n');
      const result = validateScriptDraftSemantic(content);
      expect(result.issues.some((i) => i.code === 'SCRIPT_SEGMENT_BOUNDARY_CROSSED')).toBe(
        false,
      );
      expect(result.ok).toBe(true);
    });

    it('passes real world cup script draft with bold segment_duration and VGU headings', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        '- **segment_duration_seconds**: 10秒',
        '- **各段时间范围**:',
        '  - **Segment 1**: `0.0s - 10.0s` —— 街头运球',
        '  - **Segment 2**: `10.0s - 20.0s` —— 小院射门',
        '',
        '## story_beats',
        '- **beat_01**: 抛球启程',
        '- **beat_02**: 避障华尔兹',
        '- **beat_03**: 冲向主场',
        '',
        '## video_generation_unit_plan',
        '### VGU_01 (0.0s - 10.0s)',
        '- **Pacing Profile**: 动感、节奏感强',
        '- **Shot Density Hint**: 高动势拆镜头',
        '- **Narrative Goal**: 建立运球',
        '### VGU_02 (10.0s - 20.0s)',
        '- **Pacing Profile**: 蓄力慢动作',
        '- **Shot Density Hint**: 戏剧性中景',
        '- **Narrative Goal**: 凌空抽射',
        '',
        '## script_body',
        '### 段落一',
        '旁白：起跑。',
        '动作：停顿0.5秒后抬眼看向足球。',
        '',
        '### 段落二',
        '对白：我们走吧。',
        '动作：蹬地身体倾斜定格慢动作。',
        '',
        '## performance_handoff',
        '- 关键停顿：0.5秒起跑前停顿，视线从疲惫到专注。',
        '',
        '## storyboard_handoff',
        '- 镜头：低角度跟拍。',
        '- boundary_lock: Segment 1 (0.0s - 10.0s) 不得跨 10.0s 边界。',
      ].join('\n');
      const result = validateScriptDraftSemantic(content);
      expect(result.issues.filter((i) => i.code === 'SCRIPT_SEGMENT_STRATEGY_TOO_THIN')).toEqual([]);
      expect(result.ok).toBe(true);
    });


  describe('script_draft', () => {
    it('passes structured script with segments and dialogue', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 10-20s',
        '',
        '## story_beats',
        '- beat_id: B01',
        '  beat_summary: 开场建立压迫感。',
        '- beat_id: B02',
        '  beat_summary: 冲突升级。',
        '- beat_id: B03',
        '  beat_summary: 压场反击。',
        '',
        '## video_generation_unit_plan',
        '- vgu_id: VGU-01',
        '  linked_beat_ids:',
        '    - B01',
        '  narrative_goal: 建立关系',
        '  pacing_profile: balanced',
        '  shot_density_hint: 中密度',
        '  target_duration_seconds: 12',
        '- vgu_id: VGU-02',
        '  linked_beat_ids:',
        '    - B02',
        '    - B03',
        '  narrative_goal: 完成升级与反击',
        '  pacing_profile: kinetic',
        '  shot_density_hint: 高密度',
        '  target_duration_seconds: 18',
        '',
        '## script_body',
        '## 段一',
        '旁白：开场介绍产品。',
        '动作：角色先停顿，再抬眼看向对手。',
        '',
        '## 段二',
        '对白：角色 A：我们出发吧。',
        '动作：角色 B 后退半步，手碰到道具。',
        '',
        '## performance_handoff',
        '- 停顿后抬眼，reaction hold 半拍。',
        '',
        '## storyboard_handoff',
        '- 先给中景，再切近景，保持道具连续性。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');
      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('fails empty shell without segments', () => {
      const result = validateScriptDraftSemantic('# 剧本\n\n待定。');
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'SCRIPT_MISSING_SEGMENTS')).toBe(
        true,
      );
    });

    it('fails when video plan and handoff are empty shells', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 10-20s',
        '',
        '## story_beats',
        '- beat_id: B01',
        '- beat_id: B02',
        '- beat_id: B03',
        '',
        '## video_generation_unit_plan',
        '- VGU-01',
        '',
        '## script_body',
        '## 段一',
        '旁白：先说一句。',
        '',
        '## performance_handoff',
        '待补充',
        '',
        '## storyboard_handoff',
        '待补充',
      ].join('\n');
      const result = validateScriptDraftSemantic(content);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'SCRIPT_VIDEO_PLAN_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_PACING_HANDOFF_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_PERFORMANCE_HANDOFF_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_STORYBOARD_HANDOFF_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_BOUNDARY_LOCK_TOO_THIN')).toBe(true);
    });

    it('accepts markdown-emphasis beat format from real drafts', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 10-20s',
        '',
        '## story_beats',
        '- **beat_01**: 抛球启程 (0-3s)',
        '  - **动作摘要**: 男孩将复古皮革足球抛起，用脚背稳稳接住并向前盘带。',
        '  - **情绪目标**: 期待与专注。',
        '- **beat_02**: 避障华尔兹 (3-7s)',
        '  - **动作摘要**: 男孩通过灵活脚内侧拨球与快速变向，轻巧绕过障碍。',
        '  - **情绪目标**: 紧张与兴奋。',
        '- **beat_03**: 冲向主场 (7-10s)',
        '  - **动作摘要**: 男孩带球冲向木门，在门前将球挑起，顺势闪入小院。',
        '  - **情绪目标**: 期待与仪式感。',
        '- **beat_04**: 凌空抽射 (10-15s)',
        '  - **动作摘要**: 男孩调整步伐，身体向一侧倾斜，完成凌空抽射。',
        '  - **情绪目标**: 震撼与高光。',
        '',
        '## video_generation_unit_plan',
        '- vgu_id: VGU-01',
        '  linked_beat_ids:',
        '    - beat_01',
        '    - beat_02',
        '  narrative_goal: 建立带球节奏并完成避障',
        '  pacing_profile: balanced',
        '  shot_density_hint: 中密度',
        '  target_duration_seconds: 7',
        '- vgu_id: VGU-02',
        '  linked_beat_ids:',
        '    - beat_03',
        '    - beat_04',
        '  narrative_goal: 冲向主场并完成凌空抽射',
        '  pacing_profile: kinetic',
        '  shot_density_hint: 高密度',
        '  target_duration_seconds: 8',
        '',
        '## script_body',
        '## 第1段',
        '旁白：放学路上的黄昏，被一记抛球点亮。',
        '动作：男孩脚背稳稳接球，眼神从疲惫转为专注。',
        '',
        '## 第2段',
        '旁白：碎石路和木门都在为这次进攻让路。',
        '动作：他连续变向、冲门、挑球，再顺势闪入小院。',
        '',
        '## performance_handoff',
        '- 带球段落强调专注眼神与身体前倾。',
        '- 抽射前保留半拍蓄力停顿。',
        '',
        '## storyboard_handoff',
        '- 保持足球、木门和冲门方向的连续性。',
        '- 抽射瞬间优先给中近景与球路承接。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');
      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('accepts screenshot-style bold beat headings with title inside emphasis', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 10-20s',
        '',
        '## story_beats',
        '- **beat_01: 抛球启程 (0-3s)**',
        '  - **动作摘要**: 放学路上的黄昏，男孩将复古皮革足球抛起，用脚背稳稳接住并向前盘带。',
        '  - **情绪目标**: 期待与专注。',
        '- **beat_02: 避障华尔兹 (3-7s)**',
        '  - **动作摘要**: 男孩通过灵活脚内侧拨球与快速变向，轻巧绕过障碍，保持球不离脚。',
        '  - **情绪目标**: 紧张与兴奋。',
        '- **beat_03: 冲向主场 (7-10s)**',
        '  - **动作摘要**: 男孩带球冲向木门，在门前将球挑起，顺势闪入小院。',
        '  - **情绪目标**: 期待与仪式感。',
        '- **beat_04: 凌空抽射 (10-15s)**',
        '  - **动作摘要**: 小院内，足球在空中落下，男孩调整步伐后完成凌空抽射。',
        '  - **情绪目标**: 震撼与高光。',
        '- **beat_05: 胜利狂欢 (15-20s)**',
        '  - **动作摘要**: 足球撞入自制球门，男孩张开双臂在院子里奔跑庆祝。',
        '  - **情绪目标**: 纯粹的快乐与满足。',
        '',
        '## video_generation_unit_plan',
        '- vgu_id: VGU-01',
        '  linked_beat_ids:',
        '    - beat_01',
        '    - beat_02',
        '  narrative_goal: 建立带球节奏并完成避障',
        '  pacing_profile: balanced',
        '  shot_density_hint: 中密度',
        '  target_duration_seconds: 7',
        '- vgu_id: VGU-02',
        '  linked_beat_ids:',
        '    - beat_03',
        '    - beat_04',
        '    - beat_05',
        '  narrative_goal: 冲向主场、完成抽射并进入狂欢',
        '  pacing_profile: kinetic',
        '  shot_density_hint: 高密度',
        '  target_duration_seconds: 13',
        '',
        '## script_body',
        '## 第1段',
        '旁白：放学路上的黄昏，被一记抛球点亮。',
        '动作：男孩脚背稳稳接球，眼神从疲惫转为专注。',
        '',
        '## 第2段',
        '旁白：碎石路、木门和自制球门，都成了他这次进攻的主场。',
        '动作：他连续变向、冲门、挑球、抽射，最后张开双臂奔跑庆祝。',
        '',
        '## performance_handoff',
        '- 带球段落强调专注眼神与身体前倾。',
        '- 抽射前保留半拍蓄力停顿，庆祝段落释放肩膀和呼吸。',
        '',
        '## storyboard_handoff',
        '- 保持足球、木门和冲门方向的连续性。',
        '- 抽射与庆祝瞬间优先给中近景与球路承接。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');
      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('accepts numbered section headings from real generated drafts', () => {
      const content = [
        '# 剧本草案：放学路上的“世界杯”',
        '',
        '## 2. segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 10-20s',
        '',
        '## 3. story_beats',
        '- **beat_01: 抛球启程 (0-3s)**',
        '  - **剧情/动作摘要**: 男孩将足球抛下，用脚接住并开始向前盘带。',
        '- **beat_02: 避障华尔兹 (3-7s)**',
        '  - **剧情/动作摘要**: 男孩灵活变向，轻巧绕过障碍。',
        '- **beat_03: 冲向主场 (7-10s)**',
        '  - **剧情/动作摘要**: 男孩挑球、顶门、人球合一地闪入小院。',
        '- **beat_04: 凌空抽射 (10-15s)**',
        '  - **剧情/动作摘要**: 男孩完成凌空抽射。',
        '- **beat_05: 胜利狂欢 (15-20s)**',
        '  - **剧情/动作摘要**: 男孩张臂奔跑庆祝。',
        '',
        '## 5. video_generation_unit_plan',
        '- **VGU 1: 街头运球挑战 (0-10s)**',
        '  - **Narrative Goal**：展现男孩在石子路上的运球技巧。',
        '  - **对应 Beat**：beat_01, beat_02, beat_03',
        '  - **pacing_profile**：balanced',
        '  - **shot_density_hint**：中密度',
        '- **VGU 2: 小院高光射门 (10-20s)**',
        '  - **Narrative Goal**：完成终极射门挑战。',
        '  - **对应 Beat**：beat_04, beat_05',
        '  - **pacing_profile**：kinetic',
        '  - **shot_density_hint**：高密度',
        '',
        '## 6. script_body',
        '### Segment 1: 街头盘带 (0-10s)',
        '旁白：男孩起跑时，黄昏被球声点亮。',
        '动作锚点：脚背接球、快速变向、顶门入院。',
        '',
        '### Segment 2: 小院高光 (10-20s)',
        '旁白：球在夕阳里落下，男孩完成凌空抽射。',
        '动作锚点：蓄力停顿、凌空抽射、张臂庆祝。',
        '',
        '## 7. performance_handoff',
        '- 眼神从疲惫切到专注，射门前保留半拍停顿。',
        '',
        '## 8. storyboard_handoff',
        '- 保持挑球入门、射门和庆祝的镜头连续性与球路承接。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');
      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('fails when segment strategy misses time ranges and pacing handoff', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        '三段递进。',
        '',
        '## story_beats',
        '- beat_id: B01',
        '  beat_summary: 开场建立。',
        '- beat_id: B02',
        '  beat_summary: 冲突升级。',
        '- beat_id: B03',
        '  beat_summary: 高潮反击。',
        '',
        '## video_generation_unit_plan',
        '- vgu_id: VGU-01',
        '  linked_beat_ids:',
        '    - B01',
        '  narrative_goal: 建立关系',
        '  target_duration_seconds: 10',
        '- vgu_id: VGU-02',
        '  linked_beat_ids:',
        '    - B02',
        '    - B03',
        '  narrative_goal: 完成升级与反击',
        '  target_duration_seconds: 10',
        '',
        '## script_body',
        '## 第1段',
        '旁白：一句开场。',
        '动作：角色停顿后抬眼。',
        '',
        '## 第2段',
        '对白：我们开始吧。',
        '动作：角色后退半步。',
        '',
        '## performance_handoff',
        '- 停顿后抬眼。',
        '',
        '## storyboard_handoff',
        '- 保持镜头连续性。',
      ].join('\n');
      const result = validateScriptDraftSemantic(content);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'SCRIPT_SEGMENT_STRATEGY_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_PACING_HANDOFF_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'SCRIPT_BOUNDARY_LOCK_TOO_THIN')).toBe(true);
    });

    it('fails when segment strategy crosses the configured segment boundary', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_01_time_range: 0-10s',
        'segment_02_time_range: 9-13s',
        '',
        '## story_beats',
        '- beat_id: B01',
        '  beat_summary: 开场建立。',
        '- beat_id: B02',
        '  beat_summary: 冲突升级。',
        '- beat_id: B03',
        '  beat_summary: 高潮反击。',
        '',
        '## video_generation_unit_plan',
        '- vgu_id: VGU-01',
        '  linked_beat_ids:',
        '    - B01',
        '  narrative_goal: 建立关系',
        '  pacing_profile: balanced',
        '  shot_density_hint: 中密度',
        '  target_duration_seconds: 10',
        '- vgu_id: VGU-02',
        '  linked_beat_ids:',
        '    - B02',
        '    - B03',
        '  narrative_goal: 完成升级与反击',
        '  pacing_profile: kinetic',
        '  shot_density_hint: 高密度',
        '  target_duration_seconds: 10',
        '',
        '## script_body',
        '## 第1段',
        '旁白：一句开场。',
        '动作：角色停顿后抬眼。',
        '',
        '## 第2段',
        '对白：我们开始吧。',
        '动作：角色后退半步。',
        '',
        '## performance_handoff',
        '- 停顿后抬眼。',
        '',
        '## storyboard_handoff',
        '- 保持镜头连续性。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');
      const result = validateScriptDraftSemantic(content);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'SCRIPT_SEGMENT_BOUNDARY_CROSSED')).toBe(true);
    });
  });

  describe('performance_direction', () => {
    it('passes world-cup style beat_performance_notes with beat_01 ids', () => {
      const content = [
        '# 表演指导',
        '',
        '## character_performance_profiles',
        '- 男孩：视线先跟球再抬向球门，重心前倾，脚背触球时肩部略沉。',
        '',
        '## beat_performance_notes',
        '- beat_01：抛球前 0.5s hold，视线从疲惫切到专注，脚背接球微顿。',
        '- beat_02：变向时眼神扫障碍，手部护球，节奏加快半拍。',
        '- beat_04：凌空抽射前蓄力停顿，滞空时表情收紧再释放。',
        '',
        '## action_continuity_chains',
        '- 接球 → 盘带重心前移 → 变向护球，handoff 到冲门挑球。',
        '',
        '## emotion_continuity_chains',
        '- 疲惫 → 专注 → 兴奋 → 高光释放。',
        '',
        '## continuity_rules',
        '- 足球、视线与 screen side 在 beat 间不得跳轴。',
        '',
        '## storyboard_handoff',
        '- 低机位跟拍反应；抽射用侧面中景接滞空表情。',
        '',
        '## risk_notes',
        '- 无',
        '',
        '## next_action',
        '- 进入分镜',
      ].join('\n');
      expect(validatePerformanceDirectionSemantic(content).ok).toBe(true);
    });

    it('passes when performance cues present', () => {
      const content = [
        '# 表演指导',
        '',
        '## character_performance_profiles',
        '- 主角：视线先压住对手，重心前压，手贴桌边再开口。',
        '',
        '## beat_performance_notes',
        '- B01：先停顿，再抬眼，手不离道具。',
        '- B02：对手后退，主角逼近半步，reaction hold 半拍。',
        '',
        '## action_continuity_chains',
        '- chain_01：压手 -> 抬眼 -> 逼近半步，handoff 到对手后退。',
        '',
        '## emotion_continuity_chains',
        '- chain_emo_01：平静 -> 紧张 -> 压场释放。',
        '',
        '## continuity_rules',
        '- 保持左压右退的 blocking、道具状态与 eye-line 连续。',
        '',
        '## storyboard_handoff',
        '- 近景抓抬眼与 reaction，保持道具和 screen side 承接。',
      ].join('\n');
      expect(validatePerformanceDirectionSemantic(content).ok).toBe(true);
    });

    it('fails without performance cues', () => {
      const result = validatePerformanceDirectionSemantic(
        '# 表演\n\n' + 'x'.repeat(80),
      );
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'PERFORMANCE_MISSING_CUES')).toBe(
        true,
      );
    });

    it('fails when continuity and storyboard support are missing', () => {
      const content = [
        '# 表演指导',
        '',
        '## character_performance_profiles',
        '- 主角：很生气。',
        '',
        '## beat_performance_notes',
        '- B01：开心。',
        '',
        '## action_continuity_chains',
        '待补充',
        '',
        '## emotion_continuity_chains',
        '待补充',
        '',
        '## continuity_rules',
        '待补充',
        '',
        '## storyboard_handoff',
        '待补充',
      ].join('\n');
      const result = validatePerformanceDirectionSemantic(content);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'PERFORMANCE_ACTION_CONTINUITY_TOO_THIN')).toBe(true);
      expect(result.issues.some((i) => i.code === 'PERFORMANCE_STORYBOARD_HANDOFF_TOO_THIN')).toBe(true);
    });
  });


    it('fails stall template when upstream is football script anchor', () => {
      const script = [
        '## story_beats',
        '- beat_01: 抛球',
        '- beat_02: 盘带',
        'Boy_Hero 足球 院门',
      ].join('\n');
      const anchor = extractPerformanceTopicAnchorFromScript(script);
      expect(anchor).not.toBeNull();
      const stall = [
        '## beat_performance_notes',
        '- B01：主角与对手在摊位旁对峙，手按电子秤。',
        '## character_performance_profiles',
        '- 主角：看零钱夹',
      ].join('\n');
      const drift = validatePerformanceTopicDrift(stall, anchor);
      expect(drift.some((d) => d.code === 'PERFORMANCE_TOPIC_DRIFT')).toBe(true);
    });

    it('fails topic drift via validatePerformanceDirectionSemantic with anchor', () => {
      const script = [
        '## story_beats',
        '- **beat_01** 足球',
        '- **beat_02** 盘带',
        '男孩（Boy_Hero）',
      ].join('\n');
      const anchor = extractPerformanceTopicAnchorFromScript(script);
      const bad = [
        '# 表演',
        '## character_performance_profiles',
        '- 主角：视线压住对手，手贴电子秤。',
        '## beat_performance_notes',
        '- B01：对峙停顿。',
        '- B02：对手后退。',
        '## action_continuity_chains',
        '- 压手 -> 抬眼',
        '## emotion_continuity_chains',
        '- 平静 -> 紧张',
        '## continuity_rules',
        '- blocking 连续',
        '## storyboard_handoff',
        '- 近景 reaction',
      ].join('\n');
      const result = validatePerformanceDirectionSemantic(bad, anchor);
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'PERFORMANCE_TOPIC_DRIFT')).toBe(true);
    });

  describe('asset_plan', () => {
    it('passes structured asset plan', () => {
      const content = [
        '# 资产规划',
        '',
        '## 角色',
        '- 主角：开场功能，出场节拍 1',
        '- 配角：推动冲突',
        '',
        '## 优先级',
        'P0 主角与主场景',
      ].join('\n');
      expect(validateAssetPlanSemantic(content).ok).toBe(true);
    });

    it('fails bare title only', () => {
      expect(validateAssetPlanSemantic('# 资产\n\n待定').ok).toBe(false);
    });
  });

  describe('audio_design', () => {
    it('passes when layers and segments described', () => {
      const content = [
        '# 声音设计',
        '',
        '## 分段配乐',
        '- 段一：轻快 BGM 与旁白前置',
        '- 段二：环境音加强，镜头节奏放慢',
      ].join('\n');
      const result = validateAudioDesignSemantic(content);
      expect(result.issues, JSON.stringify(result.issues)).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('fails without audio layers in body', () => {
      const result = validateAudioDesignSemantic(
        '# 声音\n\n' + 'x'.repeat(80),
      );
      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.code === 'AUDIO_DESIGN_MISSING_LAYERS')).toBe(
        true,
      );
    });
  });
});
