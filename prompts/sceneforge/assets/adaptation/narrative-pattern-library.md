# Narrative Pattern Library / 通用叙事母版库

本库用于 v6.1 `adaptation_recommendations.pattern_diagnosis.narrative_patterns`。

重要原则：本库是开放参考资产，不是封闭枚举。若没有合适模式，使用 `selection_mode: custom_generated`。

## 使用格式

```yaml
- pattern_id:
  selection_mode: reference | adapted_reference | custom_generated
  confidence: high | medium | low
  reason:
  applicable_when:
  creative_value:
  misuse_risk:
  downstream_hint:
```

## 核心叙事母版

### UNDERDOG_REVERSAL

弱势者被低估、压迫或误判，随后通过行动、证据或隐藏身份完成反转。

- applicable_when: 主角处于弱势，外界判断错误，高潮是地位逆转。
- creative_value: 适合短视频爽点、打脸、励志、喜剧反转。
- misuse_risk: 只保留“打脸”会变浅，需保留前期压制与误判逻辑。
- downstream_hint: script 阶段重点强化压制铺垫与反转证据。

### HIDDEN_TRUTH_REVEAL

观众或角色起初只看到表象，后续揭示被隐藏的真相、身份、能力、关系或动机。

- applicable_when: 核心看点来自“原来如此”的认知重构。
- creative_value: 适合悬疑、情绪反转、身份揭示、黑色幽默。
- misuse_risk: 过早揭示会降低观看动力。
- downstream_hint: storyboard 阶段保留遮掩、误导、揭示三段式。

### STATUS_MISREAD

人物被依据服装、职业、阶层、年龄、性别、外貌、设备或场景误读。

- applicable_when: 冲突来自社会标签误判。
- creative_value: 适合讽刺、喜剧、阶层反差、现代短视频。
- misuse_risk: 容易变成刻板印象，应转向“误判机制”而非羞辱群体。
- downstream_hint: replaceable slot 可替换表面身份与真实身份。

### POWER_TOKEN_REVEAL

一个物件、标记、证书、权限、钥匙、徽章、文件或数据证明瞬间改变权力关系。

- applicable_when: 高潮依赖某个可视化证据触发态度变化。
- creative_value: 适合强视觉 Hero Moment 和 AI 视频可拍性。
- misuse_risk: 文字类证据容易 AI 乱码，需考虑替代物。
- downstream_hint: prompt 阶段优先用图形化、发光、形状明确的权力象征物。

### ESCALATING_AUTHORITY_CHAIN

小角色先制造冲突，随后逐级引入更高权力者，最终形成层层升级的压力或崩塌。

- applicable_when: 反派/压力方不是单人，而是一条权力链。
- creative_value: 能延长节奏、制造群体反应、提升最终爽点。
- misuse_risk: 人物过多会增加生成难度。
- downstream_hint: storyboard 阶段控制角色数量与空间调度。

### SLOW_BURN_PAYOFF

前半段用重复、沉默、细节和等待建立期待，后半段集中爆发。

- applicable_when: 爆点需要前期积蓄，不适合开场立即揭示。
- creative_value: 完播率高，适合 30-90 秒反转视频。
- misuse_risk: 铺垫过长会流失观众。
- downstream_hint: pacing 阶段设置早期小钩子。

### PUBLIC_HUMILIATION_TO_PUBLIC_VINDICATION

主角在公共场域受辱，最终在同一公共场域被证明、被尊重或完成反击。

- applicable_when: 群体围观是压力来源，也是回报来源。
- creative_value: 适合强情绪爽点和群体态度逆转。
- misuse_risk: 群体场景生成复杂，应压缩为少量代表角色。
- downstream_hint: final payoff image 设计为强构图群体反应。

### FORBIDDEN_ENTRY_TO_GRANTED_ACCESS

主角被拒绝进入某个空间、圈层或权限系统，最终获得最高级访问。

- applicable_when: 门、通道、会员区、禁区、VIP 系统是戏剧边界。
- creative_value: 空间符号明确，视觉化强。
- misuse_risk: 若没有价值证明，反转会显得突兀。
- downstream_hint: 场景设计应突出“门槛感”。

### ORDINARY_OBJECT_EXTRAORDINARY_MEANING

普通物件在后续被重新解释，成为身份、情感、权力或真相的关键。

- applicable_when: 道具前期不起眼，后期成为核心。
- creative_value: 适合悬念、伏笔、低成本短片。
- misuse_risk: 道具状态漂移会削弱效果。
- downstream_hint: prop_state_machine 必须明确。

### MISDIRECTION_TO_RECONTEXTUALIZATION

前期引导观众形成错误理解，后期通过新信息重组前文意义。

- applicable_when: 重点不是事件变化，而是理解变化。
- creative_value: 适合二刷、评论区讨论、悬疑短视频。
- misuse_risk: 误导不能欺骗观众到不公平。
- downstream_hint: script 阶段设置可回看的伏笔。

### SOCIAL_MASK_COLLAPSE

人物或机构维持的体面、权威、善意或规则面具被事件撕开。

- applicable_when: 看点来自伪善、势利、虚伪或制度荒诞暴露。
- creative_value: 适合讽刺和黑色幽默。
- misuse_risk: 过度说教会降低戏剧性。
- downstream_hint: 表演阶段用态度变化代替旁白解释。

### COMPETENCE_REVEAL

被认为无能、普通或不合格的人展示出超常能力。

- applicable_when: 高潮来自技能、判断、操作、创作或战斗表现。
- creative_value: 适合职业爽文、运动、科技、厨艺、修仙等。
- misuse_risk: 技能展示需要可视化，否则像口嗨。
- downstream_hint: storyboard 阶段设计明确动作证明。

### MORAL_CHOICE_UNDER_PRESSURE

主角在压力、诱惑或危险下做选择，选择本身暴露其价值观。

- applicable_when: 不是“赢”最重要，而是“怎么选”最重要。
- creative_value: 适合情绪、亲情、英雄、牺牲、成长。
- misuse_risk: 若只追求反转，会削弱价值观。
- downstream_hint: performance 阶段强化犹豫与决断瞬间。

### SMALL_KINDNESS_BIG_PAYOFF

前期一个小善意在后期产生巨大回报或反转。

- applicable_when: 因果链来自善意、信任、帮忙、保护。
- creative_value: 适合暖心传播、合家欢、情绪短片。
- misuse_risk: 回报过度会像鸡汤。
- downstream_hint: 前期善意要具体、低调、可信。

### DEAL_WITH_HIDDEN_COST

角色得到看似有利的交易、机会或奖赏，但隐藏代价在后续显现。

- applicable_when: 核心是诱惑、代价、契约、选择后果。
- creative_value: 适合黑色寓言、惊悚、讽刺。
- misuse_risk: 代价若与主题无关会显得机械。
- downstream_hint: topic 阶段明确寓言主题。

### SYSTEM_GLITCH_REVEALS_TRUTH

系统、机器、规则、算法或仪式出现异常，意外暴露真相。

- applicable_when: 现代、科幻、AI、办公室、平台场景。
- creative_value: 适合技术题材和视觉化 UI。
- misuse_risk: UI 文字过多会生成失败。
- downstream_hint: prompt 阶段使用图标、颜色、灯光替代密集文字。

### RITUALIZED_REVEAL

真相不是随口说出，而是通过仪式性动作、展开、解封、开启、扫描、加冕等方式揭示。

- applicable_when: 高潮需要“仪式感”。
- creative_value: Hero Moment 强，适合动画电影化。
- misuse_risk: 动作过慢会拖节奏。
- downstream_hint: 保留动作链，但压缩到 2-4 个关键镜头。

### CHASE_TO_STANDOFF

运动、追逐、逃避或混乱最终收束为对峙和揭示。

- applicable_when: 前半段动作多，后半段通过停顿爆发信息。
- creative_value: 适合动作喜剧、儿童动画、冒险。
- misuse_risk: AI 视频多角色追逐稳定性低。
- downstream_hint: 分段生成时锁定空间轴线。

### FALSE_VILLAIN_TRUE_ALLY

被误认为阻碍者的人最终被证明是盟友、测试者或保护者。

- applicable_when: 角色关系反转是高潮。
- creative_value: 适合情绪反转和关系戏。
- misuse_risk: 前期不能把角色写得不可原谅。
- downstream_hint: script 阶段埋下善意微表情或保护动作。

### EVERYDAY_TO_EPIC_SCALE_SHIFT

日常小事突然被提升到宏大、神话、科幻、灾难或宇宙尺度。

- applicable_when: 反差来自尺度突变。
- creative_value: 适合动画、喜剧、网络传播。
- misuse_risk: 规模升级过大可能失焦。
- downstream_hint: visual upgrade 阶段用局部特效暗示大尺度。

### LOOP_AND_VARIATION

同一动作、台词或场面重复多次，每次发生微妙升级，最后反转。

- applicable_when: 重复本身是节奏机制。
- creative_value: 适合短视频节奏、喜剧、音乐化剪辑。
- misuse_risk: 重复无变化会无聊。
- downstream_hint: 每轮必须有 clear escalation。

### COUNTDOWN_PRESSURE

倒计时、截止时间、时钟、进度条、门即将关闭等制造压力。

- applicable_when: 时间压力是悬念来源。
- creative_value: 适合提高完播率。
- misuse_risk: 倒计时若与结果无关会显得廉价。
- downstream_hint: audio 阶段强化 ticking / pulse / silence。
