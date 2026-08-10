---
title: "MutualAidStationSystem_架构说明书"
date: 2026-08-06 17:59:58
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
---
# 互助站订单系统（MutualAidStationSystem）架构说明书

> 文档定位：系统级说明书，覆盖前后台交互、数据模型、结构分层、核心流程、改进建议、面试准备。
> 代码真相源：`Plugins/GameFeatures/TKPartyGameSystem/TypeScript/Modules/DailyOrder/System/MutualAidStationSystem.ts`（~1300 行）

---

## 目录

1. [系统概述](#1-系统概述)
2. [系统结构设计](#2-系统结构设计)
3. [数据模型设计](#3-数据模型设计)
4. [前后台交互设计](#4-前后台交互设计)
5. [核心流程图](#5-核心流程图)
6. [定时器与时间管理](#6-定时器与时间管理)
7. [系统不足与改造建议](#7-系统不足与改造建议)
8. [面试准备模块](#8-面试准备模块)

---

## 1. 系统概述

### 1.1 业务定位

互助站是家园玩法中的**每日订单委托系统**。玩家在家园中建造"互助站"家具（ItemId=900215）后解锁功能，每天获得一批 NPC 订单委托，通过提交指定材料完成任务获取奖励。

### 1.2 核心功能清单

| 功能域    | 说明                                 |
| ------ | ---------------------------------- |
| 订单展示   | 列表展示当日所有订单委托（星级、NPC、解锁条件、提交材料、奖励）  |
| 订单提交   | 支持 Fixed（固定材料）和 Custom（自选材料）两种提交模式 |
| 订单刷新   | 单个订单手动刷新（服务端控制刷新次数上限）              |
| 每日自动刷新 | 每天 0 点自动刷新全部订单                     |
| 倒计时    | 刷新冷却倒计时 + 次日刷新倒计时                  |
| 新手订单   | 首次进入有一组新手引导订单，完成后转入正常订单            |
| 额外奖励   | 根据额外奖励档次（1-4 级）发放额外奖励，有领取次数限制      |
| 解锁检测   | 通过本地建筑数据检测功能是否解锁                   |
| 双入口    | 2D HUD 按钮 + 3D 建筑交互均可打开互助站界面       |

### 1.3 技术栈

- **语言**：TypeScript（Puerts 运行于 UE5）
- **架构模式**：MVVM（Model-View-ViewComponent）+ 依赖注入（IocContainer）
- **响应式**：`@framework/Core/Observable/Observable`（`observable()` 包装）
- **网络层**：GS 协议（ProtoBuf `SOCClient`）+ DS RPC（`TS_MediatorComponent`）
- **UI 框架**：WindowController + ViewComponent + BindWidget

---

## 2. 系统结构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────┐
│                     UI Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  HUD 入口     │  │  主窗口       │  │  详情面板  │ │
│  │  Hearthbound  │  │  MutualAid    │  │  Entrust  │ │
│  │  HUDViewComp  │  │  StationWin   │  │  Detail   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │        │
│  ┌──────┴─────────────────┴─────────────────┴─────┐ │
│  │              ViewComponent Layer                │ │
│  │  EntrustViewComp | CustomSelectionViewComp      │ │
│  │  OrderNotifyComp | FlyFXComp                    │ │
│  └──────────────────────┬─────────────────────────┘ │
│                         │ observe / event            │
├─────────────────────────┼───────────────────────────┤
│                    System Layer                       │
│  ┌──────────────────────────────────────────────┐    │
│  │         MutualAidStationSystem                │    │
│  │  (FeatureSystemBase, IMutualAidStationSystem) │    │
│  │                                               │    │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │    │
│  │  │ Model   │ │ Network  │ │ Timer Manager │  │    │
│  │  │ 管理     │ │ 通信     │ │ 定时器管理     │  │    │
│  │  └─────────┘ └──────────┘ └───────────────┘  │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────┴──────────────────────────┐    │
│  │           依赖系统 (DI)                      │    │
│  │  StorageBoxSys | ItemSystem | PlayerInfo    │    │
│  │  LocationSys | DataCenter | WwiseSound      │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│                  Network / Protocol Layer            │
│  ┌────────────────┐    ┌────────────────────────┐   │
│  │  GS 协议 (PB)   │    │  DS RPC (Mediator)     │   │
│  │  SOCClient     │    │  TS_MediatorComponent  │   │
│  └────────────────┘    └────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 类关系

```
IMutualAidStationSystem (接口)
    ▲
    │ implements
    │
MutualAidStationSystem (extends FeatureSystemBase)
    │
    ├── Model: MutualAidStationModel (observable)
    │       └── entrusts: MutualAidStationEntrust[]
    │
    ├── UI 管理方法
    │   ├── generateMutualAidStationWindow()        → MutualAidStationWindowController
    │   ├── generateMutualAidStationCustomSelectionWindow()
    │   └── generateExplainWindow()
    │
    ├── 网络方法
    │   ├── requestAllData()           → GS: E_SVR_MSG_ID_DAILY_ORDER_GET_INFO
    │   ├── requestMutualAidStationRefresh() → GS: E_SVR_MSG_ID_DAILY_ORDER_REFRESH
    │   ├── onRequsetSubmitEntrustViaDS()  → DS: FinishMutualAidStationEntrust
    │   └── onMutualAidStationEntrustsChanged() ← GS push: E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE
    │
    └── 定时器
        ├── generateNextDayUpdateEntrustTimer()  (每 10s 轮询 → 0 点触发)
        └── _midnightRequestTimer (重试机制)
```

### 2.3 事件通信

系统通过**全局事件总线**进行模块间通信，不直接持有 UI 引用：

| 事件名                                           | 方向          | 说明                                        |
| --------------------------------------------- | ----------- | ----------------------------------------- |
| `ModelUpdate`                                 | System → UI | Model 数据更新通知，携带 `needImmediateRefresh` 标志 |
| `RefreshSelect`                               | UI → 全局     | 请求重新选中当前订单（倒计时结束/刷新后）                     |
| `TKPGOrderComplete`                           | System → 全局 | 订单提交完成通知                                  |
| `TKPGOrderNewBieOrderComplete`                | System → 全局 | 新手订单全部完成通知                                |
| `PreLoadLevel`                                | 框架 → System | 关卡切换前关闭界面                                 |
| `E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE` | GS → Client | 服务端推送订单状态变更                               |

---

## 3. 数据模型设计

### 3.1 核心数据结构

```typescript
// 顶层 Model
interface MutualAidStationModel {
    entrusts: MutualAidStationEntrust[];    // 订单委托列表
    isUnlocked: boolean;                     // 功能是否解锁
    isCompletedNewbieEntrusts: boolean;      // 新手订单是否全部完成
    isDailyRefreshUpper: boolean;            // 今日刷新次数是否达上限
    extraRewardCount: number;                // 已领取额外奖励次数
    extraRewardLimit: number;                // 额外奖励次数上限
    extraRewardGrade: number;                // 额外奖励档次 (1-4)
}

// 单个订单委托
interface MutualAidStationEntrust {
    npcId: number;                    // NPC ID
    index: number;                    // 订单索引（列表位置）
    conditionId: number;              // 条件配置 ID
    star: number;                     // 星级 (1-3)
    unlockCondition: {                // 解锁条件
        key: EMutualAidStationEntrustUnlockCondition;  // 条件类型
        value: number;                // 条件值（如等级）
    };
    submit: {                         // 提交配置
        type: EMutualAidStationEntrustSubmitType;  // Fixed(1) | Custom(2)
        SpecifyItemAndCount?: TWarehouseItem[];    // Fixed: 指定物品+数量
        SpecifyItemIds?: number[];                 // Custom: 可选物品ID白名单
        TotalNumber?: number;                      // Custom: 总需求数量
    };
    preStatus: E_DAILY_ORDER_STATE;   // 前一次状态（用于状态机过渡动画）
    status: E_DAILY_ORDER_STATE;      // 当前状态
    countdown: number;                // 倒计时（秒）
    endtime: bigint;                  // 结束时间戳
    materials: TKPGPropGetItemData[]; // 需要的材料列表（含持有量）
    rewards: MutualAidStationEntrustAward[];  // 奖励列表
    isNewBieEntrust: boolean;         // 是否新手订单
}

// 奖励
interface MutualAidStationEntrustAward extends TKPGPropGetItemData {
    isExtra: boolean;  // 是否额外奖励
}
```

### 3.2 订单状态机

```
E_DAILY_ORDER_STATE（服务端枚举，客户端镜像）

┌──────────────┐     满足解锁条件     ┌──────────────┐
│  LOCK_OF_     │ ──────────────────► │  RUNNING     │
│  NEWBIE       │                     │              │
│ (新手锁定)     │                     │  (可提交/    │
└──────────────┘                     │   刷新冷却中) │
                                     └──────┬───────┘
┌──────────────┐     满足等级条件        │     刷新冷却到期
│  LOCK_OF_     │ ──────────────────►    │
│  LEVEL        │                        │
│ (等级锁定)     │                        ▼
└──────────────┘                  ┌──────────────┐
                                  │  NO_REMAINING │
                                  │ (今日已无剩余  │
                                  │  次数)        │
                                  └──────────────┘
                                         │
                                   次日0点刷新
                                         │
                                         ▼
                                  回到 RUNNING / LOCK_*
```

### 3.3 提交类型设计

| 类型         | 枚举值 | 说明     | 客户端传参    | 服务端校验                                     |
| ---------- | --- | ------ | -------- | ----------------------------------------- |
| **Fixed**  | 1   | 固定材料提交 | 不传 items | DS 读表 `vecItem` 自行扣材料                     |
| **Custom** | 2   | 自选材料提交 | 传玩家自选清单  | DS 按 `vecItemID` 白名单 + `iTotalItemNum` 校验 |

> 设计意图：Fixed 模式不传材料清单，省协议字节 + 防篡改；Custom 模式客户端传自选，服务端白名单校验。

### 3.4 额外奖励档次设计

```
extraRewardGrade (1-4)
  │
  ├── 基础奖励：condition.vecBaseRewardItem（所有档次都有）
  │
  └── 额外奖励：按 grade 读取不同字段
      ├── grade=1 → condition.vecExtraRewardItemOne
      ├── grade=2 → condition.vecExtraRewardItemTwo
      ├── grade=3 → condition.vecExtraRewardItemThree
      └── grade=4 → condition.vecExtraRewardItemFour (金级，触发专属音效)
```

---

## 4. 前后台交互设计

### 4.1 协议总览

| 方向     | 协议                                            | 用途          | 通道              |
| ------ | --------------------------------------------- | ----------- | --------------- |
| C → GS | `E_SVR_MSG_ID_DAILY_ORDER_GET_INFO`           | 拉取全部订单数据    | GS ProtoBuf     |
| C → GS | `E_SVR_MSG_ID_DAILY_ORDER_REFRESH`            | 手动刷新单个订单    | GS ProtoBuf     |
| C → DS | `FinishMutualAidStationEntrust`               | 提交订单（双重扣材料） | DS Mediator RPC |
| GS → C | `E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE` | 服务端推送订单状态变更 | GS Push         |

### 4.2 数据拉取流程

```
客户端                          GS 服务端
  │                               │
  │  TDailyOrderGetInfoReq        │
  │  { lUid }                     │
  ├──────────────────────────────►│
  │                               │
  │  TDailyOrderGetInfoRsp        │
  │  { vecDailyOrder[]            │
  │    bNewbieOrderAllFinished    │
  │    bRefreshLimitReached       │
  │    iDailyRewardNum            │
  │    iExtraRewardMaxNum         │
  │    iExtraRewardGrade }        │
  │◄──────────────────────────────┤
  │                               │
  │  generateModel()              │
  │  ├── 更新 Model 各字段         │
  │  ├── generateEntrust() 逐条   │
  │  │   构建本地 Entrust 对象     │
  │  ├── generateRewards()        │
  │  │   （含额外奖励档次逻辑）     │
  │  ├── generateMaterials()      │
  │  │   （Fixed/Custom 分流）     │
  │  └── trigger(ModelUpdate)     │
  │      → UI 响应式刷新           │
```

### 4.3 订单提交流程（DS 双重扣材料）

这是系统中最复杂的交互链路：

```
玩家点击提交
    │
    ▼
onRequsetSubmitEntrust(index, items?)
    │
    ├── Fixed 模式：items 不传（空数组）
    │   DS 自行读表 vecItem 扣材料
    │
    └── Custom 模式：items = 玩家自选清单
        DS 按 vecItemID 白名单 + TotalNumber 校验
    │
    ▼
onRequsetSubmitEntrustViaDS(index, items)
    │
    │  FinishMutualAidStationEntrustParams
    │  { iOrderConditionID, items[] }
    │
    ├── Mediator → DS StorageBoxDSSystem.finishMutualAidStationEntrust
    │   │
    │   ├── Step 1: 双重扣材料
    │   │   背包优先扣 → 不足部分扣存储设施
    │   │
    │   ├── Step 2: DS 向 GS 发 E_SVR_MSG_ID_DAILY_ORDER_FINISH_CONDITION_DS
    │   │
    │   └── Step 3: GS 处理奖励发放
    │       └── GS 通过 NOTIFY_INFO_CHANGE 推送订单状态更新
    │
    ▼
ret.retCode == Success?
    │
    ├── Yes → trigger(TKPGOrderComplete) + trigger(RefreshSelect)
    │          打开经验条界面
    │
    └── No  → LoggerUtils.error，返回 false
    │
    ▼
GS Push: E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE
    │
    └── onMutualAidStationEntrustsChanged()
        逐条更新 Model.entrusts → trigger(ModelUpdate) → UI 刷新
```

**设计要点**：
- 提交走 DS 而非直接 GS，利用 DS 的存储设施管理能力实现"双重扣材料"（背包优先 + 存储设施兜底）
- Fixed 模式不传材料清单，防篡改 + 省带宽
- 提交成功后不立即刷新 Model，而是等 GS Push `NOTIFY_INFO_CHANGE` 来更新，保证服务端权威

### 4.4 手动刷新流程

```
玩家点击刷新按钮
    │
    ▼
onRequstRefreshEntrust(index)
    │
    │  TDailyOrderRefreshReq { iIndex }
    │
    ▼
GS: E_SVR_MSG_ID_DAILY_ORDER_REFRESH
    │
    ▼
TDailyOrderRefreshRsp { stDailyOrder }
    │
    ▼
generateEntrust(response.data.stDailyOrder)
    │  用返回的新订单数据替换本地对应 index 的 entrust
    │
    ▼
trigger(RefreshSelect) → UI 重新选中
```

> 注意：手动刷新只替换单条订单数据，不触发全量 `ModelUpdate`。

### 4.5 服务端推送更新

```
GS Server
    │
    │  E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE
    │  ( EventType.Net，由框架自动派发 )
    │
    ▼
onMutualAidStationEntrustsChanged(data)
    │
    ├── 更新 isDailyRefreshUpper / extraRewardCount / extraRewardLimit / extraRewardGrade
    ├── 新手订单完成检测 → trigger(TKPGOrderNewBieOrderComplete)
    ├── 逐条更新 entrusts：
    │   ├── status / preStatus 状态迁移
    │   ├── endtime（NO_REMAINING 用次日刷新时间，否则用服务端时间戳）
    │   ├── generateMaterials() + generateRewards() 重建材料和奖励
    │   └── Fixed 模式重新查询本地持有量
    ├── TodayAllFinish 检测 → 播放完成音效
    └── trigger(ModelUpdate) → UI 刷新
```

---

## 5. 核心流程图

### 5.1 系统初始化流程

```
MutualAidStationSystem 生命周期
═══════════════════════════════

init()
  │
  ├── 初始化 _mutualAidStationMessages (Toast 文案表)
  ├── 创建 _mutualAidStationModel (observable)
  │   └── entrusts: [], isUnlocked: false, ...
  └── initModel()  ← 清空/重置 Model 到初始状态
      ├── destroyNextDayUpdateEntrustTimer()
      └── destroyMidnightRequestTimer()

enter()
  │
  ├── onRegisterCmd()  ← 注册 GM 调试命令
  └── (generateModel 注释掉了，延迟到首次打开界面时拉取)

getEventConfigs()
  ├── 注册 E_SVR_MSG_ID_DAILY_ORDER_NOTIFY_INFO_CHANGE 监听
  └── 注册 PreLoadLevel 监听

═══════════════════════════════
首次打开界面时
═══════════════════════════════
onOrderClick() / onFollowInteractPressed()
  │
  ├── reqRefreshMutalAidData()
  │   └── generateModel()
  │       ├── generateNextDayUpdateEntrustTimer()  ← 启动每日刷新定时器
  │       ├── requestAllData()  → GS 拉取数据
  │       ├── 更新 Model 各字段
  │       ├── 逐条 generateEntrust() 构建本地数据
  │       └── trigger(ModelUpdate, needImmediateRefresh=true)
  │
  └── generateMutualAidStationWindow()
      └── 检查 isUnlocked → 打开/弹 Toast
```

### 5.2 每日自动刷新流程（午夜轮询机制）

```
generateNextDayUpdateEntrustTimer()
  │
  │  每 10 秒轮询一次（setInterval 10000ms）
  │
  ▼
timemout()  (每 10s 执行)
  │
  ├── getNextDayUpdateEntrustTime()  ← 计算距次日 0 点的秒数
  │
  └── time < 10 ?  ← 距 0 点不足 10 秒
      │
      ├── Yes: 销毁轮询 timer
      │        延迟 MIDNIGHT_DELAY_S(3s) 后发请求
      │        （等服务端完成数据切换）
      │   │
      │   ▼
      │   doRequest()  (async)
      │   ├── 记录 preSig（当前订单签名：npcId:index:conditionId）
      │   ├── generateModel()  ← 全量拉取
      │   ├── 记录 postSig
      │   ├── preSig !== postSig ?
      │   │   ├── Yes: 数据已变更 → 弹 Toast "今日订单已刷新"
      │   │   │        重置重试计数
      │   │   └── No: 数据未变更
      │   │       ├── retryCount < 6 ? → 3s 后重试
      │   │       └── retryCount >= 6 ? → 放弃，日志记录
      │   │
      │   └── 数据变更后重新启动轮询 timer（在 generateModel 内）
      │
      └── No: 继续轮询

重试参数：
  MIDNIGHT_DELAY_S = 3s       0 点后延迟 3 秒再请求
  MIDNIGHT_RETRY_MAX = 6      最多重试 6 次
  MIDNIGHT_RETRY_INTERVAL_MS = 3000  每次重试间隔 3 秒
```

### 5.3 倒计时管理流程

倒计时分为两个层次：**System 层**计算 + **UI 层**本地递减。

```
System 层：getCountDownWithEndTime(entrust)
  │
  ├── status == NO_REMAINING ?
  │   └── Yes: 计算到次日 DAILY_REFRESH_HOUR(0点) 的秒数
  │            （用本地时间 Date.now() 计算）
  │
  └── 否则: (endtime - localTime/1000)
            endtime 来自服务端 lRefreshEndTime 时间戳

UI 层：MutualAidStationEntrustViewComponent
  │
  └── observe(() => {
        if (item.endtime > 0) {
          localCountDown = system.getCountDownWithEndTime(item)  ← 初始值
          setInterval(1000ms) {
            localCountDown -= 1  ← 本地每秒递减
            if (localCountDown <= 1) {
              trigger(RefreshSelect)  ← 通知刷新选中
              item.endtime = 0n       ← 清零结束时间
              clearTimer()
              if (isRefreshing) onRefreshComplete()
            }
          }
        }
      })
```

### 5.4 解锁检测流程

```
checkifOrderUnlock()
  │
  ├── 获取 HeartboundLocationSystem
  ├── locationSys.getPlayerLandActor()
  │   └── 如果 landMap 为空会触发 reinit → LandInfoReady 事件
  ├── 检查 landActor.BuiltItemArray.Datas
  │   └── 遍历查找 ItemID == 900215 (互助站家具)
  └── 找到 → return true (已解锁)
      未找到 → return false (未解锁)

调用时机：
  ├── generateModel() 中更新 model.isUnlocked
  └── generateMutualAidStationWindow() 中作为开门判断
```

### 5.5 完整状态流转图

```
                    ┌──────────────────────────────────────────┐
                    │            玩家进入家园                    │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │     HUD 检测解锁 (checkMutualAidStation    │
                    │     Unlock via RPC)                       │
                    │     orderUnlock = true                    │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │     点击 HUD 按钮 / 3D 建筑交互            │
                    │     reqRefreshMutalAidData()              │
                    │     → generateModel()                     │
                    │     → 打开 MutualAidStationWindow         │
                    └──────────────────┬───────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼────────┐
     │  查看订单详情    │    │  提交订单           │    │  刷新订单         │
     │  (选中列表项)    │    │  onRequsetSubmit   │    │  onRequstRefresh │
     └────────┬────────┘    │  Entrust()         │    │  Entrust()       │
              │             └─────────┬─────────┘    └─────────┬────────┘
              │                       │                        │
              │              ┌────────▼────────┐    ┌──────────▼──────────┐
              │              │  DS 双重扣材料    │    │  GS 刷新单条订单     │
              │              │  → GS 发奖       │    │  → 替换本地 entrust │
              │              └────────┬────────┘    └──────────┬──────────┘
              │                       │                        │
              │              ┌────────▼────────────────────────▼──────────┐
              │              │     GS Push: NOTIFY_INFO_CHANGE             │
              │              │     onMutualAidStationEntrustsChanged()     │
              │              │     → 逐条更新 Model                        │
              │              │     → trigger(ModelUpdate)                  │
              │              └────────────────────┬───────────────────────┘
              │                                   │
              │              ┌────────────────────▼───────────────────────┐
              │              │     UI 响应式刷新                            │
              │              │     (observe → bindWidget → UMG 刷新)       │
              │              └────────────────────────────────────────────┘
              │
     ┌────────▼────────┐
     │  倒计时展示      │
     │  System 算初始值  │
     │  UI 每秒递减      │
     │  到 0 → Refresh   │
     └─────────────────┘
```

---

## 6. 定时器与时间管理

### 6.1 定时器清单

| 定时器                                              | 类型          | 间隔            | 用途            |
| ------------------------------------------------ | ----------- | ------------- | ------------- |
| `_nextDayUpdateEntrustsTimer`                    | setInterval | 10000ms (10s) | 轮询检测是否接近 0 点  |
| `_midnightRequestTimer`                          | setTimeout  | 动态            | 0 点后延迟请求 + 重试 |
| `RefreshShowTimer` (UI 层)                        | setInterval | 1000ms (1s)   | 订单倒计时本地递减     |
| `checkCouldSubMitInterval` (TS_MutualAidStation) | setInterval | 2000ms (2s)   | 3D 建筑可提交状态检测  |

### 6.2 时间源

| 方法                              | 返回值         | 来源                     | 用途          |
| ------------------------------- | ----------- | ---------------------- | ----------- |
| `getServerTime()`               | bigint (毫秒) | `TimeSyncServerSystem` | 日志/参考       |
| `getLocalTime()`                | number (毫秒) | `Date.now()`           | **实际倒计时计算** |
| `getNextDayUpdateEntrustTime()` | number (秒)  | 本地时间计算距次日 0 点          | 每日刷新定时器     |

> ⚠️ 注意：倒计时实际使用**本地时间** `Date.now()` 计算，而非服务器同步时间。`getServerTime()` 虽然存在但仅用于日志。这会导致客户端时间不准时倒计时偏差。

### 6.3 午夜刷新重试机制

设计目的：0 点时刻服务端可能尚未完成数据切换，客户端需要**轮询重试**直到数据真正变更。

```
0 点前 10 秒内
  │
  ├── 销毁 10s 轮询 timer
  ├── 延迟 3s（等服务端切换）
  │
  └── 首次请求 generateModel()
      │
      ├── 数据签名变化（npcId:index:conditionId）？
      │   ├── 变了 → 成功，弹 Toast，重置计数
      │   └── 没变 → 重试
      │       ├── retryCount < 6 → 3s 后重试
      │       └── retryCount >= 6 → 放弃
      │
      └── 成功后 generateModel 内会重新启动 10s 轮询 timer
```

---

## 7. 系统不足与改造建议

### 7.1 架构层面

| #   | 问题                             | 影响                                                                                                       | 改进建议                                               |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A1  | **Model 初始为空，首次打开才拉取数据**       | `enter()` 中 `generateModel()` 被注释，首次打开界面时才拉数据，存在等待延迟                                                     | 在 `enter()` 或场景就绪时预拉取，打开界面时直接展示                    |
| A2  | **解锁检测双轨制不一致**                 | HUD 用 RPC `getBuildedCountByItemID` 查解锁，System 用本地 `landActor.BuiltItemArray` 查解锁，两个途径可能不同步（断线重连 bug 根因） | 统一解锁检测入口，或 HUD 直接调用 `checkifOrderUnlock()`         |
| A3  | **无断线重连恢复机制**                  | `MutualAidStationSystem` 没有实现 `onReconnectSuccess`，重连后 Model 可能脏数据                                       | 增加 `onReconnectSuccess` 回调，重连后重新 `generateModel()` |
| A4  | **`generateModel` 被多处调用但无防重入** | 快速双击入口可能并发拉取                                                                                             | 增加 `_isLoading` 标志位防重入                             |

### 7.2 数据层面

| #   | 问题                                                             | 影响                                             | 改进建议                                                                 |
| --- | -------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| B1  | **倒计时用本地时间而非服务器时间**                                            | 客户端改系统时间可绕过冷却                                  | 倒计时计算应使用 `getServerTime()` 而非 `getLocalTime()`                       |
| B2  | **`initModel` 手动逐字段清零**                                        | 新增字段容易遗漏清理，代码冗长                                | 直接重建 observable 对象 `this._mutualAidStationModel = observable({...})` |
| B3  | **`onMutualAidStationEntrustsChanged` 与 `generateModel` 逻辑重复** | 两个方法都有"逐条构建 entrust"的逻辑，维护时容易不同步               | 提取公共的 `applyServerData(data)` 方法                                     |
| B4  | **`forceUpdateItemData` 中 `items.concat` 未赋值**                 | `concat` 返回新数组不修改原数组，Custom 模式物品 ID 实际没被加入查询列表 | 改为 `items.push(...entrust.submit.SpecifyItemIds)`                    |

### 7.3 时间管理

| #   | 问题                                            | 影响                                                                                | 改进建议                              |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| C1  | **每日刷新时刻硬编码**                                 | `DAILY_REFRESH_HOUR = 0` 写死在代码中，无法配置化                                             | 移到配置表或全局常量配置                      |
| C2  | **10 秒轮询检测 0 点**                              | 每 10 秒唤醒一次 timer，虽轻量但不优雅                                                          | 改为 `setTimeout` 精确计算到 0 点的延时，一次触发 |
| C3  | **`getCountDownWithEndTime` 中 endtime 单位不一致** | `endtime` 是 bigint 时间戳，计算时 `Number(entrust.endtime) - CurTime/1000`，毫秒/秒混用容易出 bug | 统一用秒级或毫秒级，添加单位注释                  |

### 7.4 代码质量

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| D1 | 拼写错误 | `onRequsetSubmitEntrust`（Request 少了 `s`）、`reqRefreshMutalAidData`（Mutual 少了 `u`）、`DoesMutalAtdDataExit`（多处） | 统一修正（需全量替换调用方） |
| D2 | 注释掉的代码未清理 | `onRequstRefreshEntrust` 中大段注释、`generateModel` 中注释掉的 `generateNextEntrustTimer` | 清理无用注释 |
| D3 | `StorageBoxSys` getter 每次都重新 get | 第 142-145 行，每次访问都调用 `Framework.getIocContainer().get()` | 缓存到字段，初始化时注入 |
| D4 | Toast 文案硬编码中英文混合 | `init` 中部分文案中文硬编码，部分走 `getTextByID` | 统一走多语言 `getTextByID` |

### 7.5 已知 Bug 风险

| # | 风险 | 根因 |
|---|---|---|
| E1 | 断线重连后 HUD 入口按钮消失 | HUD 的 `orderUnlock` 通过 RPC 查询，重连过程中 RPC 可能失败 → `orderUnlock=false`，且无 `ReconnectSuccess` 恢复机制（详见前序分析） |
| E2 | 客户端改时间绕过冷却 | 倒计时依赖 `Date.now()` 本地时间 |
| E3 | 午夜刷新重试期间用户操作可能拿到旧数据 | 重试期间 Model 还是旧的，但 UI 正常展示 |
| E4 | `requestMutualAidStationRefresh` 返回值 `result` 未使用 | 第 777 行 `result` 赋值后直接 return，未做失败处理 |

---

## 8. 面试准备模块

### 8.1 30 秒电梯介绍（话术模板）

> "我负责的是家园玩法中的互助站订单系统。这是一个每日订单委托玩法，玩家建造互助站建筑后解锁，每天获得一批 NPC 订单，通过提交材料获取奖励。
>
> 系统分三层：UI 层用 MVVM 响应式绑定，System 层管理 Model 生命周期和网络通信，底层走 GS ProtoBuf + DS Mediator 双通道。技术上比较有亮点的三个设计：一是提交订单走 DS 双重扣材料（背包优先 + 存储设施兜底），Fixed 模式不传材料清单防篡改；二是午夜刷新有重试轮询机制，用数据签名比对判断服务端是否完成切换，最多重试 6 次；三是订单状态机支持 5 种状态的流转，包括新手锁定、等级锁定、运行中、无剩余等。
>
> 系统目前已知的一个问题是断线重连后 HUD 入口按钮可能消失，根因是解锁检测走了两条不同路径且没有重连恢复机制，这是我在排查实际 bug 时定位到的。"

### 8.2 高频面试问题与回答要点

#### Q1: 为什么要走 DS 双重扣材料，不直接走 GS？

**回答要点**：
- GS 只管背包，不直接管存储设施（StorageBox 是 DS 侧的实体建筑系统）
- 订单材料可能来自背包也可能来自存储设施，需要 DS 统一调度
- DS 扣完材料后向 GS 发完成通知，GS 负责发奖和推订单状态更新
- 这是职责分离：DS 管物理物品操作，GS 管业务逻辑和奖励

#### Q2: Fixed 和 Custom 两种提交模式有什么区别？为什么 Fixed 不传 items？

**回答要点**：
- Fixed：服务端配置表指定了具体物品和数量，客户端不需要传，DS 自己读表扣。好处：省带宽 + 防篡改
- Custom：玩家从白名单中自选物品提交，客户端必须传选择清单，DS 按 `vecItemID` 白名单 + `TotalNumber` 校验
- 这是安全性和灵活性的权衡

#### Q3: 每日刷新是怎么实现的？为什么不直接用定时任务？

**回答要点**：
- 用 10 秒轮询检测是否接近 0 点，接近后切换到延迟+重试模式
- 不直接用 `setTimeout` 到 0 点是因为：客户端运行时长可能导致 timer 漂移，且 0 点时刻服务端可能还没切换完数据
- 重试机制：首次延迟 3 秒，之后每 3 秒重试一次，最多 6 次。用 `npcId:index:conditionId` 三元组签名比对数据是否真正变更
- 如果数据没变说明服务端还没切完，重试；变了就成功

#### Q4: 响应式系统是怎么工作的？Model 更新后 UI 怎么刷新？

**回答要点**：
- Model 用 `observable()` 包装，UI 的 `bindWidget` 的 getter 中访问 Model 属性会建立依赖追踪
- Model 属性变更时，依赖该属性的 getter 会被重新调用，UMG Widget 属性更新
- 系统通过事件总线 `triggerEvent(ModelUpdate)` 通知 UI 做额外的命令式刷新（如列表重建）
- 两层机制互补：响应式处理属性级刷新，事件处理结构级刷新

#### Q5: 断线重连后按钮消失的 bug 你是怎么排查的？

**回答要点**：
- 从 UI 可见性条件入手：`isInHearthWorld() && orderUnlock`
- 排除 `isInHearthWorld()`（打开界面不会改变世界状态），锁定 `orderUnlock`
- 追踪 `orderUnlock` 赋值链：只有 `checkMutualAidStationUnlock` 方法，依赖 RPC
- RPC 在重连过程中网络未恢复时失败 → `orderUnlock = false`
- `onReconnectStart` 只重置了 `buildBtnShow` 和 `isOnOwnedLandActor`，漏了 `orderUnlock`
- 没有注册 `ReconnectSuccess` 回调来恢复
- 修复方向：重连成功后重新调用 `checkMutualAidStationUnlock`

#### Q6: 如果让你重新设计这个系统，你会怎么改？

**回答要点**：
- **时间管理**：倒计时统一用服务器时间，避免客户端改时间绕过
- **解锁检测**：统一入口，HUD 和 System 共用一个检测方法，避免双轨制不同步
- **重连恢复**：实现 `onReconnectSuccess`，重连后全量刷新 Model
- **轮询优化**：去掉 10 秒轮询，改用精确 `setTimeout` 到 0 点
- **数据构建**：提取公共 `applyServerData` 方法，消除 `generateModel` 和 `onMutualAidStationEntrustsChanged` 的重复逻辑
- **配置化**：每日刷新时刻移到配置表

#### Q7: 这个系统有哪些状态？状态怎么流转？

**回答要点**：
- 5 种状态：`INIT`（初始）、`LOCK_OF_NEWBIE`（新手锁定）、`LOCK_OF_LEVEL`（等级锁定）、`RUNNING`（运行中，可提交/冷却中）、`NO_REMAINING`（今日已无剩余次数）
- 流转路径：
  - `LOCK_OF_NEWBIE` → 新手订单全完成 → `RUNNING`
  - `LOCK_OF_LEVEL` → 愉悦等级达标 → `RUNNING`
  - `RUNNING` → 提交完成或刷新次数耗尽 → `NO_REMAINING`
  - `NO_REMAINING` → 次日 0 点刷新 → `RUNNING` 或 `LOCK_*`
- `preStatus` 字段记录前一次状态，用于 UI 播放状态过渡动画

#### Q8: 系统的网络安全设计有什么考虑？

**回答要点**：
- Fixed 模式不传材料清单，服务端自行读表扣材料，客户端无法伪造
- Custom 模式传自选清单，但 DS 侧有白名单校验（`vecItemID`）+ 总量校验（`TotalNumber`）
- 扣材料在 DS 侧完成（权威），GS 只负责发奖和状态更新
- 订单状态以 GS Push `NOTIFY_INFO_CHANGE` 为准，客户端不自行推断提交后的状态

### 8.3 面试加分项

如果面试官对以下话题感兴趣，可以主动展开：

1. **MVVM 在 UE5 中的实践**：Puerts + TypeScript + observable 实现响应式 UI，与传统 UE 蓝图 UI 的区别
2. **GS/DS 双服务器架构**：GS 管业务逻辑，DS 管物理实体，互助站提交走 DS 是为了利用 DS 的存储设施管理能力
3. **跨系统通信**：通过事件总线解耦，System 不持有 UI 引用，UI 不直接发网络请求
4. **调试基建**：内置 GM 命令系统（`debugCreateModel`、`reqNewData` 等），支持运行时注入测试数据

### 8.4 面试避坑

- 不要只说"我写了这个系统"，要说出**设计决策的理由**（为什么走 DS、为什么不传 items、为什么用轮询）
- 被问到不足时，主动提断线重连 bug 和时间管理问题，展示批判性思维
- 不要回避"这系统有什么问题"的问题，前面 §7 列的不足都可以讲
- 如果面试官追问"并发问题"，可以提到 `bMutualAidStationChecking` 防重入标志（HUD 层）和 `isOrderClick` 防快速点击（UI 层）

---

> 本文档基于代码静态分析生成，如需验证具体实现请参照源文件行号锚点。
