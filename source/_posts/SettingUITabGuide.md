---
title: "SettingUITabGuide"
date: 2026-11-07 03:18:28
section: blog
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
show_header: false
---
# 设置界面逐页讲解（重构前的认路底稿）

> 写于 2026-11-06。
> 用途：我此前只做过「隐私」这一页，其他页不是我开发的。后面要整理、重构设置界面，得先弄清"现在到底有哪些页、每页管什么、当初为什么长这样"。这篇就是把这件事讲清楚，蓝图侧和代码侧都讲。
> 配套文档：`SettingSystemAnalysis.md` 讲的是"系统怎么拆、旧系统怎么退役"，属于后台视角；本篇讲的是"玩家看到的界面"，属于界面视角。两篇不是一回事，别混着读。
> 怎么读：先看第一节和第三节（一分钟能扫完），再按需翻第四节里某一页。看不懂的词回第零节查。
> 状态：本篇是**现状讲解 + 观察**，不是重构方案，也没有批准任何改动。第七节列的"值得统一的地方"只是观察结果，动手前要另行确认。

**路径缩写**（下文依据里大量出现，先约定好，都是相对仓根）：
- `UI/` = `MainBundleScripts/MinViableSystemSet/Modules/GameSetting/UI/`
- `System/` = `MainBundleScripts/MinViableSystemSet/Modules/GameSetting/System/`
- `Model/` = `MainBundleScripts/MinViableSystemSet/Modules/GameSetting/Model/`
- `DataCenter/` = `MainBundleScripts/MinViableSystemSet/Modules/DataCenter/`

---

## 零、先把词认齐（后面每页都会用到）

| 词 | 大白话 | 本项目的例子 |
|---|---|---|
| 窗口 | 屏幕上弹出的那一整块设置面板 | `WB_PartyGame_SettingView1`，注册名 `WindowDefine.TKPGSettingWindow` |
| 页签 | 左边那一列可以点的分类按钮 | 「操作」「画质」「隐私」……共 12 个 |
| 切换器 | 一叠纸一次只露出一张的控件；给个编号就翻到那一页 | `WidgetSwitcher_Right` 管右边 12 页；每个页签按钮自己还有一个小的管"选中高亮" |
| 蓝图 | 美术/策划在编辑器里摆控件做出的界面文件，管"长什么样" | `WBP_OnOffSwitch`、`WB_Setting_PrivacyPanel` |
| 控件 | 蓝图里的一个具体零件：按钮、滑条、列表、文字 | `Button_Switch`、`ListView_ChannelContent` |
| 组件 | 一段代码，负责给蓝图里的控件"接上电"：显示什么、点了干什么 | `PrivacySettingViewComponent`、`GameSettingViewComponent` |
| 配置表 | 策划能改的表格，程序运行时读它，不用改代码就能加减内容 | `mapGameSettingPrivacy` |
| 表驱动 | 界面有几行由配置表决定，表里加一行界面就多一行 | 隐私、聊天、来财行动都是这种 |
| 存档 | 存玩家选择的地方。分"本机"（只在这台设备）和"上云"（跟着账号走） | 本机一个总存档 `GameSettingPrefKey_SettingData` |
| 监听 / 观察 | 盯着某个值，一变就自动执行对应代码 | 音量一改就调声音系统 |
| 事件 / 广播 | 喊一嗓子"某事发生了"，谁关心谁自己接 | 帮助问号、隐私变化 |
| 协议 | 客户端和服务器约好的"怎么传数据" | 主设置、隐私、自定义布局各有一套 |
| 下游 | 设置改完之后，真正让画面/声音/手感变了的那个系统 | 声音管理器、相机、设备档位 |
| 生效 | 值改了，游戏里真的变了这个结果 | 和"只是存下来了"是两件事 |

> 一句话：**蓝图管样子，组件管接线，配置表管内容，存档管记住，监听管生效。**

---

## 一、先拿你做过的「隐私」页当尺子

你熟悉隐私页，那就先把它拆成一条通用流水线。其他 11 页，本质都是这条流水线的不同做法。

**隐私页的一次点击，走了 5 步**（[明确依据] `UI/Privacy/PrivacySettingViewComponent.ts:57-89`、`UI/Privacy/PrivacySettingItemComponent.ts:25,120`、`System/GameSettingSystem.ts:1437-1440,1442-1461`）：

1. **蓝图摆好样子**：`WBP_Setting_PrivacyPanel` 里有一个 `ListView_ChannelContent`（分组列表）和 `WBP_UserAgreement`（用户协议链接）。
2. **组件接电**：`PrivacySettingViewComponent` 把 `ListView_ChannelContent` 绑成列表，数据来源是 `context.privacySettings`；每一行交给 `PrivacySettingComponent`，行里的开关交给 `PrivacySettingItemComponent`。
3. **表里读内容**：`mapGameSettingPrivacy` 表决定有哪几组、每组几个开关、每个开关叫什么、帮助写什么。[明确依据] `System/GameSettingConfigSystem.ts:403-406`、`UI/Privacy/PrivacySettingComponent.ts:37-56`
4. **点一下存下来**：行组件发一个组件内部事件 `onPrivacySettingUpdateEvent`，冒泡到 `PrivacySettingViewComponent`，由它调 `settingSys.setSetting("privacySettings", 整包数据)` 写进本机存档。注意这里是**整包写回**，不是一个开关一个键。[明确依据] `UI/Privacy/PrivacySettingViewComponent.ts:53,72-74`
5. **告诉别人变了**：`GameSettingSystem` 盯着 `privacySettings`，变化时广播 `SettingTitlePrivacyUpdate`；另外隐私里的"称号是否展示"走的是**单独的隐私协议**发给服务器，不混在设置大包里。[明确依据] `System/GameSettingSystem.ts:712,1437-1440,1442-1461`

还有第 6 步是**帮助问号**：行里点问号 → 发 `ShowPrivacySettingTipEvent` → 转成全局事件 `SettingWindowShowHelpTips` → 主窗口弹出统一的帮助浮层。**这一步全 12 页都是共用的**，是整套界面里最干净的一处复用。[明确依据] `UI/Privacy/PrivacySettingViewComponent.ts:76-89`、`UI/GameSettingViewComponent.ts:187,363-405`

**后面每页我都会回答这同一组问题**：玩家能改什么 / 蓝图怎么摆 / 内容从哪来 / 存到哪 / 改完谁让它生效 / 和隐私页比差在哪。

---

## 二、整个设置窗口是怎么搭起来的

### 2.1 一句话骨架

**只有一个窗口**。左边一列 12 个页签按钮，右边是 12 页内容**叠在一起**的切换器，点左边哪个按钮，右边就翻到对应那一页。[明确依据] `UI/GameSettingViewComponent.ts:417-421,804-811`；`System/GameSettingSystem.ts:89-117`

- 打开入口：`GameSettingSystem.OpenSettingView()` → 窗口管理器打开 `TKPGSettingWindow` → `GameSettingViewController` 创建根组件 `GameSettingViewComponent` → `onBind()` 把 12 页逐个接上电。[明确依据] `System/GameSettingSystem.ts:1300-1321`、`UI/GameSettingViewController.ts:10-26`
- 窗口蓝图：`WB_PartyGame_SettingView1`，是「全屏弹窗、带遮罩」。[明确依据] `Content/EditorTools/WinDefs/DT_WindowDefine_MinViable.csv:10`
- 点页签：12 个按钮统一调 `selectSettingTab(页签)`，改一个"当前选中哪一页"的值，再播一个切页动效 `DX_PageSelect`。右边切换器和每个按钮的高亮，都是**盯着这个值自动变的**，不是手动挨个改。[明确依据] `UI/GameSettingViewComponent.ts:804-811,417-421`
- 关闭：播完出场动效后调 `CloseSettingView()`，同时**恢复被屏蔽的角色输入**、把设置写回服务器、通知自定义布局收尾。**必须用这个方法关**，代码里有注释说明：打开时屏蔽了输入，不这样关会卡住操作。[明确依据] `System/GameSettingSystem.ts:1299,1388-1419`
- 打开时屏蔽输入：忽略移动/视角、隐藏虚拟摇杆；关闭时逐项恢复。

### 2.2 一个很容易踩的坑：左边第几个，不等于右边第几页

页签在代码里有**两套编号**：

- `EGameSettingType` 是"这一页叫什么"，共 12 个值，0～11，这是**给外部跳转用的稳定编号**。[明确依据] `System/GameSettingSystem.ts:89-102`
- `GAME_SETTING_PANEL_INDEX` 是"这一页在右边切换器里排第几"，是一张单独的对照表。[明确依据] `System/GameSettingSystem.ts:104-117`

两张表的顺序**不一样**：比如「画质」在枚举里是 5、右边切换器却排 1；「音效」枚举是 3、右边排 5；「灵敏度」枚举是 10、右边排 3。而左边按钮的物理顺序又是蓝图里 `ScrollBox_76` 的子项顺序（规格记录是「操作」「来财行动」「音效」排前三），跟上面两套都不同。[明确依据] `openspec/specs/mvss-game-setting/spec.md:202`

> **给重构的提醒**：加一页或调顺序，得同时看枚举、对照表、蓝图左边控件顺序、蓝图右边切换器子项顺序四处。这也是为什么现在"加一页"很费劲。
> [无法核实] 蓝图是二进制文件，右边切换器 12 个子项的实际摆放顺序没法从代码直接读到；只能读到代码给出的对照表。另外规格文档里有一条旧记录说「载具在索引 11」，和当前代码（载具 4、操作面板 11）对不上，**两处都先标着，不擅自判断谁对**。[明确依据] `openspec/specs/mvss-game-setting/spec.md:120` 与 `System/GameSettingSystem.ts:104-117`

### 2.3 每个页签都是"三件套"，而且要手写 12 遍

每个页签在 `onBind` 里都要绑三个控件：一个点击按钮、一个左侧容器、一个管选中高亮的小切换器，控件名全部硬编码。比如音效是 `Button_Voice_1` / `CanvasPanel_Voice` / `WidgetSwitcher_Voice`。选中高亮约定"小切换器第 0 页 = 选中、第 1 页 = 未选中"。**没有"照着清单自动生成 12 个页签"这回事**。[明确依据] `UI/GameSettingViewComponent.ts:423-797`

### 2.4 哪些页会显示

`enableSettingMap` 是一张总开关表，12 页里 **11 页默认显示，只有「操作面板」默认隐藏**，而且全仓找不到把它打开的地方，基本是个遗留页。此外：[明确依据] `System/GameSettingSystem.ts:394-407,1421-1428`

- 「视频/精彩时刻」由一个全局配置开关动态决定显示与否。[明确依据] `System/GameSettingSystem.ts:479-496`
- 「画质」在模拟器上整页隐藏。[明确依据] `UI/GameSettingViewComponent.ts:455-465`
- **局内打开和大厅打开，页签清单是一样的**，不因为在游戏中就少几页；变的只是底部按钮文案（「退出对局」/「退出登录」）、恢复默认按钮、脱离卡死按钮。[明确依据] `UI/GameSettingViewComponent.ts:326-342,727-730`

### 2.5 电脑和手机：同一个窗口，内部换两套零件

主窗口只有一份蓝图，但里面有两个切换器按平台翻页：[明确依据] `UI/GameSettingViewComponent.ts:84-99,470-489,651-653`

| 位置 | 手机显示 | 电脑显示 |
|---|---|---|
| 画质页 | 档位/分辨率/帧率列表 + 5 个效果开关 | 窗口模式/分辨率/画质预设三个下拉 |
| 操作页 | 自定义布局、摇杆、防误触、锁定跑 | 改键位列表（**目前只展示、不能真改**） |

电脑上还多一个「退出游戏」按钮。另外电脑有自己独立的 ESC 按键链路，手机上则走通用的 `TriggetEscape` 事件。[明确依据] `UI/GameSettingViewComponent.ts:287-306`；`System/GameEscapeHandleSystem.ts:52-54,338-354`；`System/GameSettingSystem.ts:1294-1297`

### 2.6 登录界面是"同一个窗口的另一种用法"

还没登录时也能打开设置（为了下资源包）。做法是：**复用同一个窗口蓝图，但换一个控制器** `GameSettingOnLoginViewController`，它把左边 12 个页签全部藏起来、右边切换到下载管理那一页、隐藏退出和恢复默认按钮。[明确依据] `UI/GameSettingOnLogin/GameSettingOnLoginViewComponent.ts:109-186`

> 设计上的意思：[推断] 登录前账号相关信息都拿不到，只有"资源下载"能用，所以与其再做一套登录专用界面，不如复用同一个壳子、换个控制器把不用的藏掉。推断链：同一窗口键 + 覆盖控制器 + 只绑定下载页组件 → 复用外壳而非重建。

---

## 三、12 页速查表

按右边切换器的编号排（这是代码里的稳定顺序）。"和隐私页比"一列是给你快速建立感觉用的。

| # | 页名 | 玩家能改什么 | 页面怎么造 | 数据存哪 | 和隐私页比 |
|---|---|---|---|---|---|
| 0 | 操作 | 按键位置、摇杆类型、锁定跑、防误触范围、改键位（电脑只看） | 手写 + 一整套专用编辑器窗口 | 本机为主，布局另走云端协议 | 复杂得多，有好几个独立窗口 |
| 1 | 画质 | 画质档、分辨率、帧率、5 个效果开关、动作风格 | 手机/电脑两套，表驱动列表 | 只存本机 | 多一层"设备档位决定能不能点" |
| 2 | 来财行动 | 辅助瞄准、准心、攀爬、小地图等玩法开关 | **表驱动列表**，和隐私最像 | 按名字存，会上云 | 最像隐私，但存法和通知方式不同 |
| 3 | 灵敏度 | 10 条滑条 + 转向模式 | 手写滑条，范围/文案读表 | 按名字存，会上云 | 滑条不能靠表里加一行生成 |
| 4 | 载具 | 方向键 / 摇杆 二选一 | 手写两个按钮 | 会上云 | 最简单的一页 |
| 5 | 音效 | 9 条音量滑条 + 音乐分组 | 手写滑条 | 只存本机 | 跟设备走，不跟账号走 |
| 6 | 视频（精彩时刻） | 一个录制开关 + 打开 App | 手写 | 只存本机 | 显隐由外部总开关决定 |
| 7 | 聊天 | 各频道的提示开关 | **表驱动列表** | 只存本机 | 和隐私几乎同构，但换了一套行组件 |
| 8 | 任务 | 自动切换追踪任务，一个开关 | 手写 | 走服务器，但不是设置大包 | 唯一走"公共设置字段"的 |
| 9 | **隐私（你做的）** | 各隐私开关 + 用户协议链接 | **表驱动列表** | 本机 + 独立隐私协议 | 尺子 |
| 10 | 下载管理 | 资源包、清理缓存 | 列表，数据来自下载系统 | 本机 | 登录前唯一能用的页 |
| 11 | 操作面板 | 界面缩进两条滑条 | 手写 | 只存本机 | 默认隐藏，基本是遗留页 |

另外还有 3 样"不是页签但属于这个窗口"的东西：**恢复默认弹窗**（独立窗口，只列操作/画质/灵敏度 3 项）、**帮助浮层**（全页共用）、**云端方案管理**（代码被整段注释，已停用）。[明确依据] `UI/SettingWindowDefaultViewComponent.ts:40-46`；`UI/GameSettingViewComponent.ts:759-765`

---

## 四、逐页详解

### 4.0 操作（最复杂的一页）

- **玩家能改什么**：选玩法（来财/大世界/快乐老家等）→ 选一套按键布局方案 → 进编辑页拖按钮改位置、改大小、改透明度、隐藏按钮；还有摇杆类型、锁定跑、防误触范围、方案命名/分享/搜索/删除。电脑上这一页换成"改键位列表"，但代码里写着"暂时不实现改键位"，只展示不修改。[明确依据] `System/Feature/GameSetting_KeyMapping.ts:41`
- **蓝图**：`WB_DefinedPanel_New`（新面板）、`WB_DefinedPanel`（旧面板残留小地图绑定）、`Widget_KeyMapping`；玩法按钮、`TileView_Redact` 方案卡、`JoystickTypeSetting`、`LockRunSwitch`、`TouchRangeSetting`、"其他"下拉。[明确依据] `UI/GameSettingViewComponent.ts:650-672`、`UI/UserDefine/GameSettingDefinedPanelNewViewComponent.ts:31-35,95-165`
- **一整套专用窗口**：布局编辑（`WB_DefinedWinDow1`）、方案管理、分享码、搜索他人方案、命名/改名、防误触死区编辑器（`WB_DefinedPanel_DeadZone`）。每个玩法还有各自的"编辑预览蓝图"用来显示按钮位置。[明确依据] `UI/UserDefine/` 目录、`Content/EditorTools/WinDefs/DT_WindowDefine_TKPartyGameSystem.csv:100-104,289`
- **数据**：布局卡读 `DT_UserDefineConfigData`；玩家方案 `userDefineuiSeries` 只写本机；"当前用哪套"走独立的自定义布局云端协议（含分享码）；防误触、按玩法的摇杆/锁跑都只存本机。[明确依据] `System/GameSettingSystem.ts:347-350,893`；`System/UserDefine/GameSettingUserDefineUISystem.ts:3479-3649`
- **怎么生效**：关闭设置页时刷新局内操作界面；进游戏、切玩法、角色准备好时重新应用一次（因为对象要等准备好才能改）。[明确依据] `System/GameSettingSystem.ts:1347-1351,1418`
- **为什么这样设计** [推断]：拖按钮、改热区、存坐标、方案管理这类操作，不是一个开关能表达的，普通列表控件装不下，所以只能配一整套专用蓝图和窗口。推断链：该页有 6 个独立窗口键 + 每玩法独立预览蓝图 + 独立云端协议 → 属于"专用编辑器"而非"设置项列表"。
- **和隐私页比**：隐私是"表里加一行 → 多一个开关"；这一页是"加一个玩法 → 要配表、配预览蓝图、配窗口注册、配保存编号"好几处。
- **历史包袱**：新面板和旧面板并存；载具页和灵敏度页的控件名被复制过来用（下面会再提）；方案管理有一套被注释停用的云端版。

### 4.1 画质

- **玩家能改什么**：手机上是画质档、分辨率、帧率，加抗锯齿/阴影/景深/泛光/平面反射 5 个效果开关，再加动作风格、家园人名显示；电脑上是窗口模式、分辨率、画质预设三个下拉。
- **蓝图/组件**：手机上 3 个列表 + 5 个小切换器，组件 `GameSettingImageQualityViewComponent`；电脑上组件 `GameSettingImageQualityViewComponent_PC`。由 `WidgetSwitcher_ImageQualityPanel` 二选一。[明确依据] `UI/GameSettingViewComponent.ts:470-489`、`UI/GameSettingImageQualityViewComponent.ts:112-357`
- **数据**：6 张画质配置表（档位、帧率、分辨率、视距、效果项、互斥规则），加上设备档位和引擎配置文件给的默认值。**只存本机，不上云**。[明确依据] `DataCenter/DataCenterDefines.ts:259-265`、`System/GameSettingSystem.ts:239-244`
- **特殊规则**：表里 `sShowInfoByDevice` 决定"这个机型能不能看见这一项、能不能点、点了要不要重启/要不要确认"；`ExcludeRules` 决定"高帧率和高画质不能同时开"，冲突时自动降一档或弹确认。[明确依据] `System/GameSettingConfigSystem.ts:434-492,532-600`
- **电脑独有的保险**：改窗口模式/分辨率后弹一个确认框，10 秒不确认就自动改回去，防止玩家把自己卡在进不去的分辨率里。[明确依据] `System/Feature/GameSetting_ImageQuality.ts:486-537`
- **怎么生效**：直接写设备档位系统和引擎参数（CVar，就是引擎的运行时开关），参数一变会广播给关心它的模块。[明确依据] `System/GameSettingSystem.ts:1122-1176`、`System/GameSettingConfigSystem.ts:140-159,212-215`
- **为什么这样设计** [推断]：画质强依赖硬件能力，"哪些能开"必须跟着机型走，所以把显示规则写进配置表而不是代码；电脑和手机能改的东西差别太大，硬凑一套反而难维护，于是分两套组件。推断链：6 张画质表 + 设备档位字符串解析 + 平台切换器 → 规则外置 + 平台分治。
- **和隐私页比**：隐私表只管"有没有这一行"；画质表还要管"这一行在这台机器上显不显示、能不能点、和别行冲不冲突"。

### 4.2 来财行动（除隐私外最像你熟悉的一页）

- **玩家能改什么**：来财玩法专属的一堆开关/多选项（辅助瞄准、准心阻尼、弹道拖尾、震感、命中反馈等），还有两个固定开关：小地图默认展开、自动攀爬。
- **蓝图和组件**：`WBP_Setting_CodeEvacuation` → `CodeEvacuationSettingViewComponent`；里面是 `ListView_ChannelContent`（分组）→ 每组 `ListView_Content`（行）→ 行组件 `CodeEvacuationSettingSubListItemComponent`，行内用一个小切换器在"开关"和"多选"两页之间切。[明确依据] `UI/GameSettingViewComponent.ts:522-564`、`UI/CodeEvacuation/CodeEvacuationSettingSubListItemComponent.ts:31-66`
- **数据**：读 `mapGameSettingCodeEvacuation` 表；表里每行有分组名、标题、帮助、一个变量名 `sVarName`、默认值。**按变量名一个一个存**（`codeEvacuationSettings.configs`），**会上云**。[明确依据] `System/GameSettingConfigSystem.ts:416-420`、`System/GameSettingSystem.ts:2061-2082,239-244`
- **怎么生效**：按变量名注册监听，只有那个值变了才通知对应模块（辅助瞄准、相机、原生设置子系统），而且变化会打点上报。[明确依据] `System/GameSettingSystem.ts:1799-1814,1827-1868`
- **为什么这样设计** [推断]：玩法开关随版本频繁加减，做成表驱动最省事；同时这些开关要立刻影响手感和画面，所以做成"按名字精确通知"而不是整包广播。推断链：表驱动行结构 + 按变量名的读写/监听/打点三套 → 为高频增减 + 即时生效服务。
- **和隐私页比**：**外观最像，内里最不一样**。隐私是"表里读 → 整包写回 → 整包监听"；来财是"表里读 → 按名字写 → 按名字通知"。同一件事两套做法，是重构时最该留意的地方。

### 4.3 灵敏度

- **玩家能改什么**：10 条滑条（各种瞄准/建造/开火灵敏度），加"转向模式"（固定速度/加速速度）和"转向加速度"。
- **蓝图和组件**：`WB_Setting_Sensitivity` 全部手写滑条；标题、范围、帮助文案读 `SettingConfig` 表的第 10～19 行（标题文字控件没暴露给代码，得从控件树里按名字找出来再写）。[明确依据] `UI/Sensitivity/SensitivitySettingViewComponent.ts:132-152`、`openspec/specs/mvss-game-setting/spec.md:201`
- **数据**：按名字存 `sensitivitySettings.configs`，**会上云**；写入前会按配表范围夹紧数值，"转向模式"只认 0/1。[明确依据] `System/GameSettingSystem.ts:1884-1906`
- **怎么生效**：按名字通知相机组件；进入游戏、角色准备好时会重新应用一次。[明确依据] `System/Feature/GameSetting_AimSensitivity.ts:64-84`
- **为什么这样设计** [推断]：滑条数量固定、每条单位和含义都不同，表驱动生成列表收益不大，所以控件手写；但"范围/文案/默认值"策划会调，所以这部分交给配表。推断链：手写 10 条控件 + 只从表读范围与文案 → 混合式。
- **和隐私页比**：隐私的"一行"能完全由表生成；这里的"一行"是手画的，表只提供数字和文字。

### 4.4 载具

- **玩家能改什么**：方向键 / 摇杆，二选一。
- **蓝图和组件**：`WB_Setting_VehiclePanel_2`，两个按钮 + 两个小切换器管选中态。[明确依据] `UI/GameSettingVehicleViewComponent.ts`
- **数据**：`VehicleOperateMode`，**会上云**（是仅有的 4 个上云字段之一）。[明确依据] `System/GameSettingSystem.ts:193,239-244`
- **怎么生效**：组件内部盯着这个值刷新显示。[明确依据] `UI/GameSettingVehicleViewComponent.ts:38-40`
- **为什么这样设计** [推断]：只有两个互斥选项，直接用两个按钮最直观，不值得上列表。推断链：无列表、无配置表、两个固定按钮 → 极简手写。
- **历史包袱**：这一页的控件名是从灵敏度页复制来的（`Button_Sensitivity_3`、`WidgetSwitcher_Sensitivity_1`），名字和实际用途对不上。[明确依据] `UI/GameSettingViewComponent.ts:598-611`

### 4.5 音效

- **玩家能改什么**：9 条音量滑条（总音量、音效、音乐、环境、界面、角色、语音、麦克风发送/接收），加音乐分组（普通音乐 / 哈基曲）。
- **蓝图和组件**：`WB_Setting_VoicePanel_2` 手写 9 组"滑条 + 进度条 + 数值"，每组一个帮助问号；音乐分组是一个列表。[明确依据] `UI/GameSettingVoiceViewComponent.ts:119-160,493-529`
- **数据**：范围上限和帮助文案读 `SettingConfig` 表第 1～9 行；**只存本机，不上云**；媒体音量 `YaoMicReceiveLevel` 是单独的本机字段，服务器回包时会跳过它。[明确依据] `System/GameSettingConfigSystem.ts:308-336`、`System/GameSettingSystem.ts:180-190,893`
- **怎么生效**：每个音量字段各有一个监听，一变就调声音管理器；音乐分组另外切 Wwise 状态；麦克风音量落到语音 SDK。[明确依据] `System/GameSettingSystem.ts:695-704,1058-1119`
- **为什么这样设计** [推断]：音量和喇叭/耳机/设备有关，换设备不该把上台的音量带过来，所以刻意不上云。推断链：这些字段不在上云模型里 + 服务器回包显式跳过媒体音量 → 设备相关、按设备保存。
- **和隐私页比**：隐私里"称号展示"要跟账号走所以走独立协议；音量反过来，明确不跟账号走。

### 4.6 视频（精彩时刻）

- **玩家能改什么**：一个"录制精彩时刻"开关，加一个打开精彩时刻 App 的按钮。
- **蓝图和组件**：`WBP_Setting_Video`，复用开关组件 `GameSettingOnOffCommonComponent_v2`。[明确依据] `UI/Video/VideoSettingViewComponent.ts:39,104-107`
- **数据**：只存本机；**这一页显不显示由外部总开关决定**，不由设置界面自己决定。[明确依据] `System/GameSettingSystem.ts:479-496`
- **怎么生效**：关掉时调用录制系统停止录制。[明确依据] `System/GameSettingSystem.ts:1268-1284`
- **为什么这样设计** [推断]：功能由别的平台能力统一开关控制，设置页只负责"在允许时给个开关"。推断链：显隐由 `GameJoySystem.isConfigGloballyEnabled()` 动态写入 → 外部能力门控。
- **和隐私页比**：隐私页一直显示，这一页可能整页不存在。

### 4.7 聊天

- **玩家能改什么**：各频道的提示开关。
- **蓝图和组件**：`WBP_Setting_Chat`，`ListView_ChannelContent`（分组）→ `ListView_Content`（行）→ `ChatSettingItemComponent`。**结构和隐私页几乎是双胞胎**，但用的是另一套文件。[明确依据] `UI/Chat/ChatSettingViewComponent.ts:62-67`、`UI/Chat/ChatSettingChannelBoxComponent.ts:46-70`
- **数据**：读 `mapGameSettingChat` 表；`chatSettings` **只存本机**，不上云。[明确依据] `System/GameSettingConfigSystem.ts:396-399`、`System/GameSettingSystem.ts:217,239-244`
- **怎么生效**：整包监听 → 广播 `SettingChatTipsUpdate` 给聊天系统和怪物提示组件。[明确依据] `System/GameSettingSystem.ts:711,1433-1435`
- **值得注意**：补默认值时代码会把频道筛成只剩"来财行动频道"（编号 19）；表里本有分组类型字段，但过滤代码被注释掉了。[明确依据] `System/GameSettingSystem.ts:957`、`UI/Chat/ChatSettingChannelBoxComponent.ts:55-59`
- **和隐私页比**：**最像的一对**——同样的两层列表、行里同样四个控件名（`Button_Switch`/`Button_Help`/`WS_Switch`/`Text_ItemName`）、同样的"组件事件冒泡 → 整包写回 → 整包广播"。但代码是两套独立文件。这是"通用蓝图/通用代码"最明显的整理机会。

### 4.8 任务

- **玩家能改什么**：一个"自动切换追踪任务"开关。
- **蓝图和组件**：`WBP_Setting_Task`，一个 `TaskAutoSwitch`。[明确依据] `UI/Task/TaskSettingViewComponent.ts:54`
- **数据**：**唯一走"公共设置字段"的一页**——不放在设置大包里，而是服务器回包/上报时单独一个字段 `iAutoSwitchTrackTask`。[明确依据] `System/GameSettingSystem.ts:915-917,1038`
- **为什么这样设计** [推断]：任务追踪是跨系统的公共状态，服务器早有专门字段，所以没并进自定义设置包。推断链：单独字段 + 独立的读写位置 → 属于历史协议约定。
- **和隐私页比**：隐私走的是"独立隐私协议"，任务走的是"设置请求里的另一个字段"，两者都不在主设置大包里，但做法又不同。

### 4.9 隐私（你做的那一页，作为对照锚点）

见第一节的完整 5 步拆解。这里只补三点：

- 用户协议链接是**另一张表** `DT_UserAgreementItemTable` 驱动的 `TileView_UserAgreement`，和隐私开关列表不是一回事。[明确依据] `UI/Privacy/PrivacyUserAgreementComponent.ts:20,49-70`
- 隐私设置本身存在本机 `privacySettings`；但"称号是否在聊天/大世界展示"走**独立的隐私协议**上下行，改动时广播 `SettingTitlePrivacyUpdate` 给个人信息页。[明确依据] `System/GameSettingSystem.ts:218,1442-1494`
- 分组组件里另有一个帮助按钮在代码里被写死为隐藏，而行组件仍会发帮助事件——同一页里帮助相关代码存在两处，整理时别只看一处。[明确依据] `UI/Privacy/PrivacySettingComponent.ts:127-130`、`UI/Privacy/PrivacySettingItemComponent.ts:120`

### 4.10 下载管理

- **玩家能改什么**：看/管资源包（分"重要"和"玩法"两类，各自可折叠的列表），开关自动下载，清理缓存。
- **蓝图和组件**：`WBP_Setting_DownLoadPanel`，列表数据来自**下载系统**，不是策划配的 Excel 表；清理缓存有自己的弹窗。[明确依据] `UI/Download/DownloadSettingViewComponent.ts:109-119,167-228`
- **特殊之处**：**登录界面专用的就是这一页**（见 2.6）。[明确依据] `UI/GameSettingOnLogin/GameSettingOnLoginViewComponent.ts:109-156,244-262`
- **为什么这样设计** [推断]：资源包列表是运行时算出来的（哪些包下没下、多大），没法预先写在配表里；而且登录前只有它能用。推断链：数据源是下载系统 + 登录态复用了这一页 → 动态数据 + 前置可用。
- **和隐私页比**：隐私的行是静态配表；这一页的行是运行时状态，还会变。

### 4.11 操作面板（默认隐藏）

- **玩家能改什么**：两条界面缩进滑条。
- **蓝图和组件**：`WB_Setting_ControlPanel_2`，手写两条滑条。[明确依据] `UI/GameSettingControlPanelViewComponent.ts:51-55`
- **数据**：只存本机；其中一条滑条会改安全区，另一条在代码里**没找到下游**，改了不知道作用到哪。[明确依据] `System/GameSettingSystem.ts:705,1070-1079`
- **状态**：默认隐藏，全仓找不到任何把它打开的代码，基本可以当作遗留页看待。[明确依据] `System/GameSettingSystem.ts:397`
- **和隐私页比**：这一页没有配表、没有列表、没有服务器交互，是最"裸"的一页。

---

## 五、全界面共用的零件（重构最该先看这里）

### 5.1 真正共用得比较干净的：帮助问号

全 12 页的问号，最后都汇到同一个全局事件 `SettingWindowShowHelpTips`，由主窗口里同一块浮层 `HelpTIps` 显示，还能按问号在屏幕上的位置摆好。聊天、隐私多绕了一层组件内事件中转发，但终点一样。**这块不用重做，可以沿用。**[明确依据] `UI/GameSettingViewComponent.ts:187,363-405`、`GameEventDefine.ts:460`

### 5.2 开关和多选：明明是同一件事，却有三套

| 用途 | 代码组件 | 对应蓝图 | 用在哪 |
|---|---|---|---|
| 通用开关（老版） | `GameSettingOnOffCommonComponent` | `WBP_OnOffSwitch` | 任务、旧小地图 |
| 通用开关（新版） | `GameSettingOnOffCommonComponent_v2` | `WBP_OnOffSwitch` | 来财、视频、下载、灵敏度转向、多选行内部 |
| 通用多选 | `GameSettingMuitiOptionCommonComponent` | `WB_Setting_CommonMultiOption` | 操作页摇杆类型、灵敏度转向模式 |
| 来财专用多选 | `CodeEvacuationSettingMuitiOptionCommonComponent` | `WBP_Setting_CodeEvacuation_Box` | 只有来财 |
| 可编辑标题的开关 | `TKPGSettingCommonItemViewComponent`（在别的功能模块里） | `WBP_Setting_CommonItem_Editable` | 只有操作页锁定跑 |

[明确依据] `UI/Common/` 目录、`UI/CodeEvacuation/` 目录、`openspec/specs/mvss-game-setting/spec.md:189-191`

**三个列表页的行组件也是三套**：聊天 `ChatSettingItemComponent`、隐私 `PrivacySettingItemComponent`、来财 `CodeEvacuationSettingSubListItemComponent`，但绑定的控件名几乎一模一样。[明确依据] `UI/Chat/ChatSettingItemComponent.ts:45`、`UI/Privacy/PrivacySettingItemComponent.ts:48`、`UI/CodeEvacuation/CodeEvacuationSettingSubListItemComponent.ts:17`

### 5.3 没有通用件的东西

- **滑条**：没有通用滑条组件。声音 9 条、灵敏度 10 条、操作面板 2 条，各页自己写"滑条 + 进度条 + 数值"三件套。[明确依据] `UI/GameSettingVoiceViewComponent.ts`、`UI/Sensitivity/SensitivitySettingViewComponent.ts`、`UI/GameSettingControlPanelViewComponent.ts`
- **分组标题**：没有通用组件，各列表页各用一个 `TextBlock_ChannelName`。[明确依据] `UI/CodeEvacuation/CodeEvacuationSettingChannelBoxComponent.ts:23-27`
- **禁用/置灰**：至少有 5 种不同做法（原生按钮的 `isEnabled`、通用按钮的 `isEnable`、切灰态底图、切换器切到"看得见点不了"页、遮罩图片）。页签级禁用又是另一种——直接把整页藏起来。[明确依据] `UI/GameSettingImageQualityViewComponent.ts:282-339`、`UI/UserDefine/UserDefineSinglePlanInfoViewComponent.ts:67-73`、`UI/TKPGSettingFrameRateListItemComponent.ts:104-121`、`UI/GameSettingViewComponent.ts:423-465`

### 5.4 已经没人用的"通用列表"

`UI/Common/` 下有一整套看起来是"通用三级列表"的组件，还有 `GameSettingAutoClimbViewComponent`，但**全仓找不到任何页面在用**；云端方案管理组件的唯一绑定也被注释掉了。这些是早期想统一、后来没接上的遗留件。[明确依据] `UI/Common/GameSettingCommonListViewComponent.ts:39-46`、`UI/GameSettingViewComponent.ts:759-765`

> 这点很重要：[推断] 说明"做一套通用组件再让各页接上"这条路以前试过但没走通，重构时不能假设"只要有通用件大家就会用"。推断链：通用组件存在 + 零页面引用 + 各页另有自己的行组件 → 曾尝试统一但未接入。

### 5.5 恢复默认弹窗

独立窗口 `WB_Setting_Window_Default`，可勾选的页签**硬编码只有 3 个**（操作/画质/灵敏度），不是遍历 12 页生成的；勾选后按页签用一条 `if` 链分发到 4 个不同系统的重置动作。声音、聊天、隐私、任务、载具等**都不能在这里恢复默认**。[明确依据] `UI/SettingWindowDefaultViewComponent.ts:40-46,200-227`

---

## 六、把 12 页放一起，能看出的设计规律

### 规律一：造页面有三种路子，是按"内容会不会经常变"选的

| 路子 | 用在 | 特点 |
|---|---|---|
| 手写固定控件 | 音效、灵敏度、载具、任务、视频、操作面板 | 控件数量固定、每条含义不同；改一项要动蓝图和代码 |
| 配表生成列表 | 聊天、隐私、来财行动、画质列表 | 策划改表就能加减项；代码不用动 |
| 专用编辑器 | 操作（布局/改键）、下载管理、方案分享、防误触 | 交互太复杂，普通开关列表装不下 |

[推断] 推断链：三类页面的配置表依赖、窗口数量、控件复杂度差异明显，且与"该页内容变更频率"正相关 → 是按维护成本选的，不是随手写成三种。

### 规律二：数据放哪儿，是按"跟着谁走"分的

| 归属 | 页 | 做法 |
|---|---|---|
| 跟账号走 | 来财行动、灵敏度、载具，以及操作设置 | 进主设置大包，上传/下拉 |
| 跟设备走 | 音效、画质、防误触、锁定跑 | 只存本机，服务器回包还会跳过 |
| 单独走 | 隐私（合规）、自定义布局（数据大、有分享码）、任务（历史字段） | 各有独立协议或独立字段 |

[明确依据] `System/GameSettingSystem.ts:239-244,345-350,893,1022-1038`；`System/UserDefine/GameSettingUserDefineUISystem.ts:3479-3649`

[推断] 这条划分本身是合理的：**"统一所有数据到一张表"反而不对**，因为设备偏好和账号偏好本来就该分开。重构时该统一的是"读写入口和说明方式"，不是把数据硬并到一起。

### 规律三：「改了值」和「真的生效」是两件事，中间有四种桥

1. 盯着字段，一变就调下游（音量、聊天、隐私）。
2. 按名字注册监听，只有那一项变了才通知（来财、灵敏度）。
3. 直接调下游系统的写接口（画质）。
4. 什么都不做，等下次进游戏/关窗口时再统一应用（部分自定义布局）。

[明确依据] `System/GameSettingSystem.ts:690-716,1122-1176,1724-1978,1418`

[推断] 推断链：同一个"设置变了"的动作有 4 种传导方式 → 这是多次迭代叠加的结果，也是"改一个设置要改好几处"体感的来源。

### 规律四：历史包袱主要来自"复制一份再改"

载具页用了灵敏度页的控件名；来财页把多选组件又复制了一套；聊天/隐私/来财三个列表页各写一套行组件；新面板 `WB_DefinedPanel_New` 和旧 `WB_DefinedPanel` 并存；一套通用列表组件写了没人用；两套设置系统曾长期并存（已在 2026-11-05 退役掉旧的那一套，见配套文档）。[明确依据] `UI/GameSettingViewComponent.ts:598-611`、`openspec/specs/mvss-game-setting/spec.md:11-20`

---

## 七、重构前值得先记下的现状清单（只是观察，不是已批准的方案）

**通用蓝图侧**
1. 12 个页签的"按钮 + 容器 + 选中态切换器"是 12 份手写绑定，控件名硬编码；加一页要动枚举、对照表、左侧控件顺序、右侧切换器子项四处。
2. 开关/多选/行组件存在多套近似蓝图与近似组件，其中聊天与隐私几乎一模一样却各有一套。
3. 滑条、分组标题、禁用态都没有统一零件；禁用态尤其散（至少 5 种做法）。
4. 帮助浮层是现成且全页共用的，可直接复用。
5. 恢复默认只覆盖 3 页，且清单是写死的。

**代码侧**
6. 读写入口不统一：既有 `getSetting/setSetting`，也允许外部直接读内部数据对象（至少 3 处）。
7. 三套"按名字存 + 按名字通知"（操作、来财、灵敏度）几乎逐行重复，但各自带着不能丢的业务差异：来财有打点、灵敏度有数值夹紧和配表兜底、三者报错隔离方式还不同。**不能直接合并成一份**。[明确依据] `System/GameSettingSystem.ts:1724-1978`
8. 默认值补丁散在 10 多个 `verify` 函数里，还有一个函数体是空的。[明确依据] `System/GameSettingSystem.ts:747-764,925-1019,1872-1882` 及 `:961-963`
9. 配置表有一批"登记了但没人读"的列和表（`iIsVisible`、`iIsCloudVisible`、`iSaveType` 等）；另有一个"声音页局内是否可见"的函数结尾恒返回 false 且没有调用方。[明确依据] `System/GameSettingConfigSystem.ts:292-305`
10. 登录态复用同一窗口却另写了一份根组件，帮助浮层等逻辑随之复制了一份。[明确依据] `UI/GameSettingOnLogin/GameSettingOnLoginViewComponent.ts:101,207-273`

> 以上只是"现在是什么样"。**要动哪几条、按什么顺序、每步怎么验收，都需要另行确认**；配套文档 `SettingSystemAnalysis.md` 第七节有一份分阶段计划，但第二至第七阶段目前都还是方案、未授权实施。

---

## 八、这份讲解的证据边界

- **已确认**：本篇的页签数量、编号、显隐、逐页组件与控件名、配置表归属、数据字段与存储归属、下游链路，均来自逐行阅读当前工作区源码；窗口骨架、页签切换、默认显隐表、隐私页代码由本轮亲自复核。关键位置以 `路径:行号` 标在文中。
- **推断**：所有标注 [推断] 的"为什么这么设计"，都是**根据代码结构反推**的，不是当年开发者的原话或设计文档。推断链已逐条写出，供后续找当事人核对；不要当成既定事实。
- **无法核实**：
  - 几个 `.uasset` 蓝图是二进制，里面的控件树、页签中文显示文案、右边切换器 12 个子项的实际顺序无法从代码读到；左侧页签顺序仅有规格文档里的编辑器回读记录。
  - 规格文档中「载具在切换器索引 11」与当前代码「载具 4、操作面板 11」冲突，两处都保留，未判定谁对。
  - 配置表源 CSV 在**同级另一个子仓**（`TikiStarMain_TMR/ConfigData/develop/CSV/`），不在本工作区；本轮核对的是表结构、登记名与读取代码，没有逐行核对全部表格内容。
  - 部分下游链路（例如局内布局扩展怎么把坐标真正应用到按钮）依据的是现有规格文档记载，本轮没有逐行追到 C++/扩展类源码。
- **没做的事**：本篇只做只读核查与文档撰写，**没有改动任何代码、蓝图、配表、用户已有工程文件，没有运行游戏或编辑器，没有提交**。
