---
title: "SettingSystemAnalysis"
date: 2026-11-07 03:18:28
section: blog
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
show_header: false
---
# 设置系统架构分析（会话记忆存档）

> 用途：后续会话若需要继续"设置系统重构/统一"这个话题，直接读本文件恢复上下文，不必重新探索代码。
> 创建时间：2026-11-05
> 状态：2026-11-06 更新。第一阶段“旧设置链安全退役”的源码/注册/生成蓝图清理、旧档迁移与编译兼容修复均已入库；完整工程编译为 0 errors；用户已明确反馈自测通过。第二至七阶段仍只是方案，未授权实施。第八节各批次是当时快照，当前状态以最后一节为准。
> 阅读顺序：先读第七、八节，再回看历史分析。前六节保留原对话记录，其中数量、市场游戏实现、运行状态及“所有接口/界面都应统一”等部分存在过度结论，已在第七节纠正；不得直接照旧结论实施。第八节里“没有提交”“完整编译未完成”“等待用户恢复正常编译”等表述为 2026-11-05 当时状态，已被 2026-11-06 收尾记录覆盖，不是当前待办。

---

## 一、任务背景

用户提出：当前 TikiStar 项目的"设置系统"非常凌乱（蓝图 + 代码），可扩展性和通用性都很差，且发现存在两套意思非常相近的设置系统。用户想要**重新架构**整个设置系统，统一和规范化数据来源、数据存储、设置项加载等，让后续新增设置内容时不用到处改。

用户指定阅读的文档：`E:\Aiden\Note\lzzlli\TIKIstar 需求\设置系统 代码优化.md`

用户约束：
1. 不只是解决文档里的问题，而是整体重构设计。
2. 分析即可，先不改代码。
3. 用户**看不懂英文技术名词**，且对现有设置系统不了解 → 后续沟通必须用大白话、先解释名词。

---

## 二、关键代码事实（已逐行核实）

### 2.1 两套设置链并存（不是三级继承）

设置代码根目录：`MainBundleScripts/MinViableSystemSet/Modules/`

| | 旧链 | 新链 |
|---|---|---|
| 状态拥有者 | `Setting/System/SettingSystem.ts`（27KB） | `GameSetting/System/GameSettingSystem.ts`（98.7KB） |
| 配表层 | `SettingConfigSystem.ts` + `SettingPictureItemSystem.ts` | `GameSettingConfigSystem.ts`（34KB） |
| ESC 处理 | `EscapeHandleSystem.ts` | `GameEscapeHandleSystem.ts` |
| 数据模型 | `SettingDataModel`（27 字段） | `GameSettingDataModel`（约 40 字段） |
| 本地存档 key | `SettingPrefKey_SettingData` | `GameSettingPrefKey_SettingData` |
| 服务端同步 | 无（纯本地） | 有：`PGGet/PGUpdateCustomSetting` + 隐私独立协议 + `KEY_LAYOUT_*` 布局协议 |
| UI 入口 | `OpenSettingUI()` 的 openWindow 已注释 | `OpenSettingView()` → `TKPGSettingWindow`（现行唯一入口） |
| 运行时注册 | 仍注册 | 仍注册 |

注册表文件：`Tools/AgentHarness/ue/data/system-order-migration-v1.json`
- 旧链：`SettingConfigSystem`(L355)、`SettingSystem`(L359)、`EscapeHandleSystem`(L514)、`SettingPictureItemSystem`(L638)
- 新链：`GameSettingSystem`(L662)、`GameSettingConfigSystem`(L666)、`GameEscapeHandleSystem`(L690)

**核心结论**：旧链 UI 已死（openWindow 注释掉），但**运行时还活着**——初始化时仍恢复自己存档、observe 9 个字段写音量/麦克风/鼠标/窗口模式/FOV、监听 `TriggetEscape`。因此新旧两链**共同写音频、帧率、画质**，存在所有权重叠，是最大风险点。

### 2.2 新链内部结构

```
GameSettingDataModel（扁平上帝对象，observable 包装）
   │  全量 JSON 序列化 → 单 key PlayerPrefs（SaveGame 后端）
   │  server 同步：整包 JSON 上传/拉取
   ▼
GameSettingSystem（唯一写入口 setSetting；17 个手写 observe → onSetting_xxx）
   │  通过 settingConfgSys 读配置表
   ▼
GameSettingConfigSystem（DataTable 读取 + 画质规则 + CVar 监听）
   ├─ 4 个 Feature 子模块：AimAssist / AimSensitivity / ImageQuality / KeyMapping
   │    └ 基类 SystemFeatureBase<IGameSettingSystem>（组合模式，非注册表）
   └─ 运行时消费方：SoundManager / Microphone / DeviceProfile / Wwise / 相机组件 / 原生 Subsystem / 事件广播
```

关键实现细节：
- 存储：整个 model 序列化成**一个 JSON 大 blob** 塞进单 key（`GameSettingSystem.ts` L342、L864）。
- local-only 字段（`userDefineuiSeries`/`userDefineActiveLayouts`/`touchDeadZone`）靠 3 个硬编码字符串常量排除（L344-347、L882、L1013）。
- 配置：走 `DataCenterSystem` 同步读 DataTable。新链读 `SettingConfig`/`GameSettingChat`/`GameSettingPrivacy`/`GameSettingOperate`/`GameSettingCodeEvacuation`/`GameSettingDefaultVal` + 画质系列表。旧链读另一套 `GameSettingControl/Voice/Image/Picture` + `ScalabilityInfo` + `NewDeviceInfo` + `KeySetting`。
- 应用：靠 `observable` 字段级绑定 + 手写回调。新链 `watchDataChange()` 手写 observe 17 个字段（L692-709），旧链 observe 9 个（L308-316）。

### 2.3 两个遗留消费者（卡住旧链退役的硬阻塞）

1. `Systems/CatchErrorAdapterSys/CatchErrorAdapterSystem.ts`：读写旧 `SettingSystem` 的 `isNeverShowCatchUI`（L25-36）。
2. `Modules/CacheMediaPlayer/CacheMediaPlayerSystem.ts` + `TS_CacheSound.ts`：读旧 `SettingSystem.dataModel.YaoMicReceiveLevel`（CacheMediaPlayerSystem L143、TS_CacheSound L23）。

注意：`YaoMicReceiveLevel` 语义与新链 `VORecvLevel` **数值范围不同**（旧 `-10~10`、新 `0~100`），不能机械替换。

---

## 三、识别出的问题点（按严重度排序）

1. **所有权重叠（最危险）**：新旧链同时注册、初始化、写运行时状态。两个 `GameSettingVoiceID` 枚举同名但值不同（新 L44-55 值 1-10，旧 L74-88 值 0-12）。两套都调 `microphoneSys.setReceiveLevel`、都写帧率（旧 `GameUserSettings.FrameRateLimit + ApplyNonResolutionSettings`，新 `DeviceProfileSystem` CVar + 双帧策略）。
2. **`GameSettingDataModel` 是上帝对象**：一个扁平类 40+ 字段。每加一个设置项要改 6 处（Model/ServerModel/observe/onSetting/verify/UI）。
3. **存储是"一个大 JSON blob"，无字段级版本/迁移**：出现 8 个 `verifyXxxSettings()` 补丁函数（手工迁移散落）。local/cloud/device 三种作用域没显式建模，靠字符串白名单硬编码。
4. **三套几乎相同的 `varName → configs` 机制**：`operateSettings`/`codeEvacuationSettings`/`sensitivitySettings` 都是 `{configs:{[varName]:number}}`，各复制一套 addListener/removeListener/notify（三个 Map + 三个几乎一样的 notify 函数）。
5. **配置层分裂 + 可见性逻辑复制粘贴 4 遍**：`SettingConfigSystem` 里 `IsControlItemVisible`/`IsVoiceItemVisible`/`IsImageItemVisible`/`IsPictureItemVisible` 是几乎相同的循环抄了 4 遍。
6. **Feature 子模块半途而废**：方向对（`SystemFeatureBase`），但硬编码 new + 手动 init，只覆盖 4 个模块，声音/聊天/隐私/任务仍堆在主 System。
7. **画质互斥规则引擎内嵌且脆弱**：`adjustExcludeLevel`/`isLevelSafe`/`getShowLevelByDeviceGrade` 用字符串 split 解析 `sShowInfoByDevice`/`sValidDevices`。
8. **服务端同步通道不一致**：3 套协议（主设置 / 隐私 / 自定义布局）。
9. **UI 手写 81 个组件**，无 schema 驱动。

---

## 四、目标架构方向（建议，未实施）

一句话：**声明式设置项注册表 + 单一 SettingStore + 分层存储/应用适配器 + schema 驱动 UI**，让"新增设置项"退化为"加一条声明"。

```
1. Definition 层（Schema/注册表）：每个设置项 = 一条声明（key/type/默认/范围/scope/可见性规则/apply handler/UI 元数据/是否需重启）
2. Store 层（唯一权威）：get/set/reset/subscribe，set 后自动校验→应用→持久化→通知
3. Storage 适配器：LocalBackend（SaveGame 带版本号+迁移）/ CloudBackend（只同步 scope=cloud）/ DeviceBackend（本机设备偏好）
4. Applier 适配器：每个运行时消费方注册一个 applier，Store.set 后按 key 派发（替代 17 个手写 observe）
5. Rule 层：声明式规则（设备档位/平台/局内外可见性 + 互斥 + 范围校验）
6. UI 层：按 schema 元数据自动渲染控件（替代 81 个手写组件）
```

**主流游戏参考**（已向用户讲解）：
- UE 引擎原生就是"分层 + 后端路由"：`GameUserSettings`（用户偏好）/ `Scalability`（画质档）/ `DeviceProfile`（设备能力）/ `CVar`（执行点）。TikiStar 等于把这套重新发明了一遍但没收敛。
- 现代手游（原神/王者等）：声明式 setting registry + 统一 SettingService + 本地/云双写 + 配置表驱动可见性。

**落地建议（分阶段，未实施）**：
1. 确认 `GameSettingSystem` 为唯一权威，冻结旧链新增。
2. 收口两个遗留消费者（`isNeverShowCatchUI`、`YaoMicReceiveLevel`）。
3. 决定 PC 独有项（窗口/VSync/FOV/旧 FrameLimit）保留还是下线。
4. 旧链整族退役（旧 UI + SettingConfigSystem + SettingPictureItemSystem + EscapeHandleSystem → 移除注册，先做资产引用回读）。
5. 新链内部重构（Schema+Store / 合并三套 varName 机制 / observe→applier / 存储加版本号+迁移 / 同步协议收敛）。
6. UI 逐步 schema 化（最后做）。

---

## 五、术语表（面向用户的大白话解释，后续沟通必须沿用）

| 名词 | 解释 | 项目例子 |
|---|---|---|
| 上帝对象 | 一个类塞太多东西，越变越臃肿 | `GameSettingDataModel` 40+ 字段挤一起 |
| JSON / JSON blob | 把数据打包成一串文字的格式；blob=一大坨 | 40 多个设置值打包成一长串文本存一条记录 |
| observe / 监听 | 盯着某个值，一变就自动执行代码 | 17 处"VolumeLevel 变了就调声音系统" |
| 注册表 / 声明式(Schema) | 列一张清单，程序照清单自动干活，而不是写一堆逻辑 | 加新设置=加一行清单 |
| 适配器(Adapter) | 翻译插头：统一操作翻译成不同底层系统的具体调用 | 应用设置接声音/画质/输入各管各的插头 |
| 作用域(scope) | 设置项归谁管、存哪、同不同步 | 触屏死区只存本机 vs 灵敏度要上云 |
| Store | 唯一总管：读取/修改/保存/通知都走一个入口 | 替代上帝对象 |
| CVar | 引擎运行时开关/参数，画面效果靠它 | 抗锯齿/阴影/帧率最终改 CVar |
| DataTable/配置表 | 策划可改的 Excel 表，运行时读取 | 画质档位数值、默认值 |
| PlayerPrefs/SaveGame | 存档机制，存玩家本地硬盘 | 设置本地存储 |
| Feature | 超大系统按功能拆小模块 | 已拆灵敏度/画质，但只拆一半 |
| 运行时(runtime) | 游戏真正跑起来的时候 | 作用到运行时=画面/声音真的变 |
| 服务端/云同步 | 设置传到服务器跟着账号走 | 换设备灵敏度不变 |
| 协议(protocol) | 客户端服务器"怎么说话"的约定 | 存设置/隐私/布局用三套说法 |
| 迁移(migration) | 老存档缺新字段要补默认值/兼容 | 8 个 verify 函数打补丁 |
| 硬编码(hardcode) | 本应可配置的东西写死在代码里 | "哪些设置只存本地"写成 3 个固定字符串 |
| DRY | Don't Repeat Yourself，别重复自己 | 灵敏度/操作/来财三套代码几乎一样 |
| 开闭原则 | 加功能最好只"新增"少"修改" | 现在加设置要改 6 处老代码 |

---

## 六、给后续会话的交接提示

1. 用户对设置系统**零基础**、看不懂英文名词 → 任何解释先给大白话 + 比喻，术语必须逐条解释。
2. 用户要的是**整体重构设计**，不只是文档里那个"退役旧系统"的问题。
3. 第一阶段已于 2026-11-06 收尾（代码已入库、完整编译 0 errors、用户自测通过）；第二至七阶段仍是方案，须另行授权，不应顺手展开。实际实施结果以第八节最后一条为准。
4. 代码与资产可能继续变化；本文件只提供恢复上下文的方向，不能替代当前代码、资产引用和运行验证。
5. 同目录另有 `SettingUITabGuide.md`（2026-11-06）：从玩家看到的界面出发，逐个讲解 12 个设置页签的作用、蓝图与代码组成、数据来源及设计缘由，并汇总通用零件与历史包袱。本文讲「系统怎么拆」，那篇讲「界面长什么样」，重构界面前先读那篇。

---

## 七、修正后的完整重构计划（2026-11-05）

### 7.1 对历史分析的修正

- [明确依据] 新 `GameSetting_ImageQuality.ts` 已实现屏幕分辨率、三种窗口模式、应用与确认/超时恢复；PC 页实际调用这些方法。因此不能将窗口模式/分辨率列为旧链独有，也不要重新搬一套实现。新旧键位列表均不能仅凭存在就视为已实现自定义改键。
- [明确依据] 当前系统定义与状态声明在 `Config/TKFrameworkSystemTable.ini`；Native 框架读取这些表。`Tools/AgentHarness/ue/data/system-order-migration-v1.json` 是迁移输入/历史材料，不是当前注册真相源。系统定义存在、状态声明存在、实际初始化与事件执行是不同层次，必须分别核查。
- [明确依据] `GameSettingConfigSystem.GetMiniMapDefaultVal()` 仍引用旧 `SettingConfigSystem.ts` 导出的 `GameSettingDefaultID.MINIMAP_ID`；新界面还有旧 Voice UI 枚举依赖。旧链退役不止迁移两个外部消费者。
- [明确依据] `MicrophoneViewComponent.ts` 当前整文件为注释，不能将其中注入计为活跃调用。`CacheMediaPlayerSystem`、`TS_CacheSound`、`CatchErrorAdapterSystem` 有有效函数体，但其当前蓝图可达性和实际创建仍需核查，不能称其必定正在运行。
- [明确依据] `GameSettingServerDataModel` 只列特定字段，保存时按模型字段筛选；请求携带 `sDeviceId`。不是整份本地设置无差别上传，也不能仅凭上传就认定所有偏好跟账号跨设备共享。
- [修正] “每新增设置必改六处”“某个字段数量/文件数量足以证明设计差”“删除所有专用组件”“把三个服务器接口合成一个”均不是成立的普遍结论。当前已有表驱动设置与共用控件，应复用。
- [未核实] 前文对原神/王者等商业游戏内部架构的说法没有源码或官方材料支撑，不作为方案依据。
- [建议] 统一设置说明和使用入口，不强迫数据全部来自一张表；统一变化通知，不合并玩法语义；允许不同业务接口和专用编辑器保留。

### 7.2 第一阶段：旧设置链安全退役（当前已授权）

目标：当前界面和已确认保留的功能不变，玩家必要历史选择保留，旧链不再被任何必要路径依赖，然后整族删除；不是将旧类整包复制进新类。

执行顺序：
1. 按实际代码、配置、蓝图引用逐项分类：新链已有 / 必须迁移 / 确认废弃 / 尚待决定。
2. 迁出新链仍引用的旧枚举、常量；清理仅注入未使用或仅 import 的依赖。
3. 复用新窗口、画质、声音等实现。媒体音量保留实际数值语义；异常弹窗偏好归合适模块，避免塞成新“上帝类”。
4. 历史数据逐字段迁移：有效新值优先，只为缺失项迁入适用旧值；含义/单位不同的字段单独处理，禁止旧 JSON 整包覆盖新存档。迁移完成可重复执行而不覆盖后续修改；成功保存和重读前保留旧记录。
5. 切换运行时负责人及 ESC/输入路径，停止旧链重复应用；核查登录、入局、角色准备好后的应用时机。
6. 删除旧四系统及仅属于旧链的 UI/输入处理器、生成蓝图、系统定义和状态注册。保留 `LocalCultureSystem`、其他仍被依赖的语音/语言能力，不删除整个 `Modules/Setting`。
7. 验证后记录可删清单、保留能力、未验证平台和数据策略；未通过资产或行为检查不得宣布整族退役完成。

验收：新安装、只有旧档、新旧档并存、重复启动均不丢必要选择；正式设置开/关后输入恢复；音量/画质/帧率不被旧链再次覆盖；媒体和诊断偏好按确认策略保留；启动注册、蓝图引用与生成 JS 一致。

边界：不更换界面外观，不新建完整设置框架，不合并服务器协议，不擅自下线待定功能，不清理用户已有改动，不提交 Git。TS 编译仅只读检查现有 watch，禁止 kill/start 用户 watch。

### 7.3 第二阶段：统一读、改、重置和通知入口（未授权实施）

保留现有界面和存档格式，统一读取、修改、分组重置、变化订阅入口。操作、来财、灵敏度保持独立归属，但复用监听机制。

验收：调用方不依赖设置内部对象结构；仅变化项通知，现有动画和玩法隔离不回退。

### 7.4 第三阶段：统一设置说明与数据来源（未授权实施）

每个普通设置登记稳定标识、类型、默认值来源、范围/选项、分组、可用条件。文案/排序/策划默认走配表；支持分辨率读设备；画质默认沿用项目 ini/设备配置；生效逻辑由代码实现。不强迫所有数据合成一张表。

验收：同一项的默认值、范围、选项语义不再在多处各自定义；名称/排序变化不改变保存标识。

### 7.5 第四阶段：整理保存、加载与服务器同步（未授权实施）

明确本机、账号、设备、玩法/操作方式维度；规定加载顺序、旧档升级、保存失败、迟到回包与玩家修改冲突的处理。保留主设置、隐私、KeyLayout 的业务协议，先统一客户端调用与结果表示，不擅自改后端。

验收：新安装、旧档、重启、切号、断网/失败均有明确结果；不能把内存更新或请求发出当保存成功。

### 7.6 第五阶段：按领域拆分生效逻辑（未授权实施）

设置总管管理选择；声音、画质、输入/相机、隐私、自定义布局各自负责生效。复用当前子模块，完善对设备默认、玩家选择、实际生效值的区分；对象尚未准备好时在正确生命周期再应用，不依赖打开设置界面。

验收：保存值、显示值、实际效果对齐；重进玩法/换角色后必要设置仍正确。

### 7.7 第六阶段：重构界面与蓝图（未授权实施）

共用普通开关、滑条、多选；用设置说明生成普通分组/内容；统一页签、禁用原因、帮助和恢复默认。自定义布局、改键、下载管理等复杂业务保留专用界面，不以全自动生成或组件数最少为目标。

验收：按正式入口验证鼠标/触屏操作、滚动、帮助、禁用、重置及布局编辑，不以直接调用内部方法代替玩家可达性。

### 7.8 第七阶段：用真实新增项验证，再清理过渡代码（未授权实施）

选择一个真实新增需求，验证登记说明、必要生效逻辑后无需修改主窗口、存档筛选、默认补丁等多个无关位置；清理过渡接口/映射，完成电脑与移动端及保存恢复验收。

---

## 八、第一阶段执行记录

### 2026-11-05 · 开始

- 已将用户认可的七阶段计划与前述修正补入本文件。
- 已授权范围：第一阶段旧链退役；第二至七阶段仍不实施。
- 工作区当前存在用户已有 `.vscode/settings.json`、`TikiStar.uproject` 和多份 `.b` 配表产物修改，本任务不覆盖、不清理、不暂存这些改动。
- 第一阶段尚未完成；本批仅完成下述共享定义和无效依赖整理，未执行数据切换或旧链删除。

### 2026-11-05 · 本批完成：共享定义与无效依赖迁出

实际源码改动（16 个文件）：
- `GameSetting/Model/GameSettingModel.ts` 定义 `GameSettingDefaultID` 与 `VOICE_TYPE_ENUM`；所有原编号及反向枚举值不变。
- `GameSettingConfigSystem.ts`、`GameSettingViewComponent.ts`、`GameSettingOnLoginViewComponent.ts` 改读新模型，不再依赖旧配置/声音界面。旧 `SettingConfigSystem.ts`、`VoiceSettingComponent.ts` 暂时导入并转出同一份值，保持尚未退役的调用路径可用，不复制定义。
- 清除 8 个新链 Common/Chat/Privacy 组件未使用的旧类型引用。
- `TikiCommonCheatSystem.ts` 移除未使用的旧系统类型与注入；`TS_SettingInputHandler.ts` 仅清旧 import，保留 `TriggetEscape` 事件。
- 新增定向回归 `Tools/Tests/test_game_setting_shared_defines.cjs`，同步现有 `openspec/specs/mvss-game-setting/spec.md`。

未实施：玩家存档迁移、媒体/异常消费者切换、旧系统停用、四个系统及旧UI/蓝图删除、运行时注册变更、任何后续阶段；没有提交或暂存，没有改动用户原有工程/配表文件。

验证结果：
- `node Tools/Tests/test_game_setting_shared_defines.cjs` 通过，执行真实生产模型，核对默认编号、18 个声音枚举的正反向值、新链导入边界、旧路径转出以及 ESC 事件保留。
- 新链源码精确搜索不再命中旧 `Setting/System` 或 `Setting/UI` 依赖。上述源码错误诊断为 0；本任务范围 `git diff --check` 通过。
- `node Tools/Tests/test_game_setting_shared_defines.cjs --emitted` **失败**：正式 `GameSettingModel.js` 尚缺 `GameSettingDefaultID` 导出。不能称运行产物或编译通过，暂不要以本批源码进行运行验收。
- 只读 `check-ts-watch.ps1` 没找到本轮 `Found N errors` 结束标志；没有杀、重启或额外启动用户 watch，也未手写 JS 替代编译。

环境阻塞：
- `check-editor-workspace.ps1 -RunTkueProbe` 的 `ok=false`，唯一 error 是 8 个尚未物化的 LFS 文件；另有 stale tkue state，当前没有可绑定的交互 Editor。已有 LocalDS/客户端进程不用于代替 Editor，不停止它们。
- 经批准尝试现有 `check-lfs-pointers.ps1 -Fix -Json`，在第 189 行 `Remove-Item Env:GIT_LFS_SKIP_SMUDGE` 失败：环境变量不存在，安全删除检查报 `SAFE_DELETE_FAIL_CLOSED/path-not-found`。修复尚未进入 LFS 恢复步骤；没有改安全机制，没有另找命令绕过，没有启动 Editor/PIE，没有查证或删除二进制资产。

继续顺序：
1. 先解决 LFS 恢复脚本与安全删除检查的环境兼容问题，或由用户补齐 8 个资源；不以跳过护栏继续。额外修改基建需要明确授权。
2. 由现有正常编译流程生成覆盖本轮改动的 JS，复跑定向 `--emitted`，确认类型检查结果；watch 仍只读，不主动 kill/start。
3. 在护栏通过且项目身份核验后检查旧四系统、专属UI、ESC处理器及 MicShortcut 蓝图的真实引用；不删除仍被新入口或其他业务使用的资产。
4. 完成媒体音量/异常偏好与必要公共音量的逐字段迁移。旧/新麦克风尺度、画质/帧率索引不可原值照搬；旧鼠标、镜头距离、VSync的保留策略仍需明确，不擅自下线。
5. 数据、消费者、运行注册与生成资产对齐并通过行为验收后，才执行旧链整族删除。旧 `TS_SettingInputHandler` 的事件逻辑仍被新链需要，不能按目录机械删除。

最小改动自查：本批只迁出已确认共享定义和删除无效引用；所有旧运行行为、存档和资产保留，未实施第二至七阶段。

### 2026-11-05 · 后续实施：资源恢复及结构退役完成，完整验收仍待续

**当前状态优先于以上历史记录：第一阶段代码/注册/生成蓝图清理已实际实施，完整编译和玩家行为验收尚未完成；不进入第二至七阶段。**

#### 环境与授权

- 用户明确批准资源恢复脚本的最小兼容修复，且选择手动打开 Editor；后续连接只使用手动打开的当前工程进程36904、session `setting-retirement`，不主动再启动 Editor、不关闭已有客户端/DS。
- `check-lfs-pointers.ps1` 只在环境变量/已移动临时文件仍存在时调用原删除入口；未绕过安全删除保护。原 `-SelfTest` 通过，8个LFS占位文件已恢复，资源状态检查和Editor工作区护栏通过。
- 本轮另发现既有编译钩子的删除文件问题，尚未修改；资源脚本修复授权不被当成修改其他共享基建的空白授权。

#### 重新核实的事实与取舍

- `Config/TKFrameworkSystemTable.ini` 中旧 `SettingSystem` / `SettingConfigSystem` 原先只有定义，没有状态启用键；旧ESC在Root、画质细项在InGame有状态键。不能沿用“两个设置系统必定同时应用音量”的旧结论。
- 旧模型实际共用四路音量均为0～100，不是0～1；`YaoMicReceiveLevel` 默认实际为10，增益4，不是默认0。以读到的类初始化/滑条 setter/媒体换算为依据。
- 新窗口/分辨率已有实现，不另搬旧索引。旧麦克风标度、画质/帧率索引不能证明等价；旧鼠标/镜头/VSync随未启用旧主系统已经不参与当前正常生效。本轮不恢复这些副作用，也不销毁原旧记录，后续若要重新开放这些功能，需要独立明确需求。

#### 已实施范围

1. 共享编号已迁入新模型，移除无效旧导入和注入。新主类新增本机媒体字段 `YaoMicReceiveLevel:number=10`，保持历史-10～10标度和换算，不上传也不被回包覆盖。
2. 新增纯函数 `GameSetting/Model/LegacySettingMigration.ts`，读旧记录仅迁四路同标度音量与媒体字段；有效新值含0优先，非法旧值忽略。沿用现有默认初始化后补齐，再请求保存完整模型。没有迁移标记、没有删除旧档，因此未成功落盘仍有原数据可重试。
3. `CacheMediaPlayerSystem` / `TS_CacheSound`改读 `GameSettingSystem`，音量公式及实际观察器保持原样。异常偏好改为诊断专属 `CatchErrorPrefKey_NeverShow`：新值优先、旧布尔值兜底、默认true；原设置系统不再是其依赖。
4. 删除4个旧系统、22个旧专属UI和1个旧界面初始化钩子，共27个TS及对应旧JS；清理MVSS启动钩子、4个旧服务标识、6条现行ini定义/状态行、3个生成蓝图身份侧车。
5. 实际Editor资产引用核查：旧目录共6个生成蓝图，旧四系统外只引用于两份CookList；已备份四蓝图和两清单到 `Saved/AgentAnalysis/setting-retirement/asset-backup/`。通过Editor清除两清单各4条引用，8091→8087、6844→6840，保存读回并删除四旧系统生成蓝图；复查旧目录仅剩 `LocalCultureSystem` 和 `TS_SettingInputHandler`。
6. 保留Microphone模块、语言系统、现用ESC事件发射器、新界面/后端协议及所有原始旧设置存档。注释/历史材料中的旧名不机械清理，不修改用户原有工程/.b配表或其他任务同文件的改动。

#### 验证结果与证据

- `node Tools/Tests/test_game_setting_shared_defines.cjs` 及 `--emitted` 均通过：真实模型编号和枚举、新链依赖、旧文件/注册清理、保留新系统和ESC事件。
- `node Tools/Tests/test_game_setting_legacy_migration.cjs` 及 `--emitted` 均通过：执行生产迁移/初始化/诊断偏好/媒体监听方法，覆盖旧档解析、范围、0值、有效新值优先、重复启动、陌生新字段保留、true/false独立迁移及增益4/2/0。
- 上述存档后端为可重启替身，未写入用户实际存档，不能据此声称磁盘保存或界面验收通过。未执行PIE、手机版、声音实听或实际设置开关/输入恢复。
- 本任务差异格式检查通过。IDE诊断曾显示MVSS旧钩子第12/23行找不到，但重新读实际文件已无此引用，属于未更新快照；仍需完整编译确认，不能以源码检查替代类型通过。主类另有未改的 `NodeJS.Timeout` 命名空间诊断，未擅自改无关行。
- 资产证据：`assets-before.json`、`cook-before.json`、`assets-retired.json`。生成蓝图当前不在根Git跟踪清单，实际删除已由Editor读回；其可追溯内容保存在备份中，不因git状态无删除行就称不存在或已提交。

#### 当前阻塞与继续顺序

- 用户现有watch在11:54:54因删除源文件触发 `tsconfigs/tsclass-json-emitter/program-hook.js:33` 的 `TypeError: Cannot read properties of undefined (reading 'text')` 后退出。当前代码对 `program.getRootFileNames()` 中每项直接取 `getSourceFile()`，再不判空读取text；增量删除时缺失SourceFile导致异常。本轮只读定位，未修改该钩子、未重启watch、未手写生成JS。
- 已生成的迁移与两个消费者定向正式JS检查通过，但并不表示删除后的全部模块/服务标识/元数据与现行输入均完成编译。暂不运行PIE验收。
- 下一步先获得针对编译钩子删除文件兼容处理的明确授权并加定向回归；之后由用户正常启动/恢复自己的watch，本agent继续只读检查，不主动kill/start。完整编译及资产生成读回确认后再进行当前工程PIE的正式设置入口、音量/画质/媒体/异常偏好与保存恢复验收。
- 本阶段仍未宣称完整PASS，未commit/push，未进入下一阶段；实际结构退役和失败原因已同步到现有功能spec。

最小改动自查：只实现旧链必要迁移/删除和获准的LFS恢复兼容；未新增完整设置框架、未更改后端协议或界面设计，未擅自复活旧行为或关闭安全机制。

### 2026-11-05 13:01 · 获准最小修复删除文件编译钩子

- 用户已明确批准“只修缺失源文件导致的异常并加定向回归”，编译仍由用户正常启动；本轮没有启动、重启或关闭任何 watch，没有运行业务 ttsc、Editor 或资源生成。
- 真因：删除源文件后，真实 TypeScript Program 的根路径仍可包含该文件，但 `getSourceFile()` 返回 undefined。此前钩子把它纳入变化集合并读 `.text`；仅修钩子还不够，发布器也会按残留根路径重新选中已删文件，因此两处集合必须一致。
- 生产最小改动：`tsconfigs/tsclass-json-emitter/program-hook.js` 过滤缺失 SourceFile，让原上轮差集递交删除路径；`publish.js` 的源集合采用同一条件。未过滤磁盘存在性、未新增catch吞错，原输入一致性/过期检查、发布事务、锁和退出码语义不变。Program尚保留旧AST且磁盘已删的情况仍会被StaleProgramInputError拒绝。
- 回归新增于现有 `TSTool/TsBlueprintGitDecouple/test_emit_modes.js`，不新造运行框架：真实Program+emitter+publisher+临时小工程，覆盖残留根删除、根集合移除、首次complete缺失根、重复缺失、同路径恢复和普通修改；核对manifest中旧描述/SourceFiles/SkippedSources被移除、无关描述字节不变、重复缺失不制造新代。另验证旧AST删除的watch延后/build失败、正式清单不变、下一轮合法删除和恢复正常。
- 修复前：夹具路径比较修正为项目已有归一化后，确实在 `program-hook.js:33` 重现同一undefined.text异常（退出1）。修复后：`node TSTool/TsBlueprintGitDecouple/test_emit_modes.js` 整套通过（退出0），预期的过期/类型负例日志不视为整套失败。
- 相邻回归：`test_program_input_cache.js`、`test_json_refresh_logging.js` 均退出0；三份生产/测试脚本 `node --check` 通过、IDE诊断0、任务范围diff格式检查通过。测试仅临时小工程并由原测试finally清理，未更改业务Generated/JS或用户存档。
- 同步现有 `ts-blueprint-git-decouple/spec.md` 与 `mvss-game-setting/spec.md`；没有Git提交或推送。

当前仍待：用户按日常方式启动自己的watch/正常编译，并确认本轮结束；本agent只读核对错误数、正式JS/manifest及资产应用状态，再继续正式设置入口和保存恢复验收。由于生成器代码指纹改变，下一次complete可能按原规则转为Full，这是既有回退机制，不要将该次耗时或未应用旧清单误当成本次钩子失败；不擅自清空Generated或绕过资源锁。

当前第一阶段状态：必要迁移、源码/注册/蓝图退役与删除兼容修复已实现，定向回归通过；完整工程编译和玩家行为验收未完成，不进入第二阶段。

最小改动自查：本轮只改缺失SourceFile相关的两处源集合、现有定向回归及必要状态记录，保留所有安全与发布约束。

### 2026-11-05 13:33 · 处理实际ttsc类型错误

- 用户恢复watch后，日志13:21:44报告唯一错误：`LegacySettingMigration.ts(28,13) TS2322: unknown is not assignable to number`。这是本任务新增代码的类型问题，不是既有错误；之前执行生产转译方法的行为回归不包含完整类型检查，因此未检出。
- 最小修复：把 `legacy[key]` 先读入 `const value`，通过原数值类型守卫校验同一个局部变量，再赋值到补丁。仅修类型收窄，白名单、范围、零值及新值优先策略不变。
- `test_game_setting_legacy_migration.cjs` 生产源码行为回归通过，IDE错误诊断0，目标差异格式通过。用户watch已自行在13:33:04开始增量编译；本agent仅只读日志，未kill/start watch、未手写生成JS。
- 最终只读日志确认13:34:17出现 `Found 0 errors. Watching for file changes.`；正式迁移JS已包含局部变量修复，`test_game_setting_legacy_migration.cjs --emitted`通过。实际ttsc单一类型错误已消除，不需要重启watch。资源应用/PIE及用户真实存档持久化仍未在本轮验收，不由0错误推断游戏行为全部通过。

最小改动自查：本轮仅修新增迁移代码的类型收窄错误及续记结果，没有额外重构。

### 2026-11-06 · 第一阶段收尾状态核对（当前状态，优先于以上历史记录）

用户于 2026-11-06 明确反馈“已经自测过没有问题”。本批只做文档与代码一致性核对：只读检查当前工作区、提交历史、编译日志与生成产物，随后更新本文件与 `openspec/specs/mvss-game-setting/spec.md` 的状态表述；未改动任何源码、资产、配表或用户已有工程文件，未启动/重启/关闭用户的编译进程，未提交。

**与前述历史记录不一致、现已核准的事实：**

- [明确依据] 第一阶段三次改动均已入库：`5e1f9ad`（旧设置系统退役，58 files / -6119 行）、`819ce8c`（删除 TS 文件编译异常修复）、`7df4b8c`（资源恢复脚本兼容修复），提交时间 2026-11-05 15:36 / 15:40 / 15:42。此前“没有提交或暂存”“未 commit/push”是当时状态，现已不成立。
- [明确依据] 完整工程编译已通过：`.ttsc-watch.log` 于 2026-11-06 16:24:44 为 `Found 0 errors. Watching for file changes.`，同份日志另有 `mode=complete` 全量发布记录；`git status --short` 当前只剩用户自有的 `.vscode/settings.json`、`TikiStar.uproject` 两处改动。此前“等待用户恢复正常编译”“完整编译未完成”两项前置已满足；当时的“不将定向检查记为第一阶段全部完成”是针对这两项前置的谨慎口径，作为验收纪律保留，不作删除。`819ce8c` 的钩子修复在真实编译流程中生效。
- [明确依据] 正式生成 JS 已含退役后逻辑：`GameSettingSystem.js`、`LegacySettingMigration.js`、`GameSettingModel.js`、`CatchErrorAdapterSystem.js`、`CacheMediaPlayerSystem.js`、`TS_CacheSound.js` 均含新字段、迁移调用与消费者换算；旧链生成 JS 与旧目录生成蓝图已清空，`Modules/Setting/` 只剩 `LocalCultureSystem` 与 `TS_SettingInputHandler`。
- [明确依据] `Config/TKFrameworkSystemTable.ini`、`GameObjectTypes.ts` 已无旧四系统的定义、状态键与标识；旧存档 key `SettingPrefKey_SettingData` 在生产路径中只有读取（迁移初始化、异常弹窗偏好兜底），`setString` 无旧 key 写入；`GameSettingDefaultID` / `VOICE_TYPE_ENUM` 唯一定义在 `GameSetting/Model/GameSettingModel.ts`；三个遗留消费者均改读新链。

**验收口径（诚实边界）：**

- [明确依据] 用户 2026-11-06 自测通过，属用户侧验收结论；本会话未收到截图、录像或运行日志，用户未说明自测覆盖的具体场景与平台 [待澄清]。不把用户口述转述为 agent 完成的 PIE/真机验收，也不把两个定向脚本的可重启内存替身结果当作磁盘持久化或界面验收证据。
- [明确依据] `Saved/AgentAnalysis/setting-retirement/` 仍只有 `assets-before.json`、`cook-before.json`、`assets-retired.json`、`editor-ready.json` 与 `asset-backup/`；`editor-ready.json` 的 `ok:false` 是 2026-11-05 的历史回执，不代表 2026-11-06 的 Editor 状态。CookList 删除后字节回读、蓝图编译回读、`cook-after.json` 与移动端证据仍缺；如需审计级资产证据应另行补齐，但按用户本次确认，不作为第一阶段未完成的阻塞项。

**当前判定**：第一阶段（旧设置链安全退役）的代码、注册、生成产物、完整编译与用户自测均已完成；不进入第二阶段。第二至七阶段仍需单独授权。第二节第 2.3 项列的两个遗留消费者已收口，不再是退役阻塞。

最小改动自查：本批只更新会话存档与功能 spec 的状态表述，不修改任何代码、资产、配表、用户已有工程改动；不伪造新增验收证据，不把历史批次记录改写为当时未发生的结果。
