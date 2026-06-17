# Adaptation Idea Seed Library / 改写方向种子库

本库用于 v6.1 `adaptation_ideas`，帮助大模型基于源片段生成 5-10 个可供用户选择的改写方向。

本库不是 SOP，不是封闭枚举，也不要求逐项打分。它只提供“创意发散种子”。

## 使用原则

1. 先理解源片段的 `narrative_patterns` 与 `replaceable_slots`。
2. 再从本库选择或发散 5-10 个改写方向。
3. 每个方向只输出轻量信息：`title`、`summary`、`why_it_works`、`recommended_for`。
4. 不自动进入剧本、分镜或提示词阶段。
5. 必须等待用户选择确认后，才允许后续阶段执行。
6. 本库所有种子均可 `reference`、`adapted_reference` 或 `custom_generated`。

## 推荐输出格式

```yaml
adaptation_ideas:
  - idea_id: idea_01
    title:
    seed_type:
    selection_mode: reference | adapted_reference | custom_generated
    summary:
    why_it_works:
    recommended_for:
    user_choice_required: true
```

---

## 1. Modern Workplace / 现代职场版

- seed_type: modern_workplace
- best_for: 身份误判、隐藏能力、权力反转、职级讽刺、会议室冲突。
- why_use: 场景稳定，观众熟悉，短视频理解成本低。
- common_slots:
  - social_arena: 公司前台、会议室、面试间、董事会、项目评审会。
  - pressure_source: 前台、主管、HR、投资人、部门经理。
  - power_symbol: 任命书、股权协议、系统权限、项目核心文件。

## 2. AI Startup / AI 创业版

- seed_type: ai_startup
- best_for: 技术能力反转、被投资人低估、核心模型/权限揭示、当代热点。
- why_use: 贴合 AI 话题，适合科技圈和短视频传播。
- common_slots:
  - social_arena: 路演现场、投资人会议、黑客松、AI 公司办公室。
  - pressure_source: 投资人、产品负责人、技术评委、平台审核。
  - power_symbol: 模型 root access、核心算法 demo、算力授权、私有模型密钥。

## 3. Luxury Service Satire / 高端服务场景讽刺版

- seed_type: luxury_service_satire
- best_for: 阶层误判、消费场景、势利眼反转、反差喜剧。
- why_use: 规则清晰，权力变化容易被观众理解。
- common_slots:
  - social_arena: 高档餐厅、酒店、奢侈品店、私人会所、豪车展厅。
  - pressure_source: 店员、经理、接待员、客户经理。
  - power_symbol: 黑卡、VIP 密钥、会员徽章、专属邀请函。

## 4. Xianxia Sect / 修仙宗门版

- seed_type: xianxia_sect
- best_for: 隐藏高手、宗门羞辱、令牌揭示、强视觉反转。
- why_use: 适合中文互联网爽点，但需要控制设定复杂度。
- common_slots:
  - social_arena: 宗门大殿、试炼场、仙门考核、拍卖会。
  - pressure_source: 长老、执事、内门弟子、宗门规则。
  - power_symbol: 仙帝令、祖师玉佩、天阶功法、神秘法印。

## 5. Ancient Court / 古代王朝版

- seed_type: ancient_court
- best_for: 身份隐藏、权力认证、官场/客栈/宫廷反转。
- why_use: 权力符号强，结尾视觉 payoff 清晰。
- common_slots:
  - social_arena: 客栈、府衙、宫门、朝堂、钱庄。
  - pressure_source: 掌柜、衙役、官员、门房、管家。
  - power_symbol: 圣旨、金牌、玉玺印记、皇族信物。

## 6. Cyberpunk Access / 赛博朋克权限版

- seed_type: cyberpunk_access
- best_for: 权限反转、系统认证、底层人进入高阶空间、科幻视觉。
- why_use: 视觉记忆点强，适合动画电影化和未来感短片。
- common_slots:
  - social_arena: 霓虹餐厅、数据交易所、企业塔、星际安检口。
  - pressure_source: 机械保安、AI 审核系统、企业中层、仿生接待员。
  - power_symbol: 发光芯片、root key、身份植入体、量子通行证。

## 7. School Competition / 校园竞赛版

- seed_type: school_competition
- best_for: 普通学生被低估、能力展示、老师/同学态度变化。
- why_use: 受众广，情绪友好，适合青少年和家庭向。
- common_slots:
  - social_arena: 教室、考场、比赛舞台、实验室、社团招新。
  - pressure_source: 老师、评委、学霸、社团负责人。
  - power_symbol: 成绩单、竞赛证书、实验结果、隐藏作品。

## 8. Animal Fable / 动物寓言版

- seed_type: animal_fable
- best_for: 儿童动画、弱小角色反转、温和讽刺、暖心结尾。
- why_use: 降低现实冲突强度，适合合家欢和动画短片。
- common_slots:
  - social_arena: 森林集市、动物学校、蜂巢工坊、小镇广场。
  - pressure_source: 大型动物、管理员、群体规则、比赛裁判。
  - power_symbol: 小铃铛、徽章、地图、祖传种子、发光羽毛。

## 9. Live Stream / 直播围观版

- seed_type: live_stream
- best_for: 群体态度反转、评论区传播、榜单/打赏/认证揭示。
- why_use: 适合短视频平台语境，但注意屏幕文字风险。
- common_slots:
  - social_arena: 直播间、带货现场、PK 舞台、线上发布会。
  - pressure_source: 主播、榜一、观众弹幕、平台规则。
  - power_symbol: 认证徽章、榜单反转、隐藏账号、后台权限。

## 10. Sports / 运动竞技版

- seed_type: sports_competition
- best_for: 能力被低估、现场证明、团队认可、热血逆转。
- why_use: 动作证明清晰，情绪自然，适合 60-180 秒。
- common_slots:
  - social_arena: 球场、拳馆、赛车场、滑板公园、训练营。
  - pressure_source: 教练、对手、队友、观众。
  - power_symbol: 旧奖牌、隐藏记录、比赛资格、关键动作。

## 11. Fantasy Kingdom / 奇幻王国版

- seed_type: fantasy_kingdom
- best_for: 王族身份、魔法信物、城堡/宫门反转、动画电影感。
- why_use: 视觉空间大，适合 3D 动画电影化。
- common_slots:
  - social_arena: 城堡门口、王国集市、骑士试炼、魔法学院。
  - pressure_source: 守卫、贵族、骑士团、魔法评审。
  - power_symbol: 王冠碎片、龙纹徽章、魔法钥匙、预言卷轴。

## 12. Small Town Warmth / 小镇暖心版

- seed_type: small_town_warmth
- best_for: 小善意大回报、误会解除、关系修复、治愈情绪。
- why_use: 不依赖强打脸，适合温情短片和品牌故事。
- common_slots:
  - social_arena: 小店、车站、面包房、诊所、社区活动。
  - pressure_source: 误会、时间压力、陌生人偏见、生活困难。
  - power_symbol: 老照片、信件、钥匙、纪念物、善意记录。

## 13. Robot Society / 机器人社会版

- seed_type: robot_society
- best_for: 等级系统、身份认证、底层机器人反转、AI 寓言。
- why_use: 可将社会讽刺转为更安全的寓言表达。
- common_slots:
  - social_arena: 机器人维修站、充电广场、AI 城市入口、数据工厂。
  - pressure_source: 管理机器人、评分系统、巡逻无人机。
  - power_symbol: 核心芯片、管理员密钥、旧型号隐藏协议、主控权限。

## 14. Mythic Trial / 神话试炼版

- seed_type: mythic_trial
- best_for: 隐藏血脉、神器认主、被神殿/族群低估。
- why_use: Hero Moment 强，适合视觉化揭示。
- common_slots:
  - social_arena: 神殿、祭坛、试炼山门、族群大会。
  - pressure_source: 祭司、守门神兽、族长、试炼规则。
  - power_symbol: 神器、血脉印记、星图、古老符文。

## 15. Creator Economy / 创作者经济版

- seed_type: creator_economy
- best_for: 小创作者被低估、作品价值揭示、平台/品牌反转。
- why_use: 贴合自媒体创作者，容易引发共鸣。
- common_slots:
  - social_arena: 选题会、品牌合作现场、内容平台后台、创作者大会。
  - pressure_source: 品牌方、MCN、平台审核、头部创作者。
  - power_symbol: 爆款后台数据、隐藏账号、原创证明、合作邀请。

## 16. Food Craft / 美食匠人版

- seed_type: food_craft
- best_for: 手艺被低估、味觉证明、评委/顾客态度反转。
- why_use: 视觉和感官表达强，适合暖调动画。
- common_slots:
  - social_arena: 小吃摊、后厨、料理比赛、餐车、市集。
  - pressure_source: 食评家、老板、竞争对手、顾客。
  - power_symbol: 祖传食谱、特殊食材、隐藏厨师身份、味觉记忆。

## 17. Spaceport Checkpoint / 星际关口版

- seed_type: spaceport_checkpoint
- best_for: 通行权限、身份识别、宇宙级身份反转。
- why_use: 科幻门槛清晰，但需控制世界观解释。
- common_slots:
  - social_arena: 星际港口、太空电梯、移民检查站、飞船登舰口。
  - pressure_source: 安检员、AI 海关、舰队士兵、权限系统。
  - power_symbol: 银河通行证、舰长密钥、星图坐标、外交豁免徽章。

## 18. Detective Reframe / 侦探重构版

- seed_type: detective_reframe
- best_for: 前期误导、后期真相重构、普通物件意义反转。
- why_use: 适合悬疑和二刷，但要避免信息过载。
- common_slots:
  - social_arena: 案发现场、拍卖会、旅馆、列车车厢、档案室。
  - pressure_source: 警探、嫌疑人、时间限制、错误证词。
  - power_symbol: 关键证据、旧照片、录音、遗失票据。

## 19. Environmental Fable / 环境寓言版

- seed_type: environmental_fable
- best_for: 小角色守护自然、被误解的行动、最终环境回应。
- why_use: 适合儿童动画、公益主题、温和传播。
- common_slots:
  - social_arena: 森林、海边小镇、垃圾回收站、花园、动物保护区。
  - pressure_source: 村民误会、开发机器、天气、资源短缺。
  - power_symbol: 种子、净水石、迁徙地图、动物信任。

## 20. Museum Artifact / 博物馆文物版

- seed_type: museum_artifact
- best_for: 普通人识别隐藏价值、文物/历史身份揭示、知识反转。
- why_use: 适合知识型短片和文化题材。
- common_slots:
  - social_arena: 博物馆、拍卖行、旧货市场、鉴宝现场。
  - pressure_source: 专家、保安、收藏家、围观者。
  - power_symbol: 文物印记、专家认证、隐藏铭文、历史照片。
