---
title: "ARCHITECTURE"
date: 2026-08-17 18:01:21
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
---
# 个人信息系统数据源架构说明

> 本文档说明 `PlayerInfoSystem`（个人信息系统）的响应式数据源设计：为什么有 `data` 和 `model` 两个字段、如何正确读写、以及常见的误用点。适用于所有需要读写「当前登录玩家基础信息」（UID / 昵称 / 等级 / 头像 / 平台头像 url / 性别等）的 System 与 ViewComponent。

---

## 一、背景：为什么会有 `data` 和 `model` 两个字段

`PlayerInfoSystem` 是全局唯一的「当前玩家基础信息」数据源，注入后通过 `IPlayerInfoSystem` 接口访问。它内部维护两个视图：

```ts
export class PlayerDataModel {
    userinfo: UserInfo;   // 唯一数据字段
}

export class PlayerInfoSystem extends SubsystemBase implements IPlayerInfoSystem {
    private data: PlayerDataModel = { userinfo: { openclawAccessUrl: "" } };  // plain 初始对象（target）
    model: PlayerDataModel = observable(this.data);                            // data 的 Proxy（响应式入口）
}
```

两个字段的分工：

| 字段 | 性质 | 作用 | 可见性 |
|---|---|---|---|
| `data` | 普通 JS 对象 | 仅作为 `observable()` 的初始 target | **private，不对外暴露** |
| `model` | `data` 的 Proxy | 唯一的业务读写入口，读写时自动收集/触发响应式依赖 | **对外暴露** |

这是项目 2022 年就存在的约定模式（`BuildSystem` 等系统同款）。核心思想是：**对外只暴露 `model`，所有读写一律走 `model`**。

---

## 二、设计思想

### 1. 响应式原理

项目用 `@nx-js/observer-util` 的 `observable()`。它返回一个 Proxy：

- **读 `model.xxx`**：在 ViewComponent 的响应式 getter（`get xxx()`）执行期间，会被自动收集为依赖。
- **写 `model.xxx`**：触发所有依赖该字段的 getter 重新求值，实现 UI 自动刷新。

关键：**只有读 `model`（Proxy）才会建立依赖，读 `data`（plain 对象）不会。**

### 2. 为什么不能只保留 `data`

`observable()` 需要一个 plain object 作为 target；同时保留 `data` 作为 private 字段，是为了：

- 给 `observable()` 一个稳定的初始对象；
- 在需要绕过 Proxy 陷阱时（如 `JSON.stringify`、传给 C++ 层）能拿到原始值。

但业务代码**不应直接读 `data`** —— 那会绕开响应式链路，导致「改了数据但 UI 不刷新」。

### 3. 统一后的目标

**全局只有一个响应式数据源 `model`**：无论是 System（逻辑层）还是 ViewComponent（UI 层），读写都走 `model`，从而天然响应式。

---

## 三、使用方法

### 读（任意层）

```ts
// 注入个人信息系统（变量名可能不同，见「注意事项」）
@Inject(GAME_OBJECT_TYPES.PlayerInfoSystem)
private playerInfoSys: IPlayerInfoSystem;

// 读当前玩家信息
const uid   = this.playerInfoSys.model.userinfo.UID;          // 玩家 UID
const name  = this.playerInfoSys.model.userinfo.EName;        // 昵称
const icon  = this.playerInfoSys.model.userinfo.curPlayerIcon; // 头像 id
const url   = this.playerInfoSys.model.userinfo.strPlatformAvatarUrl; // 平台头像 url
```

### 写（逻辑层 System）

```ts
// 写 model，自动触发依赖该字段的 UI 刷新
this.playerInfoSys.model.userinfo.curPlayerIcon = headId;
this.playerInfoSys.model.userinfo.stlevel.UserLevel = newLevel;
```

### UI 响应式（ViewComponent）

在 ViewComponent 的 `bindComponent` getter 里**直接读 model 字段**即可建立依赖，无需任何手动刷新：

```ts
get headIcon(): UserHeadIconInfo {
    // getHeadIconInfoByUid 内部读 model.userinfo.curPlayerIcon，会自动建立响应式依赖
    return self.playerInfoSys.getHeadIconInfoByUid(context.currData.uid);
},
```

> 只要「写」和「读」都走 `model`，保存头像 / 升级后，所有依赖该字段的 UI 会自动刷新。

---

## 四、可能误用的地方（注意事项）

### 1. 不要读 `data`

`data` 已改为 **private**，接口 `IPlayerInfoSystem` 中已移除。任何 `xxx.data.userinfo` 都会编译报错 `Property 'data' does not exist on type 'IPlayerInfoSystem'`。这是刻意用编译器兜底，防止绕过响应式。

### 2. 不要用「非响应式写 + 手动事件」代替

旧代码的坏味道：

```ts
this.playerInfoSys.data.userinfo.curPlayerIcon = headId;      // ❌ 写 data，UI 不刷新
this.eventSys.triggerEvent(..., SelfPlayerInfoUpdate);        // ❌ 靠事件手动补偿
```

正确做法是直接写 `model`，不需要手动发事件（`SelfPlayerInfoUpdate` 事件目前仅 `TKPGChatMessageItemComponent` 仍在使用，属于聊天模块自己的逻辑）。

### 3. 变量名不统一（最容易踩的坑）

个人信息系统实例在项目里被命名为多个变量，改造时容易漏：

| 变量名 | 示例 |
|---|---|
| `playerInfoSys` | `this.playerInfoSys.model.userinfo.UID` |
| `loginPlayerInfoSys` | `this.loginPlayerInfoSys.model.userinfo.openclawAccessUrl` |
| `innerPlayerInfoSys` | `this.innerPlayerInfoSys.model.userinfo.UID` |
| `playerInfoSystem` | `self.playerInfoSystem?.model?.userinfo?.UID` |
| `playerInfo` | `playerInfo?.model?.userinfo?.UID` |
| 链式获取 | `Framework.getObject<IPlayerInfoSystem>(this, GAME_OBJECT_TYPES.PlayerInfoSystem).model.userinfo` |

> 搜索「个人信息系统 data 访问」时，务必覆盖 `playerInfo*` 全前缀 + `getObject<IPlayerInfoSystem>(...).data` 链式写法，以及 `?.data`（可选链）变体。全局只读 `model` 后，用 `grep -n "IPlayerInfoSystem" ` 配合 `.data` 反查即可确认无遗漏。

### 4. `model` 是 Proxy，注意这几个陷阱

- **`JSON.stringify(model)`**：直接序列化 Proxy 可能异常或行为不符合预期。需要序列化时，应针对具体字段取值，或先转成普通对象。
- **传给 C++/Puerts 层**：不要直接把 `model.userinfo`（Proxy 或含 Long）传给原生接口，应取具体基本类型字段（如 `Number(uid)`）。
- **`===` 比较引用**：`model.userinfo` 是 Proxy，不要拿它和 `data` 的原始对象做 `===` 比较。

### 5. 其他系统的 `data` 不是一回事

`context.playerInfo.data`（如房间邀请 `TKPGRoomInviteMultiMatchPanelViewComponent`）里的 `data` 是**该模块自己的字段**（`applyJoinCD`/`teamInfo`），与 `IPlayerInfoSystem` 无关。改造时不要误伤。

---

## 五、本次改动清单（data → model 统一）

| 层 | 文件 | 改动 |
|---|---|---|
| 真相源 | `PlayerSystem/PlayerInfoSystem.ts` | 接口删 `data`、`data` 改 private、`getOpenclawAccessUrl` 读 model |
| 上层系统 | `Modules/TikiStarPlayerInfoSystem/TikiStarPlayerInfoSystem.ts` | 6 处 `data` → `model`（含 `getUserInfo`/`getHeadIconInfoByUid` 读 + `onNetNotifySelfLevelChanged`/`reqSetSelfUserIcon` 写） |
| UI | `UI/TKPGPlayerInfoOverviewViewComponent.ts` | 删除 `void context.currData.headID` 响应式 hack |
| 误用点 | 全项目 25+ 文件 | `playerInfoSys/loginPlayerInfoSys/innerPlayerInfoSys/playerInfoSystem/playerInfo/getObject 链式` 的 `data` 全部改为 `model` |

改造后：头像、等级等个人信息字段的「写」和「读」全部走响应式 `model`，System 与 Component 统一一个数据源，UI 自动刷新。
