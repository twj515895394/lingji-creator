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

    it('accepts VGU blocks with narrative_goal and natural beat coverage prose', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        'segment_duration_seconds: 10',
        'segment_time_range: 0s-10s',
        '',
        '## story_beats',
        '- beat_id: beat_01',
        '  beat_summary: 对峙启动。',
        '- beat_id: beat_02',
        '  beat_summary: crossover 升级。',
        '- beat_id: beat_03',
        '  beat_summary: 防守失衡。',
        '- beat_id: beat_04',
        '  beat_summary: 360 度扣篮。',
        '- beat_id: beat_05',
        '  beat_summary: 全场欢腾。',
        '',
        '## video_generation_unit_plan',
        '- VGU1: narrative_goal = 覆盖beat_01至beat_03，从对峙经 crossover 升级到防守者失衡； pacing_profile = balanced； shot_density_hint = 中密度。',
        '- VGU2: narrative_goal = 覆盖beat_04至beat_05，从360度扣篮执行到观众欢腾结局； pacing_profile = kinetic； shot_density_hint = 高密度。',
        '',
        '## script_body',
        '## 段一',
        '旁白：夜场灯光压下来，球声先响起。',
        '动作：进攻者持球停顿，先观察，再连续变向。',
        '',
        '## 段二',
        '旁白：一瞬间突破，情绪被扣篮点燃。',
        '动作：防守者失衡倒地，进攻者跃起完成旋转扣篮。',
        '',
        '## performance_handoff',
        '- 停顿、视线锁定、变向节奏和扣篮前蓄力都要明确保留。',
        '',
        '## storyboard_handoff',
        '- 镜头需保持球、站位与动作连续性，扣篮后立刻切观众反应。',
        '- boundary_lock: shots_must_not_cross_segment_boundary',
      ].join('\n');

      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('accepts paren-english suffixes and common chinese translation variants from real cooking drafts', () => {
      const content = [
        '# 剧本草案 (Script Draft)',
        '',
        '## 1. 剧本概述 (script_summary)',
        '本剧本将国民家常菜“番茄炒蛋”转化为30秒的电影感治愈视觉短片。通过“烹饪者之手”的微距操作，放大食材在黄金光影下的物理质感与色彩碰撞，传递温暖的烟火气与手作温度。',
        '',
        '## 2. 分段策略 (segment_strategy)',
        '*   **单段目标时长 (segment_duration_seconds)**: 10秒',
        '*   **分段时间线 (segment_time_range)**:',
        '    *   **Segment 1**: 0.0s - 10.0s (食材准备与蛋液入锅)',
        '    *   **Segment 2**: 10.0s - 20.0s (番茄出沙与黄金交融)',
        '    *   **Segment 3**: 20.0s - 30.0s (倾泻盛盘与烟火定格)',
        '',
        '## 3. 故事节拍 (story_beats)',
        '*   **beat_id: beat_01**',
        '    *   **名称**: 刀落汁盈',
        '    *   **动作摘要**: 阳光洒在木质案板上，朴素的手切开红番茄，汁水溢出；筷子快速搅拌蛋液，泛起细腻泡沫。',
        '*   **beat_id: beat_02**',
        '    *   **名称**: 金黄初绽',
        '    *   **动作摘要**: 蛋液倒入热油铁锅，瞬间受热膨胀，边缘鼓起蓬松褶皱。',
        '*   **beat_id: beat_03**',
        '    *   **名称**: 赤红出沙',
        '    *   **动作摘要**: 番茄块入锅翻炒，边缘软化，红亮沙汁咕嘟冒泡。',
        '*   **beat_id: beat_04**',
        '    *   **名称**: 黄金交融',
        '    *   **动作摘要**: 蛋块回锅，与番茄汁翻炒包裹，撒下翠绿葱花。',
        '*   **beat_id: beat_05**',
        '    *   **名称**: 倾泻盛盘',
        '    *   **动作摘要**: 锅铲托起热气腾腾的番茄炒蛋，缓缓倒入白瓷盘中，汤汁流淌。',
        '*   **beat_id: beat_06**',
        '    *   **名称**: 烟火定格',
        '    *   **动作摘要**: 镜头定格成品，侧逆光穿透袅袅升腾的热气，呈现极致食欲。',
        '',
        '## 4. 节拍关联表 (beat_table)',
        '| Beat ID | 戏剧角色 (Dramatic Role) | 情绪转折 (Emotional Transition) | 连续性风险 (Continuity Risks) |',
        '| :--- | :--- | :--- | :--- |',
        '| beat_01 | 引入 (Setup) | 平静 -> 期待 (Anticipation) | 番茄切块大小需与后续下锅大小一致 |',
        '| beat_02 | 起势 (Inciting Incident) | 期待 -> 惊艳 (Excitement) | 蛋液入锅前后的油烟量与火候视觉 |',
        '| beat_03 | 升级 (Rising Action) | 惊艳 -> 专注 (Focus) | 番茄出沙的粘稠度与水分流失视觉 |',
        '| beat_04 | 高潮 (Climax) | 专注 -> 满足 (Satisfaction) | 蛋块挂汁比例与葱花分布的均匀度 |',
        '| beat_05 | 局末 (Resolution) | 满足 -> 治愈 (Warmth) | 倾倒时食物的流动速度与堆叠形态 |',
        '| beat_06 | 定格 (Ending) | 治愈 -> 极致幸福 (Joy) | 热气升腾的动态与自然光线的稳定性 |',
        '',
        '## 5. 视频生成单元计划 (video_generation_unit_plan)',
        '*   **VGU_01 (对应 Segment 1: 0.0s - 10.0s)**',
        '    *   **Narrative Goal**: 展现食材的生命力与入锅的瞬间爆发力。',
        '    *   **Pacing Profile**: 慢起步-突快（切菜的节奏感，到蛋液入锅的瞬间膨胀）。',
        '    *   **Shot Density Hint**: 3个镜头（切番茄微距 -> 搅蛋液 -> 蛋液入锅膨胀）。',
        '    *   **Continuity Focus**: 蛋液的流动状态与热油的烟雾。',
        '*   **VGU_02 (对应 Segment 2: 10.0s - 20.0s)**',
        '    *   **Narrative Goal**: 展现番茄与鸡蛋在热力下的物理融合与色彩碰撞。',
        '    *   **Pacing Profile**: 持续中速翻炒，节奏稳定。',
        '    *   **Shot Density Hint**: 2个镜头（番茄出沙冒泡 -> 蛋块回锅与葱花洒落）。',
        '    *   **Continuity Focus**: 番茄汁水的浓稠度与鸡蛋的挂汁状态。',
        '*   **VGU_03 (对应 Segment 3: 20.0s - 30.0s)**',
        '    *   **Narrative Goal**: 呈现最终的治愈感与食欲巅峰。',
        '    *   **Pacing Profile**: 慢速，舒缓，定格。',
        '    *   **Shot Density Hint**: 2个镜头（装盘慢动作 -> 阳光下热气升腾的静止特写）。',
        '    *   **Continuity Focus**: 盘中食物的堆叠高度与热气的袅袅动态。',
        '',
        '## 6. 剧本正文 (script_body)',
        '### Segment 1 (0.0s - 10.0s)',
        '*   **[0.0s - 3.0s]**',
        '    *   **动作**: 温暖的侧逆光洒在木质案板上。一只朴素、温暖的手握着菜刀，干脆地切开饱满的红番茄，红亮的汁水顺着刀刃微微溢出。',
        '    *   **视线/节奏锚点**: 镜头聚焦在刀刃与番茄接触点。切刀落下的清脆“咔嚓”声（ASMR）。',
        '    *   **旁白 (VO)**: “最简单的美味，往往藏在最日常的动作里。”',
        '*   **[3.0s - 6.0s]**',
        '    *   **动作**: 画面硬切至大碗微距。手持木筷快速搅拌蛋液，金黄色的蛋液在碗中旋转，泛起细腻的白色泡沫。',
        '    *   **视线/节奏锚点**: 筷子旋转的圆周运动，搅拌声清脆有节奏。',
        '*   **[6.0s - 10.0s]**',
        '    *   **动作**: 镜头切至黑铁锅。热油微微起烟，蛋液如瀑布般倒入锅中。接触热油的瞬间，蛋液迅速向外膨胀、鼓起蓬松的金黄褶皱。',
        '    *   **视线/节奏锚点**: 蛋液入锅的“嘶嘶”声瞬间放大，手部动作在倒入后有0.5秒的微微停顿，观察蛋液膨胀。',
        '',
        '### Segment 2 (10.0s - 20.0s)',
        '*   **[10.0s - 15.0s]**',
        '    *   **动作**: 蛋块已盛出。红亮的番茄块滑入锅中，手持锅铲轻轻翻炒。在热力下，番茄边缘开始软化，浓郁的红沙汁在微距镜头下咕嘟咕嘟地冒着小泡。',
        '    *   **视线/节奏锚点**: 锅铲推开番茄泥的慢动作，红汁在锅底流淌。',
        '    *   **旁白 (VO)**: “让时间催化酸甜，唤醒沉睡 of 香气。”',
        '*   **[15.0s - 20.0s]**',
        '    *   **动作**: 蓬松的金黄蛋块重新倒入锅中，与红亮番茄汁快速翻炒在一起，每一块鸡蛋都被红汁完美包裹。最后，一把翠绿的葱花撒下，红、黄、绿三色在锅中剧烈碰撞。',
        '    *   **视线/节奏锚点**: 葱花落下的瞬间，翻炒动作停顿1秒，展示色彩的极致碰撞。',
        '',
        '### Segment 3 (20.0s - 30.0s)',
        '*   **[20.0s - 25.0s]**',
        '    *   **动作**: 锅铲托起热气腾腾 of 番茄炒蛋，缓缓倾泻在精致的白瓷盘中。红黄相间的菜肴层层叠起，浓郁的汤汁顺着边缘缓缓流淌。',
        '    *   **视线/节奏锚点**: 倾倒动作极慢，展现汤汁的粘稠感与食物的堆叠过程。',
        '    *   **旁白 (VO)**: “烟火气升腾的瞬间，心便安稳了下来。”',
        '*   **[25.0s - 30.0s]**',
        '    *   **动作**: 镜头定格在装好盘的番茄炒蛋上。微风吹过，袅袅热气升腾，温暖的侧逆光穿透热气，折射出柔和的金色光晕。',
        '    *   **视线/节奏锚点**: 画面完全静止，只有热气在缓缓飘动，余音袅袅。',
        '',
        '## 7. 表演交接说明 (performance_handoff)',
        '*   **手部动作规范**:',
        '    *   切番茄时，左手扶住番茄的力度要自然，展现家庭烹饪的熟练感；右手落刀要干脆，避免拖泥带水。',
        '    *   打蛋时，手腕发力要快而均匀，展现专注感。',
        '    *   翻炒时，锅铲的推、翻动作要轻柔，避免将番茄和鸡蛋捣得过碎，保持食材的完整块状。',
        '    *   装盘时，手部必须保持绝对平稳，倾倒速度要慢，展现食物的重力感与粘稠度。',
        '*   **节奏与停顿 (Reaction Timing)**:',
        '    *   蛋液入锅后，手部需有0.5秒的微小停顿，让观众的视线完全聚焦在蛋液膨胀的物理变化上。',
        '    *   撒入葱花后，手部动作暂停1秒，给镜头留出展示红黄绿三色对比的时间。',
        '',
        '## 8. 分镜交接说明 (storyboard_handoff)',
        '*   **镜头关注点**:',
        '    *   全片采用微距摄影（Macro Shot）与极浅景深（Shallow Depth of Field），背景（厨房、调料瓶）必须做柔和虚化，突出食材的纹理与质感。',
        '    *   光影必须统一为“黄金时刻（Golden Hour）”的暖黄色侧逆光，光线需穿透番茄汁水与升腾的热气。',
        '*   **站位与道具连续性**:',
        '    *   木质案板、黑铁锅、白瓷盘的摆放位置需在画面中轴线附近，保持视觉重心的稳定。',
        '    *   番茄的红色饱和度与鸡蛋的金黄色泽在各镜头间必须保持高度一致，避免因曝光过度导致色彩失真。',
        '*   **边界锁定 (boundary_lock)**:',
        '    *   **Segment 1 (0.0s - 10.0s)**: 镜头必须在10.0s前完成蛋液入锅膨胀的呈现，不得将膨胀过程跨入第11秒。',
        '    *   **Segment 2 (10.0s - 20.0s)**: 翻炒与撒葱花的镜头必须在20.0s前结束，不得将撒葱花或翻炒动作跨入第21秒。',
        '    *   **Segment 3 (20.0s - 30.0s)**: 装盘与定格镜头严格限制在20.0s-30.0s区间内，确保最后的定格有完整的5秒展示时间。',
        '',
        '## 9. 风险提示 (risk_notes)',
        '*   **时间分配风险**: 前期准备（切番茄、打蛋）极易超时。Storyboard 阶段必须严格控制前两个镜头的时长，切番茄不超过3秒，打蛋不超过3秒，确保蛋液入锅有4秒的完整展示。',
        '*   **色彩失真风险**: 铁锅的黑色背景容易导致相机自动曝光过度，使番茄看起来呈粉红色。需在分镜与灯光设计中强调对黑铁锅区域的测光控制，确保番茄呈现红亮、鸡蛋呈现金黄。',
        '',
        '## 10. 下一步行动 (next_action)',
        '1.  将此剧本草案分发至 Storyboard 阶段，绘制分镜运动轨迹。',
        '2.  根据“黄金时刻”光影要求，在 Layout 阶段设定侧逆光光源 of 入射角度（建议为侧后方45度）。',
      ].join('\n');

      const result = validateScriptDraftSemantic(content);
      expect(result.issues).toEqual([]);
      expect(result.ok).toBe(true);
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

    it('accepts beat_id lines wrapped in markdown emphasis from real cooking drafts', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        '* **segment_duration_seconds**: 10',
        '* **segment_time_range**:',
        '  * Segment 1: 0s - 10s',
        '  * Segment 2: 10s - 20s',
        '  * Segment 3: 20s - 30s',
        '',
        '## story_beats',
        '* **beat_id**: beat_01',
        '  * **title**: 刀落汁盈',
        '  * **action_summary**: 切番茄并打蛋。',
        '* **beat_id**: beat_02',
        '  * **title**: 金黄初绽',
        '  * **action_summary**: 蛋液入锅迅速膨胀。',
        '* **beat_id**: beat_03',
        '  * **title**: 赤红出沙',
        '  * **action_summary**: 番茄软化出汁。',
        '* **beat_id**: beat_04',
        '  * **title**: 黄金交融',
        '  * **action_summary**: 鸡蛋与番茄翻炒融合。',
        '',
        '## video_generation_unit_plan',
        '### VGU_01 (0s - 10s)',
        '- **Narrative Goal**: 展现备菜与入锅起势。',
        '- **Pacing Profile**: balanced',
        '- **Shot Density Hint**: 中高密度',
        '### VGU_02 (10s - 20s)',
        '- **Narrative Goal**: 展现番茄出沙与融合。',
        '- **Pacing Profile**: balanced',
        '- **Shot Density Hint**: 中密度',
        '',
        '## script_body',
        '### Segment 1 (0s - 10s)',
        '旁白：最平凡的食材，也能有最治愈的温度。',
        '动作：切番茄、打蛋、蛋液入锅。',
        '### Segment 2 (10s - 20s)',
        '旁白：酸甜与金黄在热气中相遇。',
        '动作：番茄出沙、鸡蛋回锅、翻炒融合。',
        '',
        '## performance_handoff',
        '- 手部动作要自然，停顿点落在蛋液膨胀与撒葱花之前。',
        '',
        '## storyboard_handoff',
        '- 微距镜头优先，锅具与食材位置保持连续。',
        '- boundary_lock: 10秒处与20秒处绝对剪辑，不得跨段。',
      ].join('\n');

      expect(validateScriptDraftSemantic(content).ok).toBe(true);
    });

    it('accepts storyboard handoff boundary lock variants from real cooking drafts', () => {
      const content = [
        '# 剧本草案',
        '',
        '## segment_strategy',
        '* **segment_duration_seconds**: 10',
        '* **segment_time_range**:',
        '  * Segment 1: 0s - 10s',
        '  * Segment 2: 10s - 20s',
        '  * Segment 3: 20s - 30s',
        '',
        '## story_beats',
        '* **beat_id**: beat_01',
        '  * **title**: 刀落汁盈',
        '  * **action_summary**: 切番茄并打蛋。',
        '* **beat_id**: beat_02',
        '  * **title**: 金黄初绽',
        '  * **action_summary**: 蛋液入锅迅速膨胀。',
        '* **beat_id**: beat_03',
        '  * **title**: 赤红出沙',
        '  * **action_summary**: 番茄软化出汁。',
        '* **beat_id**: beat_04',
        '  * **title**: 黄金交融',
        '  * **action_summary**: 鸡蛋与番茄翻炒融合。',
        '',
        '## video_generation_unit_plan',
        '### VGU_01 (0s - 10s)',
        '- **Narrative Goal**: 展现备菜与入锅起势。',
        '- **Pacing Profile**: balanced',
        '- **Shot Density Hint**: 中高密度',
        '### VGU_02 (10s - 20s)',
        '- **Narrative Goal**: 展现番茄出沙与融合。',
        '- **Pacing Profile**: balanced',
        '- **Shot Density Hint**: 中密度',
        '',
        '## script_body',
        '### Segment 1 (0s - 10s)',
        '旁白：最平凡的食材，也能有最治愈的温度。',
        '动作：切番茄、打蛋、蛋液入锅。',
        '### Segment 2 (10s - 20s)',
        '旁白：酸甜与金黄在热气中相遇。',
        '动作：番茄出沙、鸡蛋回锅、翻炒融合。',
        '',
        '## performance_handoff',
        '- 手部动作要自然，停顿点落在蛋液膨胀与撒葱花之前。',
        '',
        '## storyboard_handoff',
        '- **镜头关注点**: 全片采用微距摄影与极浅景深。',
        '- **站位与道具连续性**: 锅具、木案板与食材位置保持连续。',
        '- **Boundary Lock 1**: Segment 1 (0s-10s) 镜头不得跨越10s界限，严禁跨段剪辑。',
        '- **Boundary Lock 2**: Segment 2 (10s-20s) 翻炒与撒葱花镜头必须在20s前结束。',
        '- **Boundary Lock 3**: Segment 3 (20s-30s) 装盘与定格镜头严格锁定在20s-30s区间。',
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
