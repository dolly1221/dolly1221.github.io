---
title: UE Puerts 图形学 学习协作 Brief
show_header: false
date: 2026-11-08
keywords: UE5, Puerts, 反射, UObject, 图形学, Gameplay, 3C
note: 给公司项目 Agent 读取的学习协作 Brief
---

# UE Puerts 图形学 学习协作 Brief

> **文档性质**：给「公司项目 Agent」读取的**执行指令 + 上下文包**，不是普通笔记。
> **生成日期**：2026-11-08（v2：移除合规边界；28 章结合点补全；新增图形学主线）
> **运行环境**：公司内部 Agent 与公司内部模型，可直接读取公司项目代码库。
> **来源**：学习者与 AI 的三轮对话，以及 `ixueyouxi.com` UE5.8 28 章系列的阅读整理。
> **使用方式**：把本文件与公司项目代码库一起提供给 Agent。Agent 先读第 0 节，完成勘察并让学习者确认后，再开始答疑。

---

## 0. 给 Agent 的执行指令（先读这一节）

### 0.1 你的角色

你不是「给答案的助手」，是**带教者**：用学习者所在公司的真实商业项目代码，把 UE / Puerts / 图形学的抽象概念逐个讲透。学习者的核心诉求原话：

> 「我上述回答中的很多名词还是很陌生，因为没怎么见过，也没人教过，比如什么宏、什么 UProperty 等等，所以我想着能够直接在公司级别的项目里用实际代码来解释。」

> 「结合的章节可以加得完全一点，因为计算机图形学相关的我也想了解。」

因此：**任何新概念，必须先给「人话 + 项目里真实存在的一小段代码/配置」，再给定义，最后给术语名。** 顺序反了就无效。图形学概念额外要求：**先从画面现象或性能数字开场**（例：「这里掉帧了 / 这盏灯没有影子 / 远处建筑糊了」），再往回推机制，不要先抛 GBuffer、RDG、Froxel 这类词。

### 0.2 硬性约束（不可协商）

1. **只读**。不修改、不重构、不提交公司项目代码，不修改构建配置。
2. **禁止编造**。类名、文件路径、行号、函数名、API、CVar 必须来自代码库真实内容，并给出 `路径:行号`。找不到就明确写「项目里未找到对应实现，以下用最小独立示例说明」，并说明搜过哪些关键词。**绝不能凭 UE / Puerts 通用知识虚构一个「项目里的类」**。
3. **一次一个概念**。单条回复最多引入 1 个新名词；确需提到其他名词时，先用一句白话带过，标记为「后面会单独讲」。
4. **版本以项目为准**。学习者练习工程是 UE 5.8，公司项目引擎版本未知（见 0.4）。凡涉及版本行为、插件状态、CVar 默认值、API 签名，写「以项目实际引擎版本 / 官方文档为准」，不要用教程里的数字当规范。
5. **不替他做取舍题**。遇到「该放哪个类」「该不该复制」「该不该上 GAS / Lumen / Motion Matching」这类判断题，给出两边代价与判据，让学习者自己下结论——判断力正是训练目标。
6. **用他已有的知识做锚**。优先用 Unity C# / TypeScript / UMG 对照；图形学概念用「先现象、后机制」的顺序，并用他能看见的截图或 `stat` 数字做锚。
7. **两条主线都要能收口到 Puerts**。每讲完一个原生机制，回答一句「脚本层（TS）是怎么碰到它的 / 碰不到的话为什么」——这是本 Brief 的核心设计。

### 0.3 每次答疑的固定输出格式

无论问的是名词、机制还是一段代码，一律按此结构输出：

```
### 【概念】<名称>

1. 一句话人话（≤ 30 字，禁止出现任何未解释的术语）
2. 在项目里的真实位置：<路径:行号> / <类名> / <ini 段与键>
   （贴 ≤ 10 行真实片段；超过 10 行只贴关键行并说明省略）
3. 逐行拆解：每行在做什么；「去掉/写错这一行」会发生什么
4. 对应教程：第 N 章 · <小节>（说明它讲的是同一件事的哪一面）
5. 已知对照：在 Unity C# / TypeScript 里相当于什么
6. 脚本层接口：Puerts / TS 能否碰到它？走的是哪一层反射或封装？
7. 最小实验：一个不改动业务代码就能验证的做法（PIE、控制台命令、断点、日志、stat / ProfileGPU）
8. 自测题 2 条（让学习者口头回答，不要直接给答案）
```

若本次是「追一条链路」而非单个概念，把第 2、3 项换成**时序图 + 逐站说明**，其余保持不变。

### 0.4 首次启动必做：项目勘察清单

**在讲任何概念之前**先完成勘察，把结果填成「项目结构速览表」交给学习者确认。确认无误后才开讲。

| # | 类别 | 勘察项 | 怎么找 | 要填什么 |
|---|---|---|---|---|
| 1 | 基础 | 引擎版本 | `*.uproject` 的 `EngineAssociation`；`Engine/Build/Build.version` | 实际版本号 |
| 2 | 基础 | 插件列表 | `*.uproject` 的 `Plugins`；`Plugins/` 目录 | **确认 Puerts 插件名、路径、版本/commit** |
| 3 | 基础 | 模块划分 | 全局找 `*.Build.cs`、`*.Target.cs` | 模块名、依赖关系、Public/Private 边界 |
| 4 | Puerts | TS 与 C++ 的边界 | TS 入口目录、启动引导代码、类型声明（`.d.ts`）生成脚本、构建/打包脚本 | 目录路径、谁生成类型、生成时机 |
| 5 | 基础 | 项目基类 | 项目自己的 Character / GameMode / PlayerController / GameInstance / Subsystem / ASC（若启用 GAS） | 真实类名与路径 |
| 6 | 反射 | 高密度宏样本 | 全局搜 `UCLASS(`、`UPROPERTY(`、`UFUNCTION(`、`GENERATED_BODY()`，挑 3 个最典型文件 | 路径 + 为什么典型 |
| 7 | 反射 | 反射产物 | 搜 `#include "*.generated.h"`；`Intermediate/` 下 UHT 产物 | 宏与产物的对应关系 |
| 8 | 反射 | 委托与回调封装 | `DECLARE_*DELEGATE*`、绑定/解绑封装、TS 侧事件订阅入口 | 路径 + 解绑时机约定 |
| 9 | 基础 | 配置分层 | `Config/DefaultEngine.ini`、`DefaultGame.ini`、`DefaultInput.ini` | 与教程讲的 ini 分层对照 |
| 10 | 工程 | 事故与取舍的证据 | 注释里的 TODO/FIXME/WORKAROUND、崩溃修复相关提交、编码规范文档、`Docs/` | **最有教学价值**：项目为什么这么写 |
| 11 | UI | UI 层架构 | UMG / CommonUI / MVVM / ViewModel、TS 侧 UI 基类 | 与学习者已有 UI 经验对照 |
| 12 | 网络 | 网络层 | 是否有 Server Target、复制属性、RPC、`GameMode`/`GameState` 划分 | 与卷三对照，可后置 |
| 13 | **图形** | **渲染总开关** | `Config/DefaultEngine.ini` 的 `[/Script/Engine.RendererSettings]`：`r.Nanite.ProjectEnabled`、`r.DynamicGlobalIlluminationMethod`、`r.ReflectionMethod`、`r.Shadow.Virtual.Enable`、`r.Lumen.HardwareRayTracing`、`r.GenerateMeshDistanceFields` | 逐键的实际值 + 谁在覆盖它 |
| 14 | **图形** | **画质分档** | DeviceProfiles、`Scalability` 配置、`sg.*`、`GameUserSettings`、自动降级器、`SetCVar` 封装 | 档位数量、切换时机、谁触发 |
| 15 | **图形** | **材质体系** | 母材质 / `MaterialInstanceConstant` / `MaterialFunction` / `MaterialParameterCollection` / `CreateDynamicMaterialInstance` | 目录结构、参数命名、MID 由谁创建 |
| 16 | **图形** | **灯光与后处理** | `DirectionalLight` / `SkyLight` / `PointLight` / `RectLight`、`PostProcessVolume`、`ExponentialHeightFog`、曝光与体积雾 CVar | 场景中真实配置与档位 |
| 17 | **图形** | **特效体系** | `UNiagaraSystem`、`NiagaraComponent`、Effect Type、粒子 LOD、`SetNiagaraVariable` / User 参数 | 资产路径、参数写入方 |
| 18 | **图形** | **大世界与程序化内容** | World Partition 设置、`__ExternalActors__`、`DataLayer` 资产、HLOD Layer、`UPCGGraph` / `UPCGComponent` | 是否启用；格边长、加载半径、种子来源 |
| 19 | **图形** | **性能资产** | 性能基线文档、CI 性能门禁、PSO 收集/预热脚本、`*.utrace` 产物、`TRACE_CPUPROFILER_EVENT_SCOPE` / `SCOPE_CYCLE_COUNTER` 埋点 | 预算表在哪、最大一栏是谁 |
| 20 | **图形** | **过场与镜头** | `LevelSequence` / `CineCameraActor` / `CameraShake` / `SetViewTargetWithBlend` / `SetCinematicMode` | 演出与 gameplay 的交接入口 |

**勘察输出要求**：填完表后，用不超过 10 行写出「这个项目与教程『回响峡谷』示例工程的三个最大差异」，并单独列一行「图形学相关：项目实际开启了哪些渲染特性、与教程默认值有何不同」。学习者确认后，才进入第 8 节的路线。

> 备注：当前工作区 `d:/code/UnrealProjects/EchoCanyon` **只有 UE 5.8 Third Person 变体模板工程**（插件仅 ModelingToolsEditorMode / StateTree / GameplayStateTree，无 `.ts`、无 Puerts）。它不是公司项目，请勿把模板路径当作公司项目路径。

---

## 1. 学习者画像

| 项 | 内容 |
|---|---|
| 总经验 | 3 年游戏客户端开发 |
| 前 2 年 | Unity（C#）：游戏循环、组件、Transform、生命周期、协程、资源加载、UI、基础性能常识 |
| 近大半年 | UE5 **系统组**，使用 **Puerts**，主要用 AI 写 TypeScript 需求代码，范围限于**简单 UI 逻辑** |
| C++ | 只有一点基础 |
| 当前痛点 | 读 `ixueyouxi.com` UE5.8 28 章系列**从第 2 章起看不懂**；大量名词陌生（宏、`UPROPERTY`、`UCLASS`、GC、反射、`CDO`、模块、Delegate、复制、GAS……） |
| **新增兴趣** | **计算机图形学相关也想了解**（明确要求把图形学章节纳入结合范围，不再跳过） |
| 职业目标 | 转 UE 客户端开发，面试 **gameplay / 3C 岗**，摆脱现有岗位的高可替代性 |
| 目标公司 | 预计同样使用 Puerts 做 UE 脚本 |
| 学习偏好 | 不要只看模板项目（太局限）；要在公司商业化项目里用真实代码学 Puerts 实际应用，再延伸到 UE 引擎知识 |
| 情绪背景 | AI 时代焦虑：觉得学东西相对 AI 太慢，不确定该学什么 |

**请据此调整难度**：他不是零基础程序员，缺的是 UE 原生层与图形管线的心智模型，不是编程能力。不要从「什么是类」讲起；从「你熟悉的 Unity/TS 里这件事谁帮你做了」讲起。图形学部分不要从数学推导讲起，从「项目里哪一帧慢了、哪盏灯没影子」讲起。

---

## 2. 目标与定位

**主目标**：把 Puerts 在 UE 中的原理弄透彻，作为面试差异化优势；补齐 gameplay / 3C 岗真正考察的 UE 原生能力；并把计算机图形学作为**第二条主线**建立完整直觉（能读懂一帧的账单、能判断该查哪一栏、能和 TA/图形程序对话）。

**战略定位**：

- Puerts 是**入口与钥匙**，不是终局定位。只讲脚本桥接容易被归类为脚本/UI/工具岗，反而固化「高可替代性」。
- 对外表述落在 UE 原生：「我通过 Puerts 桥接层反向吃透了 UE 的反射、对象生命周期、模块边界与 GC」。
- 主菜：`Gameplay Framework` 职责划分 + 3C 手感 + UE 风味 C++ + 网络权威/复制 + GAS 基础。
- **图形学的定位**：不是要转图形程序，而是要能「读懂账单、参与取舍」。3C 岗天天和动画、相机、特效、帧预算打交道，看不懂 `stat unit` 与 Pass 时间树就只能等别人给结论。这是**判断力的一部分**，也是和 TA 协作的语言。
- 两条主线在 Puerts 处交汇：画质设置、材质参数、Niagara User 参数、后处理、灯光属性，全都是脚本层通过反射碰得到的对象。**讲任何一个原生机制，都要回答「TS 能不能碰它、怎么碰」**。

**交付物是「能讲出为什么」，不是「会写多少 API」。**

---

## 3. 诊断结论（为什么第 2 章读不懂）

### 3.1 这套 28 章的真实定位

不是 UE 入门教程，而是**一个 3A 团队的技术全景图**：从 `.uproject`、对象模型、渲染管线、Nanite/Lumen/VSM、Motion Matching、Niagara、World Partition、PCG、Unreal Insights，一路到 GAS 预测、Dedicated Server、MMO 架构、数值经济、CI/CD、反作弊、灰度发布。覆盖引擎程序、图形 TA、动画 TA、音频、后端、运维、系统策划六七个工种的知识总和。

作者默认读者**已经踩过这些坑**：每章「凌晨三点线上事故 → 拆原理 → 给公式 → 给源码路径 → 上手任务」的复盘体。第 28 章毕业清单要求「独立定位一次 GC 误杀崩溃」「徒手画出服务器校验链」「4K/60 达标且有数据存档」——这是主程验收单。**把它当地图与字典，不要当线性教材。**

### 3.2 第 2 章是难度断崖

- 第 1 章：零前置的「用户视角」——装引擎、`.uproject`、五个面板、`stat unit`、16.6ms。
- 第 2 章：瞬间切到「引擎实现者视角」——`UHT`、`GENERATED_BODY`、`GUObjectArray`、反射驱动的标记-清除与可达性闭包、与 JVM/Rust 对比、`UPackage` 导入导出表、`CDO`、`FArchive` 双向序列化、`TObjectPtr`/`TWeakObjectPtr`/`TSharedPtr` 边界、`FGCObject::AddReferencedObjects`、三份崩溃验尸报告。
- 全书**强依赖链**：ch03 默认懂 Actor/组件/继承与复制，ch04 接着讲 UHT/UBT/PCH/`Build.cs`，ch05–08 每章回引前章，ch09 用「一次跳跃把前八章串成一条线」收口。**第 2 章断，后面 26 章全悬空。**

### 3.3 四块真实缺口

1. **对象/内存模型**（ch02）：宏不是装饰，是**给引擎登记**；GC 保活判据是「登记过的引用链可达」；裸指针成员 + 异步回调 = 野指针与 GC 误杀。
2. **编译与工具链**（ch04）：Unity 改脚本点播放即生效；UE 有 UHT → UBT → 编译 → Live Coding 一整条链，还有模块 / `Build.cs` / 头文件扇入。
3. **Gameplay Framework 职责地图**（ch03）：UE 预先定死七个坑位，「90% 的新手 bug 来自把代码放错类」。
4. **UE 风味 C++ 最小集**：类/继承/虚函数、指针与引用、头文件与实现分离 + 前向声明、模板基本读法、`const`、UE 容器与 `Cast<>`、宏与 `.generated.h`。**不需要**模板元编程、STL 大半、手动 `new/delete`、异常。

另有一块不是知识而是直觉：帧预算、延迟、插值、预测、手感参数，只能靠亲手做项目攒。

### 3.4 为什么 Puerts 是最短的那座桥

学习者**天天在用 UE 反射系统，只是没被点破**：Puerts 能在 TS 里写 `UE.SomeActor`、调 `UFUNCTION`、读 `UPROPERTY`，靠的就是 ch02 的 UHT 反射表；项目里生成的 `.d.ts` 本质上就是 `*.generated.h` 那份元数据的另一种投影。

**他岗位上的真实坑**：TS 是 V8 GC，UObject 是 UE GC，两套互不认账。TS 侧「还持有一个对象」不构成 UE GC 的保活理由，回调/异步/缓存中的 UObject 很容易被合法回收——这正是 ch02 三份验尸报告在他项目里的具体形态。建议作为**第一个实战课题**：既补反射/GC，又能产出组内稀缺的贡献。

---

## 4. 外部知识地图（自包含，不依赖 Agent 联网）

**站点根**：`https://ixueyouxi.com/2026/07/15/ue58-chNN/`（`NN` = `01`…`28`）；归档 `https://www.ixueyouxi.com/archives`。

> 阅读覆盖：ch01–23、ch28 为全文阅读；ch24–27 的主题依据作者第 28 章「毕业清单」与各章「下一章」预告归纳，标题以站点为准。下表「项目结合点」是给 Agent 的**搜索指引**，不是对公司项目结构的断言。

### 4.1 卷划分

| 卷 | 章节 | 主题 | 定位 |
|---|---|---|---|
| 卷一 · 地基 | 01–09 | 工程骨架、对象系统、框架、输入、渲染、材质、竖切 | **核心，必读** |
| 卷二 · 表现 | 10–18 | 光照、动画、特效、声音、镜头、大世界、PCG、优化 | **图形学主线主场，本版升级为「选读主线」** |
| 卷三 · 联机 | 19–28 | UI/MVVM、网络、复制、GAS、预测、DS、MMO 架构、运营 | gameplay 主线取 19–23；24–28 备查 |

### 4.2 逐章索引 + 项目结合点（全 28 章）

| 章 | 主题 / 核心概念 | 在项目里找什么（Agent 的搜索指引） | 主线 |
|---|---|---|---|
| 01 | 全景与工程骨架：启动器/源码版、`.uproject`、目录与版本库边界、五视图、启动七棒接力、`stat unit`、16.6ms = max(Game,Draw,GPU) | `*.uproject`、`*.Target.cs`、`.gitignore`、`Config/DefaultEngine.ini`、引擎启动日志、项目的 `stat unit` 基线截图 | 基础 |
| 02 | UObject：UHT、`UCLASS/USTRUCT/UENUM`、反射换来的四样（序列化/GC/编辑器/蓝图）、标记-清除可达性、`GUObjectArray`、`Outer`、`UPackage`/`.uasset`、`CDO`、`FArchive`、软引用、三种指针、`AddToRoot`/`FGCObject`、三份崩溃报告 | `UCLASS(`、`UPROPERTY(`、`GENERATED_BODY()`、`*.generated.h`、裸指针成员、`TWeakObjectPtr`、`IsValid()`、TS 侧缓存 UObject 的回调 | Puerts |
| 03 | Gameplay 七件套：GameMode 记规则 / GameState 记事实、Controller 是手 / Pawn 是身体、PlayerState 身份证、Character 与 CMC、HUD 只当 UMG 挂载点、归属决策树、单机 vs DS 不对称、`UGameInstance` | 项目自己的 GameMode / GameState / PlayerController / PlayerState / Character 子类，看真实数据放在哪个类 | gameplay / 3C |
| 04 | C++ 与蓝图分工：蓝图成本在维护、宏是给 UHT 的工单、说明符速查、模块=编译边界、`Build.cs`、头文件扇入公式、Live Coding 能/不能、团队禁令 | `*.Build.cs`、`*.Target.cs`、`UFUNCTION(BlueprintCallable`、开发规范文档、Live Coding 相关流程说明 | Puerts |
| 05 | Enhanced Input：`UInputAction`/`UInputMappingContext`/Modifier/Trigger 状态机、优先级栈、多设备统一、输入缓冲 150ms / 土狼时间 120ms | `UInputAction`、`AddMappingContext`、`BindAction`、输入配置文件、TS 侧输入封装 | 3C |
| 06 | **渲染管线**：Game/Render/RHI/GPU 四棒接力、`FPrimitiveSceneProxy` 快照、剔除与 `FMeshDrawCommand` 合批、延迟渲染与 GBuffer、RDG 声明式排产、`stat unit`/`ProfileGPU`、帧预算制度 | 项目里 `stat unit` / `ProfileGPU` 的使用记录、`ENQUEUE_RENDER_COMMAND`、性能基线文档、线程耗时截图 | **图形** |
| 07 | **Nanite / Lumen / VSM**：簇级 LOD 与 VisBuffer、软 RT（距离场 + Surface Cache + 屏幕探针）/ 硬 RT、16K 虚拟页表按变化付费、显存池、三档显卡选型 | `DefaultEngine.ini` 的 `[/Script/Engine.RendererSettings]` 全部 `r.Nanite.*` / `r.Lumen.*` / `r.Shadow.Virtual.*` 键；`stat Nanite` 记录；设备分档逻辑 | **图形** |
| 08 | **材质**：PBR 四参数与 GGX、极端值对照、材质图编译成 HLSL 与变体、采样次数才是账单、`MaterialFunction`/`MIC`/`MID`/`MPC`、ORM 通道打包、纹理预算 | 母材质 / 材质实例 / 材质函数目录、`CreateDynamicMaterialInstance`、`SetScalarParameterValue`、`UMaterialParameterCollection`、贴图命名规范 | **图形 / Puerts 交汇** |
| 09 | 竖切原型：曳光弹方法、灰盒尺寸（门 120 / 走廊 240 / 跳高 100cm）、CMC 调参、控制台/VisLog/日志分级、PIE 与打包、**一次跳跃串起前八章** | 输入到角色动作的一条真实链路、CMC 参数赋值处、`slomo` / VisLog 的使用痕迹、`RunUAT` 打包脚本 | 3C |
| 10 | **光照与氛围**：三点布光三层职责、色温叙事、五种光源性格、曝光 EV100 与色调分离、体积雾 Froxel 档位、Michelson 对比度与注意力权重 | 场景里的 `DirectionalLight`/`SkyLight`/`RectLight`/`SpotLight`、`PostProcessVolume`、`ExponentialHeightFog`、`r.VolumetricFog.*`、Light Function | **图形** |
| 11 | 动画一阶：EventGraph 算账 / AnimGraph 摆姿势、状态机与迟滞阈值、2D 混合空间、Sync Group、滑移公式 `v_slide = v_actual − R·v_authored`、Root Motion 边界 | `UAnimInstance` 子类、`NativeUpdateAnimation`、BlendSpace 资产、`UCharacterMovementComponent` 参数赋值 | 3C |
| 12 | 动画二阶：Motion Matching / Pose Search 代价函数、Two Bone IK 与极向量、Control Rig、IK Retargeter、**12.6 什么时候不该上 MM** | 是否有 Pose Search / IK / Control Rig 资产；若没有，讲清「为什么项目没上」这一取舍本身 | 3C / 取舍题 |
| 13 | **Niagara**：可读性优先、三段式节奏与 70/25/5、System/Emitter/Module 栈与命名空间、CPU/GPU 三维度选型、材质联动、Overdraw `A×L×Cpx` | `UNiagaraSystem`、`UNiagaraComponent`、Effect Type、User 参数写入（`SetNiagaraVariable` 类封装）、`Fixed Bounds`、粒子 LOD 配置 | **图形 / Puerts 交汇** |
| 14 | **声音系统**：三层声景（拟音/氛围/音乐）、dB 对数尺与听感疲劳、MetaSounds 参数化 DSP 图 + Quartz 时钟、SoundAttenuation 衰减/空间化/遮挡（音频版视锥剔除）、自适应音乐纵向分层、Submix 与 Ducking | `UMetaSoundSource`、`UAudioComponent`、`USoundAttenuation`、`USoundConcurrency`、`USoundSubmix`、`SetFloatParameter` 类调用、`au.*` CVar | **图形（管线同构）** |
| 15 | **Sequencer 与镜头**：景别阶梯与 180 度轴线、`LevelSequence`/`LevelSequencePlayer`/Shot 轨、Possessable vs Spawnable、焦距-FOV 公式与景深、ViewTarget 混合状态机、归还控制权与跳过单一入口 | `ULevelSequence`、`ULevelSequencePlayer`、`ACineCameraActor`、`SetViewTargetWithBlend`、`SetCinematicMode`、`CameraShakeBase`、事件轨 | **图形 / 3C** |
| 16 | **大世界**：World Partition 运行时网格、OFPA 一 Actor 一文件、流送源与滞后、Data Layer、HLOD、LWC 双精度与 camera-relative、内存平方律 | World Settings 的 WP 配置、`__ExternalActors__`、`UWorldPartitionStreamingSourceComponent`、`UDataLayerManager`、HLOD Layer、`wp.*` CVar、`FVector_NetQuantize` | **图形** |
| 17 | **PCG**：点云是通用货币、约束求解而非随机、采样器/过滤器/生成器、低频密度场 + 泊松盘最小间距、保护区一票否决、烘焙期 vs 运行时（MMO 选烘焙） | `UPCGGraph`、`UPCGComponent`、`UPCGPointData`、Surface/Spline Sampler、Self Pruning、Static Mesh Spawner、Seed、夜间烘焙脚本 | **图形** |
| 18 | **打磨与优化**：先测量别猜、Amdahl 天花板 `1/(1−p)`、Unreal Insights 三视图（CPU 时间轴 / GPU 按 Pass / 内存曲线形状）、四种瓶颈画像、16.6ms 工资表、平台分档与自动降级、22ms→15.9ms 战报 | 性能基线文档、CI 门禁、`*.utrace`、`trace.start` 脚本、`TRACE_CPUPROFILER_EVENT_SCOPE` / `SCOPE_CYCLE_COUNTER` 埋点、`sg.*` / DeviceProfile / `GameUserSettings`、PSO 预热脚本 | **图形** |
| 19 | UI/UX：UMG 是 Slate 的 retained 封装、Bind 轮询代价、CommonUI 输入路由栈、MVVM + FieldNotify、服务器权威下的背包数据流、Invalidation Box / ListView 虚拟化 | Widget 基类、`UCommonActivatableWidget`、`UMVVMViewModelBase`、`FieldNotify`、`UInvalidationBox`、TS 侧 UI 基类 | UI（他有基础） |
| 20 | 网络原理：RTT/抖动/丢包量级、帧同步 vs 状态同步、服务器权威校验链、插值 2Δ=100ms、延迟补偿 `RTT+插值延迟`、四种拓扑 | 网络配置、Ping/丢包采样代码、劣网模拟开关、`Net PktLag` 使用痕迹 | gameplay |
| 21 | 复制系统：「服务器有真相，客户端有影子」、属性复制链路、`RepNotify`/条件复制/休眠、RPC 三态与选型、Owner 链、相关性与优先级、带宽公式、200 人血条事故 | `ReplicatedUsing`、`DOREPLIFETIME`、`Server`/`Client`/`NetMulticast` RPC、`IsNetRelevantFor`、`stat net` 记录 | gameplay |
| 22 | GAS 一阶：五大件（ASC / AttributeSet / GA / GE / Tag）、Base vs Current、`(Base+ΣAdd)×ΠMul÷ΠDiv`、GE 四种时长策略、Tag 三位一体、**22.7 什么时候别碰 GAS** | 若启用：`UAbilitySystemComponent`、`UAttributeSet`、`UGameplayEffect`、`GameplayTag` 登记表、`showdebug abilitysystem` | gameplay |
| 23 | GAS 二阶：预测是生存线、Prediction Key 与回滚、TargetData 五条校验、连招取消窗口、冷却/消耗都建模成 GE、500 技能目录宪法 | `FPredictionKey` 相关代码、`FGameplayAbilityTargetDataHandle`、GameplayCue、冷却 Tag、连招窗口 Notify | gameplay / 3C |
| 24 | Dedicated Server：源码版引擎、构建与容器化、1 服 2 客户端 | `*.Target.cs` 里的 Server target、`BuildCookRun -target=...Server`、CI/部署脚本、容器配置 | 备查 |
| 25 | MMO 分层架构：容量模型与分线、Zone 拆分、跨区交接 | 网关/Zone/分线配置、进程拓扑文档、容量模型表格、`APlayerState::CopyProperties` 类痕迹 | 备查 |
| 26 | 持久化与回档：事务、存档版本兼容、回存可观测 | `USaveGame`、DB 访问层、事务/回滚脚本、存档版本号与迁移代码 | 备查 |
| 27 | 数值与经济：水龙头/水槽平衡表、数据驱动配置 | `UDataTable` / `UCurveTable`、数值表导入脚本、配置仓库与校验 | 备查 |
| 28 | 上线与运营：反作弊、CI/CD、灰度、热更新、可观测性、**28 章毕业清单** | CI 配置、灰度/回滚 runbook、监控大盘定义、`ChunkDownloader` 类热更配置 | 备查（毕业清单已用于 4.1/4.2） |

### 4.3 两条主线的优先级重排

**主线 A · Puerts → UE 原生（转岗主菜，先走）**
- 现在：ch02（2.1/2.3/2.5/2.6）、ch03、ch04（宏速查 + 模块 + Live Coding 边界）、ch05、ch09、ch11
- 做作品时：ch06 的 `stat unit` 一节、ch19
- 转岗前：ch20、ch21、ch22、ch23、ch12.6

**主线 B · 图形学（并行推进，按「一帧的账单」顺序，不要按章节号跳）**
1. **入口**：ch06（四棒接力 + `stat unit` 四行）→ 先能读懂项目自己性能文档里的四个数字。
2. **GPU 侧**：ch07（Nanite/Lumen/VSM 开关与代价）→ ch08（材质采样账单）→ ch10（光照、曝光、体积雾）。
3. **像素之外的图形系统**：ch13（Niagara / Overdraw）→ ch14（音频管线，与渲染管线同构，最好懂）→ ch15（相机 / Sequencer，和 3C 直接接壤）。
4. **规模与测量**：ch16（World Partition / HLOD / LWC）→ ch17（PCG / ISM / Draw Call）→ ch18（Insights / Amdahl / 预算制度 / 分档）。
5. **收口**：能用项目真实数据画一张「这一帧 16.6ms 花在哪」的表，并解释每个数字对应哪个 Pass / 哪条线程。

**明确备查（不排期）**：ch24–28；整套 C++ 语言特性；渲染源码逐行精读；shader 编写。目标不是转图形程序，是「读懂账单、参与取舍」。

### 4.4 目标岗位映射

| 岗位能力 | 对应章节 |
|---|---|
| 3C · Character | ch03 框架、ch09 CMC 手感、ch11 状态机/混合空间/滑移、ch12 IK |
| 3C · Control | ch05 Enhanced Input、ch09 输入缓冲/土狼时间、ch23 延迟下的连招与预测 |
| 3C · Camera | ch03 `PlayerCameraManager`、ch09 弹簧臂/相机滞后、**ch15 焦距/FOV/景深/ViewTarget 混合** |
| Gameplay | ch03、ch04、ch19、ch20、ch21、ch22、ch23 |
| **图形协作能力** | **ch06/07/08/10/13/14/15/16/17/18**（能读懂 `stat unit`、`ProfileGPU`、Insights、预算表；能判断「该砍阴影投影还是删灯」） |
| Puerts 差异化 | ch02（反射/GC）、ch04（UHT/模块）、ch08/13/15/18 的脚本层参数入口 |

### 4.5 图形学全景：一帧的账单（自包含速览）

给 Agent 讲图形学时，用这条链当骨架，每一站都回项目里找对应配置或数据。

```
输入/逻辑 → Game 线程
   └ UPrimitiveComponent 变脏 → 生成只读快照 FPrimitiveSceneProxy（与「服务器真相/客户端影子」同构）
渲染线程
   └ 视锥/遮挡/距离剔除 → FMeshDrawCommand → 按 shader/材质排序合批（省的是「手续费」，不是 GPU 的活）
RHI 线程 → 翻译成 D3D12 / Vulkan / Metal
GPU（RDG 按「声明读写」自动排 Pass 顺序、做显存别名）
   └ PrePass（深度）→ BasePass（材质参数写进 GBuffer）→ ShadowDepths（VSM 按变化付费）
   → Lumen（软 RT：距离场 + Surface Cache + 屏幕探针；硬 RT 选修）
   → Lighting（逐灯读 GBuffer，灯数从「乘号」挪进「加号」）
   → Translucency（透明回前向，Overdraw 在这里结账）
   → PostProcessing（TSR / Bloom / 色调映射）→ Present
帧时间 = max(Game, Draw, GPU) + 同步开销   ← 不是三者相加
```

**贯穿全书的三笔账**：
- **并行账**：三条线程 + GPU 是流水，优化非瓶颈那一栏全白费。
- **带宽账**：现代渲染的核心矛盾是「喂不饱」——算力涨得比显存带宽快，所以 Mipmap、纹理压缩、合批、GBuffer 抠比特、Surface Cache 全是同一件事的不同面。
- **预算账**：16.6ms 是制度不是愿望；ch06 立项、ch18 用 Insights/CI 门禁收口。Amdahl 定律 `S_max = 1/(1−p)` 决定「占比不足 10% 的系统默认不碰」。

**各章在这条链上的位置**：ch06 给骨架 → ch07 换掉几何/光照/阴影三段 → ch08 决定 BasePass 写什么 → ch10 决定灯与雾 → ch13 决定 Translucency → ch14 是同构的音频管线 → ch15 决定相机与 FOV → ch16/17 决定「有多少东西要画」→ ch18 决定「画不画得动、怎么量」。

---

## 5. 名词盲区：用真实代码解释（核心方法）

### 5.1 方法：教程出题 → 项目给答案

商业项目代码是**多年演化的结果**，不是教材：有历史包袱、封装层、间接调用。直接从头读容易「每行都看懂、整体不知道为什么」。每轮固定三步：

1. 从教程挑**一个**问题（例：「为什么成员变量必须写 `UPROPERTY`？」「为什么砍 90 盏灯的投影比删灯有效？」）。
2. Agent 在项目里找**真实正例或反例**，贴 `路径:行号` / `ini 段与键`。
3. 用 0.3 的格式讲透，给一个「不改业务代码」的最小实验。

**禁止**：一次铺开一章全部术语；按章节顺序照本宣科；用虚构示例代替项目代码；用公式开场代替画面现象。

### 5.2 名词 → 在项目里搜什么 → 应看到什么 → 对应章节

**A 组 · 反射与对象模型（Puerts 主线）**

| 名词 | 在项目里搜什么 | 应看到什么 | 教程 |
|---|---|---|---|
| 宏 / `UCLASS` / `GENERATED_BODY` | `UCLASS(`、`GENERATED_BODY()` | 类声明上的括号、成对出现的样板宏 | ch02 §2.2、ch04 §4.2 |
| `UPROPERTY` | `UPROPERTY(` | `EditAnywhere` / `BlueprintReadWrite` / `Replicated` / `Transient` 等说明符 | ch02 §2.2、ch04 §4.2 |
| `UFUNCTION` | `UFUNCTION(` | `BlueprintCallable` / `BlueprintPure` / `BlueprintImplementableEvent` / `Server` / `Client` / `NetMulticast` | ch04 §4.2、ch21 |
| UHT / `.generated.h` / 反射 | `#include "*.generated.h"`、`Intermediate/` 生成物 | 必须是最后一个 include；生成物里是反射注册代码 | ch02 §2.1、ch04 §4.4 |
| `UObject` / `AActor` / `UActorComponent` | 项目基类继承声明 | 类家谱、`A`/`U` 前缀规律 | ch02 §2.2、ch03 |
| GC / 可达性 / 野指针 | 裸指针成员、缓存容器、`TWeakObjectPtr`、`IsValid()` | 谁在保活、谁只是观察、判空写在回调第一行 | ch02 §2.3/§2.5/§2.6 |
| `TObjectPtr` / `TWeakObjectPtr` / `TSharedPtr` | 三种指针实际使用点 | UObject 世界 vs 非 UObject 世界的边界 | ch02 §2.5 |
| `CDO` / `UPackage` / `.uasset` | 蓝图子类、数据资产、默认值设置 | 「改默认值改的是谁」 | ch02 §2.4 |
| `Build.cs` / UBT / 模块 / Live Coding | `*.Build.cs`、`*.Target.cs`、开发规范 | `PublicDependencyModuleNames` / `Private...`、改反射结构必须重启 | ch04 §4.3–4.5 |
| `GameMode` / `GameState` / `PlayerController` / `Pawn` / `PlayerState` | 项目自己的这几个类 | 真实项目把什么数据放进了哪个类 | ch03 |
| `UGameInstance` / `Subsystem` | `UGameInstanceSubsystem` 等派生 | 跨关卡存活的数据放哪 | ch03、ch19 |
| Enhanced Input / `IA` / `IMC` / Trigger | `UInputAction`、`UInputMappingContext`、`AddMappingContext`、`BindAction` | 键位与语义解耦、优先级栈 | ch05 |
| CMC / 输入缓冲 / 土狼时间 | `UCharacterMovementComponent` 参数赋值、角色基类 | `MaxWalkSpeed` / `JumpZVelocity` / `GravityScale` / `AirControl` | ch09 §9.3 |
| Delegate / 事件 | `DECLARE_*DELEGATE*`、绑定与解绑封装、TS 侧订阅 | 谁持有回调、什么时候必须解绑 | ch02 案件二、ch19 |
| `RepNotify` / RPC / 复制 | `ReplicatedUsing`、`DOREPLIFETIME`、`Server`/`Client`/`NetMulticast` | 状态走属性、事件走 RPC | ch21 |
| GAS / ASC / GE / Tag | 若启用：`UAbilitySystemComponent`、`UAttributeSet`、`UGameplayEffect` | 五大件在项目里的落地形态 | ch22、ch23 |

**B 组 · 图形学（新增完整覆盖）**

| 名词 | 在项目里搜什么 | 应看到什么 | 教程 |
|---|---|---|---|
| `stat unit` 四行 / Frame / Game / Draw / GPU | 性能文档、调试 HUD 封装、`stat` 命令记录 | 最大那一栏才是瓶颈；**不是三者相加** | ch01、ch06 §6.5、ch18 |
| 16.6ms / 帧预算 / 工资表 | 性能基线文档、CI 门禁配置 | 每个系统的额度与「超了先砍什么」 | ch06 §6.6、ch18 §18.4 |
| 四棒接力 / `FPrimitiveSceneProxy` / `FMeshDrawCommand` | `ENQUEUE_RENDER_COMMAND`、渲染线程相关封装（若有） | Game 写快照、Render 读快照，互不锁 | ch06 §6.1 |
| 剔除 / Draw Call / 合批 / ISM / HISM | `stat scenerendering` 记录、`UInstancedStaticMeshComponent`、PCG Spawner | 合批省的是 CPU「手续费」，不省 GPU 的活 | ch06 §6.2、ch17、ch18 画像一 |
| 延迟渲染 / GBuffer / BasePass | `ProfileGPU` 记录、材质 ShadingModel 配置 | 几何阶段「挤颜料」不算光，光照阶段逐灯取色 | ch06 §6.3 |
| RDG / Pass / `RDG_EVENT_NAME` | 自定义 Pass（若有）、`ProfileGPU` 的 Pass 树 | Pass 名就是账单上的可读性 | ch06 §6.4 |
| CVar / Scalability / DeviceProfile | `DefaultEngine.ini` 的 RendererSettings、`sg.*`、`SetCVar` 封装 | 画质档位是配置，不是散落在代码里的魔法数 | ch07 §7.1、ch18 §18.5 |
| Nanite / 簇 / VisBuffer / Fallback Mesh | `r.Nanite.*`、`stat Nanite` 记录、网格资产的 Nanite 勾选 | 着色成本从「每三角形」变「每像素」；变形体/半透明不能开 | ch07 §7.1–7.2 |
| Lumen / 软 RT / Surface Cache / 屏幕探针 / 硬 RT | `r.DynamicGlobalIlluminationMethod`、`r.Lumen.*`、距离场精度设置 | 镜面与薄墙漏光是软 RT 的短板 | ch07 §7.3 |
| VSM / 虚拟页表 / 物理池 / 缓存失效 | `r.Shadow.Virtual.*`、灯光的投影开关 | 阴影「按变化付费」；会动的植被与投影灯海是两条红线 | ch07 §7.4 |
| PBR 四参数 / GGX / Shading Model | 母材质节点、材质实例参数 | Roughness 改的是波瓣形状；Metallic 应作遮罩图 | ch08 §8.1 |
| 材质变体 / Shader Complexity / 纹理采样数 | 材质统计面板记录、`StaticSwitch` 使用点 | 节点数 ≠ 成本；采样次数与指令数才是账单 | ch08 §8.2/§8.4 |
| `MaterialInstanceConstant` / `MID` / `MPC` | `CreateDynamicMaterialInstance`、`SetScalarParameterValue`、`UMaterialParameterCollection` | 父材质是类、实例是对象；MID 只能改暴露的参数 | ch08 §8.3 |
| ORM 通道打包 / Mipmap / 虚拟纹理 | 贴图命名与压缩设置、Texture Group 配置 | 一次采样拿三个参数，性价比最高的优化 | ch08 §8.4 |
| 三点布光 / 色温 / EV100 / 色调分离 | `PostProcessVolume`、`ALight` 子类、`FPostProcessSettings` 赋值 | 校色层永远最后做；曝光先锁再调灯 | ch10 |
| 体积雾 / Froxel / `r.VolumetricFog.*` | `ExponentialHeightFog`、`r.VolumetricFog.GridPixelSize` / `GridSizeZ` / `HistoryWeight` | 超高档一帧能吃掉 10ms，按场景配档 | ch10 |
| Michelson 对比度 / 注意力权重 | 后处理预设、美术评审文档 | 「压暗周围」通常比「加灯」便宜 | ch10 |
| Niagara System / Emitter / Module 栈 / 命名空间 | `UNiagaraSystem`、`UNiagaraComponent`、`User.*` 参数 | Force 必须排在积分器之前；User 是对外合约 | ch13 §13.2 |
| CPU/GPU 模拟 / `Fixed Bounds` | Niagara 发射器 Sim Target 设置 | 要精确碰撞选 CPU，过两千粒子选 GPU，GPU 必须给包围盒 | ch13 §13.3 |
| Overdraw / Additive / Translucent / `A×L×Cpx` | `Shader Complexity` / `Quad Overdraw` 截图、粒子材质混合模式 | 砍层数见效最快；切 GPU 模拟一分钱 Overdraw 都不省 | ch13 §13.6 |
| MetaSounds / `USoundAttenuation` / Submix / Ducking | `UMetaSoundSource`、`UAudioComponent`、`USoundSubmix`、`SetFloatParameter` | 音频管线与渲染管线同构：衰减≈视锥剔除，Submix≈后处理 | ch14 |
| Sequencer / `LevelSequence` / Shot 轨 / 事件轨 | `ULevelSequence`、`ULevelSequencePlayer`、Master+Shot 资产 | 时间驱动而非事件驱动；结束逻辑单一入口 | ch15 §15.3 |
| 焦距 / FOV / 景深 / Camera Shake | `UCineCameraComponent` 的 Filmback 与 Lens/Focus Settings | 广角「走近看」，长焦「偷着看」；两端 FOV 差 >30° 混合会「变焦呼吸」 | ch15 §15.4 |
| `SetViewTargetWithBlend` / `SetCinematicMode` | 演出进入/退出封装、跳过结算函数 | 输入解锁必须等 ViewTarget 落定 | ch15 §15.5 |
| World Partition / 流送格子 / 流送源 / OFPA | World Settings、`__ExternalActors__`、`UWorldPartitionStreamingSourceComponent` | 无缝 ≠ 没有加载，是「加载与游玩并行」 | ch16 §16.2 |
| Data Layer / HLOD / LWC | `UDataLayerManager`、HLOD Layer 资产、`FVector_NetQuantize` | 格子管空间，数据层管状态；LWC 把「不准」挪到相机身边 | ch16 §16.3–16.5 |
| 加载尖峰 / `Unloaded→Loading→Loaded→Activated` / 平方律 | `s.AsyncLoadingTimeLimit` 类 CVar、流送预算表 | 加载完成 ≠ 可见；主线程分帧注册是尖峰的正面答案 | ch16 §16.1/§16.4 |
| PCG / 点云 / 密度场 / 泊松盘 / 保护区 | `UPCGGraph`、`UPCGPointData`、Sampler/Filter/Spawner、Seed | 约束求解而非随机；均匀随机在统计上一眼假 | ch17 |
| Unreal Insights / `.utrace` / Named Event / 埋点宏 | `trace.start` 脚本、`TRACE_CPUPROFILER_EVENT_SCOPE`、`SCOPE_CYCLE_COUNTER` | CPU 看线程接力、GPU 看 Pass、内存看曲线形状 | ch18 §18.2 |
| Amdahl 定律 / PSO 预热 / URO / 自动降级 | 性能评审文档、PSO 收集脚本、`SetOverallScalabilityLevel` | 占比 5% 优化到零也只有 5.3% 收益；降档果断、升档克制 | ch18 §18.1/§18.3/§18.5 |

### 5.3 一个示范：`UPROPERTY` 应该怎么被解释

不要这样讲：`UPROPERTY` 是 UE 的属性声明宏，用于向 UHT 注册元数据。

应该这样讲（Agent 需把方括号换成项目真实片段）：

1. **人话**：「给引擎登记一下：这个字段归它管。」
2. **项目实例**：贴项目里某个类的一行 `UPROPERTY(...)` 与字段，给 `路径:行号`；再贴 `*.generated.h` 里对应注册痕迹（若可找到）。
3. **逐行拆解**：括号里各说明符各管一摊（编辑器能改 / 蓝图能读写 / 参与网络复制 / 不存盘）；**只写 `UPROPERTY()`** = 登记给 GC 和序列化，不对外露面。
4. **去掉会怎样**：C++ 编译器不报错（宏展开后对编译器几乎为空），但 GC 看不见这个引用 → 对象可能被合法回收 → 悬空指针，崩溃点离案发现场很远。回扣 ch02 案件一。
5. **对照**：Unity `[SerializeField]` 只喂 Inspector；`UPROPERTY` 一份登记同时喂编辑器、序列化、GC、蓝图、Puerts 五个消费者。
6. **脚本层接口**：Puerts 能在 TS 里读到这个字段，靠的就是这次登记；TS 侧「还引用着」却不构成 UE GC 的保活。
7. **最小实验**：照 ch02 上手任务 2，在练习工程故意写无 `UPROPERTY` 的裸指针成员，强制 `CollectGarbage()` 后访问，复现异常；补上宏后跑 100 次强制 GC。
8. **自测**：① 为什么宏写错时编译器常常沉默？② TS 引用为什么不能阻止 UE 回收？

### 5.4 一个图形学示范：`r.Shadow.Virtual.Enable` 应该怎么被解释

1. **人话**：「阴影别每帧重画，只有变了的那一块才重画。」
2. **项目实例**：贴 `Config/DefaultEngine.ini` 里 `[/Script/Engine.RendererSettings]` 对应键与实际值；再找项目里某盏灯的「投射阴影」开关。
3. **逐行拆解**：这个键决定全项目阴影走虚拟页表还是传统 CSM；改成 0 会怎样（画面变化 + `ProfileGPU` 里 ShadowDepths 的数字变化）。
4. **对应教程**：ch07 §7.4（按变化付费）、ch06 §6.3（为什么删 90 盏灯的投影比删灯有效——灯数已不是乘法项，阴影投影还是）。
5. **已知对照**：Unity 里阴影贴图分辨率与 cascade 是手动配的；这里引擎按屏幕覆盖到的页分配。
6. **脚本层接口**：画质设置界面怎么改它？找项目里的 `SetCVar` 封装或 `GameUserSettings` 调用；说明 CVar 本身不是 UObject 属性，TS 通常经项目封装的 `UFUNCTION` 间接写入——**这正好是「反射边界」的又一个例子**。
7. **最小实验**：PIE 中 `ProfileGPU` 记录 ShadowDepths，再把该 CVar 取反重测，对比毫秒数；或用 `r.ScreenPercentage 50` 判断瓶颈在像素侧还是几何侧。
8. **自测**：① 为什么「会动的植被」会让 VSM 缓存形同虚设？② 为什么砍投影灯而不是删灯？

---

## 6. Puerts 原理深挖专题（主线 A）

### 6.1 勘察清单（Puerts 特有，补足 0.4）

| 找什么 | 目的 |
|---|---|
| Puerts 插件目录与版本 / commit | 确定 API 语义，避免用外网教程的旧写法 |
| 类型声明（`.d.ts`）**生成脚本**与生成时机 | 回答「TS 里的 UE 类型从哪来」 |
| TS 启动引导：VM/JsEnv 创建、模块加载、入口文件 | 回答「脚本何时、由谁拉起」 |
| C++ 侧桥接注册 / 扩展函数 | 回答「除了反射自动暴露，项目还手工加了什么」 |
| TS 侧调用 UE 类型的典型代码（尤其 UI 层，学习者最熟） | 第一个例题 |
| Delegate / 回调的绑定与**解绑**封装 | 生命周期与野回调 |
| UObject 在 TS 侧的持有方式、缓存、异步回调 | 两套 GC 的边界 |
| 热更新 / 热重载脚本与约束 | TS 模块状态与 UObject 实例如何对齐 |
| 与「GC 误杀 / 悬空 / 回调失效」相关的注释或修复记录 | **最有价值** |

### 6.2 必答的 12 个「为什么」（建议按序推进，一次一问）

1. TS 里能写出的 UE 类名，是编译期就有的，还是运行时/构建期生成的？谁读什么生成的？
2. 为什么 C++ 类加了 `UCLASS` 才能被 TS 看见？不加会怎样？
3. `UPROPERTY` 除了让编辑器显示，还让 Puerts 拿到了什么？（反射元数据 → 属性读写 + GC 可见）
4. `UFUNCTION` 加不加 `BlueprintCallable`（或项目用的等效暴露方式），在 TS 侧表现为什么差别？
5. TS 调一个 UE 函数，调用栈经过哪几层？（脚本引擎 → 绑定层 → UE 反射调用入口 → 原生 C++；具体函数名以项目实现为准）
6. 参数与返回值怎么转换？数值 / 字符串 / 结构体 / 容器 / UObject 引用各走什么路径？
7. TS 侧持有一个 UObject，UE GC 知道吗？为什么会出现「我明明还引用着，它却被回收了」？
8. 项目里用什么手段防止第 7 条？（弱引用、挂到稳定宿主、绑定/解绑约定、生命周期归属）——**请贴真实封装**
9. TS 函数挂到 UE Delegate 上之后，什么时候必须解绑？不解绑的崩溃长什么样？
10. TS 侧对蓝图/类的扩展机制，最终落到 UE 的哪个对象上？和 `CDO` 什么关系？
11. 热更新 / 热重载时，UObject 实例与 TS 模块状态怎么对齐？和 ch04 的 Live Coding 边界有何呼应？
12. **收口题**：为什么这套机制必然要求 UHT 生成 `.generated.h`？假如 UE 换成自带运行时反射的语言，这一层还要不要？

> 第 12 题答得出来，就等于把 ch02 + ch04 吃透了，也解释了「为什么 Unity/TS 里从不需要想这些」。

### 6.3 从 Puerts 反推 UE 原生

| Puerts 现象 | 背后的 UE 原生机制 | 教程 |
|---|---|---|
| `.d.ts` 里有 UE 类型 | UHT 扫描宏生成反射元数据 | ch02 §2.1、ch04 §4.2 |
| TS 能读某个 C++ 字段 | 该字段被 `UPROPERTY` 登记 | ch02 §2.2 |
| TS 能调某个 C++ 函数 | 该函数被 `UFUNCTION` 登记 | ch04 §4.2 |
| TS 能拿到蓝图资产 / 类 | `UClass`、`CDO`、资产序列化 | ch02 §2.4 |
| TS 缓存对象后偶发失效 | 两套 GC 边界、`TWeakObjectPtr` / `IsValid()` | ch02 案件二 |
| TS 回调没触发或触发两次 | Delegate 生命周期、事件去重 | ch02 案件二、ch19 |
| 新增 C++ 类后 TS 里看不到 | 模块边界、`Build.cs`、需重新生成类型 / 重编 | ch04 §4.3/§4.4 |
| 改了宏但没生效 | 反射表在模块加载时固化，Live Coding 换不掉 | ch04 §4.5 |
| 编辑器里好好的、打包后异常 | 模块/插件加载差异、PIE 与打包 | ch01、ch09 §9.5 |

---

## 7. 图形学专题（主线 B）

### 7.1 为什么把它升为主线

3C 岗天天与动画、相机、特效、帧预算打交道；看不懂 `stat unit` 与 GPU Pass 时间树，就只能等别人给结论。而且**图形学参数绝大多数是脚本层可碰的**——画质设置、材质参数、Niagara User 参数、后处理曝光、灯光属性。这让它成为「Puerts → UE 原生」最自然的第二块练习场：同一套反射机制，从 UI 参数一路摸到渲染管线。

**边界**：目标不是成为图形程序，不写 shader、不逐行读渲染器源码。目标是能读懂账单、参与取舍、和 TA 对话。

### 7.2 勘察清单（图形学特有，补足 0.4）

已在 0.4 的第 13–20 项列出。Agent 首次勘察后需额外产出一张表：

| 项 | 要填什么 |
|---|---|
| 项目渲染特性开关 | Nanite / Lumen（软或硬 RT）/ VSM / 体积雾 / 虚拟纹理，逐项「开/关/未知 + 依据的配置行」 |
| 画质档位 | 几档、每档关键 CVar、由谁切换、有无自动降级 |
| 一帧的账单 | 项目性能基线里 Game / Draw / GPU 各多少 ms，最大一栏是谁 |
| GPU Pass 分布 | `ProfileGPU` 里 ShadowDepths / BasePass / Lumen / Translucency / PostProcessing 各多少 ms |
| 已知性能事故 | 项目里有没有「砍错东西」的复盘（对应 ch18 导语那次白砍三天树） |

### 7.3 必答的 12 个「为什么」（按「一帧的账单」顺序）

1. 项目这一帧的预算表在哪？16.6ms（或项目实际目标）里最大一栏是谁？这个数字是谁测的、什么硬件什么场景？
2. 项目开了 Nanite / Lumen / VSM 吗？从 `DefaultEngine.ini` 哪几行看出来？为什么这么选（画质 vs 平台 vs 产能）？
3. 一盏灯从 Actor 到屏幕像素，经过哪些 Pass？为什么「砍 90 盏灯的投影」比「删 90 盏灯」有效得多？
4. GBuffer 里存了什么？为什么半透明物体必须单独走前向路径？这跟项目里某个特效的 Overdraw 有什么关系？
5. `stat unit` 四行里 Game 高 / Draw 高 / GPU 高分别该怎么查？项目历史事故属于哪一种？
6. 项目里采样次数最多的材质是哪个？有没有做 ORM 通道打包？材质变体数有没有失控？
7. 一个 `UMaterialInstanceDynamic` 在项目里由谁创建、谁改参数？TS 侧能不能改？（连到 ch08 与 Puerts）
8. 体积雾档位是谁定的？`r.VolumetricFog.GridPixelSize` 在项目里出现在哪？为什么按场景配档而不是全图统一？
9. 特效的 Overdraw 有没有预算？Effect Type / 粒子 LOD / `Fixed Bounds` 怎么配的？为什么「切 GPU 模拟」不省 Overdraw？
10. 项目用了 World Partition 吗？格边长、加载半径、HLOD 层怎么设的？为什么半径翻倍内存按平方涨？PCG 产物为什么落成 ISM？
11. 画质档位怎么分？DeviceProfile / Scalability / 自动降级器在哪？为什么「降档果断、升档克制」？
12. **收口题**：为什么帧时间是 `max(Game, Draw, GPU)` 而不是三者相加？这个事实如何决定优化顺序？为什么 Amdahl 定律能让「占比 5% 的系统」直接劝退？为什么 RDG 能让引擎自动排出合法的 Pass 顺序？

> 第 12 题答得出来，就能独立读懂任何一份性能报告，也自然理解 ch06 与 ch18 为什么一头一尾呼应。

### 7.4 两条主线的交汇点：Puerts × 图形学

**这是本 Brief 最值得讲的一组题**——每个图形学对象都问一句「TS 怎么碰它」，就把两条线焊在一起。

| 图形学对象 | 脚本层怎么碰它 | 背后的 UE 机制 | 教程 |
|---|---|---|---|
| 画质档 / 分辨率 / CVar | 设置界面 → `GameUserSettings` / `SetCVar` 封装 | **CVar 不是 UObject 属性**，通常经项目封装的 `UFUNCTION` 间接写入 → 正好演示「反射边界」 | ch07 §7.1、ch18 §18.5 |
| 材质参数（高亮、蓄力、天气湿度） | `CreateDynamicMaterialInstance` + `SetScalarParameterValue` | `UMaterialInstanceDynamic`、`UPROPERTY` 参数化 | ch08 §8.3、ch13 §13.5 |
| 全局视觉状态（雨、昼夜） | `UMaterialParameterCollection` 写入 | 改一个值，全场景材质同帧响应 | ch08 §8.3、ch10 |
| 特效参数 | Niagara `User.*` 参数写入 | `UNiagaraComponent` 的 User 命名空间是对外合约 | ch13 §13.2/§13.5 |
| 后处理 / 氛围预设 | `FPostProcessSettings` 赋值、`BlendWeight` 插值 | 结构体属性经反射暴露 | ch10 |
| 灯光 / 雾 | 光源组件属性、Actor 属性 | `UPROPERTY` + 组件 | ch10 |
| 资产异步加载 / 流送 | `TSoftObjectPtr` / `FStreamableManager` | 软引用不构成 GC 保活（回扣 ch02） | ch02 §2.4、ch16、ch19 |
| 过场 / 相机 | `ULevelSequencePlayer` 播放与结束回调 | Delegate 绑定与解绑（回扣 ch02 案件二） | ch15 §15.3/§15.5 |
| 图形设置 UI | MVVM / ViewModel | FieldNotify 事件驱动，避免 Bind 轮询 | ch19 |

**收口题（两线合流）**：项目里「玩家在设置界面把阴影质量从高改到低」这一动作，从 TS 事件到 GPU 的 `ShadowDepths` 数字变化，中间经过哪些层？请画出完整链路，并标出哪几层靠反射、哪几层不靠。画出这张图，就等于同时掌握了主线 A 与主线 B。

### 7.5 最小实验（都不改业务代码）

- `stat unit` / `stat unitgraph`：读四行、看稳态还是尖峰。
- `ProfileGPU`：沿最大分支往下钻，找出最贵的单个 Pass。
- `r.ScreenPercentage 50`：GPU 时间明显下降 = 像素侧瓶颈；几乎不动 = 几何/提交侧。
- `stat scenerendering` / `FreezeRendering`：查 Draw Call 与「看不见却在画」。
- `show Collision` / `p.VisualizeMovement 1` / `slomo 0.3`：3C 与调试。
- `trace.start cpu,gpu,frame,bookmark` 抓 30 秒 → Unreal Insights 看三条线程泳道。
- Shader Complexity（Alt+8）/ Quad Overdraw：分别看单像素成本 `Cpx` 与叠加层数 `L`。
- `stat Nanite` / `r.Nanite 0`：A/B 对比，确认 Nanite 到底在渲染什么。
- `r.VolumetricFog.GridPixelSize 16/8/4`：实测三档耗时比例。
- `r.Lumen.HardwareRayTracing 0/1`：对比软硬 RT 的毫秒数。

---

## 8. 学习路线（每阶段给 Agent 的任务）

### 阶段 0（1–2 周）：补最小闭环，不要啃《C++ Primer》

- **给 Agent**：完成 0.4 勘察；从项目挑 3 个典型头文件，用 0.3 格式逐个讲清 `UCLASS` / `UPROPERTY` / `UFUNCTION` / `GENERATED_BODY` / `.generated.h`，一次一个。
- **给学习者**：在练习工程做 ch02 上手任务 2（制造并修复一次悬空指针）。
- **并行启动主线 B**：读项目性能基线里的 `stat unit` 四个数字，只搞懂「最大一栏是谁」。
- **验收**：能用白话解释「宏是登记，不是装饰」，并说出 TS 引用为什么不保活。

### 阶段 1（3–6 周）：打通「输入 → 移动 → 动画 → 相机」竖切

- **给 Agent**：在项目里追一条真实链路——某个按键从输入配置到角色动作的全程，画时序图，逐站标出类与章节（ch03/05/09/11/15 相机部分）。
- **给学习者**：在 `EchoCanyon` 练习工程建 `IA`/`IMC` → C++ `BindAction` → 改 CMC 参数 → 加 150ms 输入缓冲 + 120ms 土狼时间 → 加相机滞后 → 用 `slomo 0.3`、`p.VisualizeMovement`、`stat unit` 观察。
- **验收**：能讲清「按下空格到看见起跳，经过哪些类、几帧延迟」（ch09 跳跃链路图）。

### 阶段 2（1–2 个月）：交一个作品，不是读完 28 章

30–60 秒可玩片段 + 一页技术说明：对象归属决策表、帧预算基线、输入缓冲参数、三个崩溃的定位过程。同时是作品集、面试讲稿、内部转岗凭据。

### 阶段 3（与阶段 2 并行）：图形学主线走一遍「一帧的账单」

- **给 Agent**：按 7.3 的 12 问顺序推进，每问都用 7.2 勘察表里的项目真实配置与 `stat`/`ProfileGPU` 数据作答，每问必须回答「脚本层能不能碰它」。
- **给学习者**：在公司项目或练习工程里跑 7.5 的实验清单，攒一张自己的「16.6ms 工资表」。
- **验收**：能拿出一张带真实毫秒数的表，逐栏说出「超了先砍什么」；能解释「为什么砍阴影投影比删灯有效」。

### 阶段 4：转岗前两块硬通货

- **GAS**：按项目实际（或 Lyra）做最小 demo，五大件 + 一个技能 + 一个 Buff。口诀：Ability 决定做不做，GE 决定变多少，Tag 决定让不让。
- **网络**：讲清「服务器有真相，客户端有影子」，以及「为什么开门用属性复制、伤害飘字用 `NetMulticast, Unreliable`」。
- **给 Agent**：用项目真实 `Server`/`Client`/`NetMulticast` RPC 与 `RepNotify` 各举一例，说明选型理由。

### 一周起步清单（可直接执行）

1. D1：让 Agent 逐行讲项目里一个典型 `.h` 的每个宏与 include，把不懂的词记成表。
2. D2–3：做悬空指针实验（ch02 上手任务 2）。
3. D4–5：PIE 里 Number of Players = 2 + Run Dedicated Server，在客户端打印 `GetGameMode()` 看 `nullptr`（ch03 实验），建立网络权威直觉。
4. D6–7：加长按蓄力与输入缓冲，`slomo 0.3` 验收；另跑一次 `ProfileGPU`，找出项目最贵的 Pass。

---

## 9. 公司商业项目的正确读法

1. **带问题读，别从头读**。每次只追一条链路：「点按钮 → 服务器 → 界面刷新」「按键 → 角色起跳」「改画质 → GPU Pass 数字变化」；全局搜索 + 断点 + 日志 + `stat`，画成时序图。
2. **优先读「边界」而非业务**：`*.Build.cs`、`*.Target.cs`、`DefaultEngine.ini` 的 RendererSettings、模块划分、自定义 `Subsystem`、项目基类。商业项目最值钱的是**它怎么组织代码、怎么处理线上事故**。
3. **死磕 Puerts 与 C++ 的接缝**：类型生成、TS 调 C++ 约定、Delegate 绑定/解绑、UObject 生命周期、热更边界。既补上 ch02 反射，又能产出组内稀缺贡献。**这是最现实的撬点：先在现有岗位上做出 UE 原生层的事，而不是等一个全新身份。**
4. **图形学从配置读起，不从源码读起**：`DefaultEngine.ini` 的 RendererSettings、DeviceProfile、性能基线文档、CI 门禁——这些是项目「为什么这么画」的决策记录，比读 Renderer 源码快十倍。
5. **主动争取一小块越界需求**——一个 Input Mapping、一个 Subsystem、一个 AnimNotify、一条画质档位配置。内部转岗靠「已经做过」，不靠「我学过了」。
6. **注释里的 TODO / WORKAROUND / 崩溃修复 / 性能复盘，优先级高于任何教程**：那是项目用真金白银换来的取舍。

---

## 10. AI 时代该学什么 / 不该学什么

**不用投入（交给 AI 查）**：API 签名、宏说明符拼写、`Build.cs` 字段、CVar 名字、节点怎么连、语法、样板代码、公式推导、教程里的具体数字。

**必须自己长在脑子里**：
1. **心智模型**：一帧怎么跑、对象何时生死、谁拥有谁、真相在哪台机器。出 bug 时 AI 只给「看起来对」的补丁，判断「为什么错」靠模型。
2. **取舍与判断力**：逻辑放 `GameMode` 还是 `GameState`？血量要不要复制？该不该上 GAS / Lumen / Motion Matching？**该砍阴影投影还是删灯？**——面试官只考这个。
3. **测量与调试**：`stat unit` / `ProfileGPU` / Unreal Insights / `obj refs` / VisLog / `showdebug abilitysystem` / Shader Complexity / 网络劣网模拟。AI 看不到你的项目。
4. **手感**：150ms 输入缓冲、120ms 土狼时间、CMC 参数、相机滞后、预测窗口、FOV 混合。手上练出来的，不是读出来的。
5. **能讲出为什么**：白板画出「一次 TS 调用 UE 函数的完整链路」「一个对象从创建到被 GC 的生命周期，标出 TS 引用在哪里不构成保活」「一次按键到角色起跳经过的类与帧」「一帧 16.6ms 花在哪、最大一栏怎么查」。这就是作品集。

**给 Agent 的用法约定**：
- 让 AI 当**解释器**：贴一段项目 `.h` 或一段 ini，问「逐行讲每个宏/每个键在编译期或运行时发生了什么」「去掉这行会怎样」「给我一个能复现的最小实验」。
- 让 AI 出**验收题**而不是答案：每节出 3 个「为什么」，学习者口头答，答不出就回去读。
- 让 AI 生成**对照表**（Unity↔UE、TS↔C++、渲染管线↔音频管线）。
- **禁止**：让 AI 直接吐一整段能跑的 UE 代码然后复制粘贴——那样永远建立不了判断力，而判断力正是逃离「高可替代性」的唯一出口。

**关于教程数据**：文章里的帧率区间、耗时量级、人力估算都是教学性的经验数字，作者自己也反复写「以 5.8 官方文档词条为准」。把它当建立直觉的地图，具体 API、CVar 默认值与版本行为以官方文档 / 源码 / 项目实际为准。

---

## 11. 验收标准与时间预期

**能讲清楚（口头，不看资料）**：
- 一次 TS 调用 UE 函数，从脚本到原生 C++ 经过的每一层，以及为什么每层非有不可。
- 一个 UObject 从创建到被 GC 的生命周期，明确指出 TS 侧引用在哪个环节不构成保活。
- 「宏 → UHT → `.generated.h` → 编辑器/蓝图/序列化/GC/Puerts」这条链，缺一环的后果。
- 一次按键到角色起跳，经过哪些类、几帧延迟、哪些环节可以调手感。
- 服务器权威下，为什么某数据放 `GameState` 而不放 `PlayerState`；为什么开门用属性复制、飘字用 Unreliable RPC。
- **一帧 16.6ms 花在哪：`stat unit` 四行怎么读、`ProfileGPU` 怎么钻、为什么帧时间取 max 不取和、Amdahl 为什么劝退 5% 的系统。**
- **「玩家在设置界面把阴影质量从高改到低」从 TS 事件到 GPU Pass 数字变化的完整链路，标出哪几层靠反射、哪几层不靠。**

**时间预期**（3 年经验 + Unity 底子 + 在 UE 项目里，业余每周 8–10 小时）：
- 3–4 个月：做出可讲 20 分钟的竖切作品，把 3C / gameplay 高频题讲清楚，攒出一张带真实毫秒数的预算表。
- 12–18 个月：具备面试中级 UE gameplay 的实力。
- **不要拿「28 章读到第几章」当进度条。** 第 28 章自己写了：「第 29 章的标题页在你自己的项目里。」

---

## 12. 附录：三轮对话的结论摘要

**Q1：为什么从第 2 章开始看不懂，该怎么办？**
A：不是学得慢，是拿错了地图——28 章是 3A 团队的技术全景图，不是个人入门路径；第 2 章从「用户视角」断崖式切到「引擎实现者视角」，且全书强依赖链导致后面全悬空。学习者的 Unity/Puerts/UI 背景恰好避开了「对象/内存模型」这一层。四块真实缺口：对象/内存模型、编译工具链、Gameplay Framework 职责地图、UE 风味 C++ 最小集。建议把书当字典、练习工程当练习场、公司项目当真实案例、AI 当解释器；按目标重排后只需约 9–11 章；先做作品，别读完 28 章。

**Q2：能否把网站知识 + 公司项目代码结合，用真实代码解释名词，并把 Puerts 原理弄透？**
A：可行且优于模板——Puerts 全部架在 UE 反射之上，追到底自然撞上 ch02/ch04。前提：① 只给内部 agent 与内部模型（Q3 已确认，故本版移除合规边界）；② 商业代码是「结果」不是「教材」，必须教程出题 → 项目给答案；③ 不能假设 agent 能联网，故 28 章地图自包含。战略修正：Puerts 是入口与差异化钥匙，不是终局定位；对外表述落在 UE 原生原理，主菜仍是 Gameplay Framework + 3C + C++ + 网络，否则容易被归类为脚本/UI 岗。当前工作区只有 UE 5.8 模板工程，无 Puerts、无 `.ts`，故文档不编造项目结构，改为要求 Agent 先勘察、填表、经学习者确认后再开讲。

**Q3：合规边界去掉；章节结合补全，因为计算机图形学也想了解。**
A：已移除全部合规条款（运行环境与模型均在公司内部，Agent 可直接读项目代码库）。章节结合升级：4.2 表覆盖**全 28 章**并新增「项目里找什么」列；补读 ch14–18 后把表现卷从「跳过」升级为**图形学主线 B**，含 4.5 一帧账单全景、7.2 勘察表、7.3 十二问、7.5 实验清单；5.2 名词表新增 B 组约 30 个图形学名词；0.4 勘察项从 12 扩到 20（加渲染开关、画质分档、材质、灯光后处理、Niagara、World Partition/PCG、性能资产、Sequencer/镜头）。最关键的是 **7.4「两条主线的交汇点」**：画质档、材质参数、Niagara User 参数、后处理、灯光属性都是脚本层经反射碰得到的对象，把 Puerts 与图形学焊在一起；收口题是「改阴影质量从 TS 事件到 GPU Pass 数字变化的完整链路」。图形学的边界仍写清：目标不是转图形程序，不写 shader、不逐行读渲染源码，而是能读懂账单、参与取舍、和 TA 对话。
