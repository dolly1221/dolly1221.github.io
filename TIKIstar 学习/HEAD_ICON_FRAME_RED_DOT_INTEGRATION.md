# 头像框红点对接说明（前端 → 后端）

> 文档目标：说明「头像框红点」前端已完成的改造，以及后端需要补的协议字段与下发逻辑。
> 适用范围：个人形象弹窗 `WB_HeadIconAppearancePanel`（头像 + 头像框两个 Tab）。
> 更新日期：2026-08-17

---

## 一、背景

个人形象设置界面已由主详情页内的「头像子页」重构为独立弹窗 `WB_HeadIconAppearancePanel`，内部用 `WidgetSwitcher` 切换两个 Tab：

| Tab | 内容 | 状态 |
|---|---|---|
| 头像（`HeadIcon`） | 平台头像 + 物品头像列表 | ✅ 已实现，红点已保留 |
| 头像框（`HeadIconFrame`） | 空 Tab，功能未做 | ⚠️ 骨架已就位，红点机制已预留 |

头像的「红点」功能沿用原逻辑已保留；头像框的红点**前端展示与清理机制已就位，但协议层后端尚未定义红点类型字段**，导致头像框红点目前不会亮。本文档给出后端需要补齐的部分。

---

## 二、现有红点机制速览（后端可据此对齐）

### 2.1 红点类型枚举

协议枚举 `E_RED_POINT_TYPE`（`MainBundleScripts/Protocol/ProtoJS/SOCClientBase.d.ts:136564`）：

```ts
enum E_RED_POINT_TYPE {
    E_RED_POINT_TYPE_NONE = 0,
    ...
    E_RED_POINT_TYPE_HEAD = 9,        // 头像（已有）
    ...
    E_RED_POINT_TYPE_ACTION = 18,     // 动作（已有）
    E_RED_POINT_TYPE_TITLE = 19,      // 光仔称号（已有）
    ...
    E_RED_POINT_TYPE_EVAC_TALENT = 33 // ← 当前最大值
}
```

### 2.2 前端「红点类型 → 红点路径」映射

前端配置表 `RedPointSystemConfig`（`MainBundleScripts/MinViableSystemSet/Modules/RedDot/Config/RedDotConfig.ts`），以头像为例：

```ts
{
    id: SOCClient.E_RED_POINT_TYPE.E_RED_POINT_TYPE_HEAD,   // 红点类型
    path: DefinedRedDotPath.PersonalInfo_BasicInfo_HeadIconEntry, // 前端红点树路径
    description: "头像入口",
},
```

### 2.3 后端下发协议（已有，头像框复用同一协议）

下发协议 `E_SVR_MSG_ID_RED_POINT_NOTIFY_RED_LIST` → `TRedPointNotifyRedList`：

```
TRedPointNotifyRedList
└── vecRedList: ITRedPointNode[]          // 多个红点类型节点
        └── ITRedPointNode
            ├── iType: E_RED_POINT_TYPE   // 红点类型
            ├── stData: { iLightOff, iData, iStyle }
            └── vecRedSubList: Array<{    // 子节点 = 具体物品
                    iID: number,          // 物品 id（头像框物品 id）
                    stData: { iLightOff, iData, iStyle }  // iLightOff > 0 表示亮红点
                }>
```

> 源码依据：`TKPGPlayerInfoDetailPageSystem.ts:1733`（`OnRedPointListNotify`）、`:1759`（读 `stData.iLightOff`）、`:1777`（遍历 `vecRedSubList` 的 `iID`/`stData`）。

### 2.4 前端关注的红点类型白名单

前端只处理 `RedDodTypeToFollow` 数组里列出的类型（`TKPGPlayerInfoDetailPageSystem.ts:1723-1728`）：

```ts
private RedDodTypeToFollow: SOCClient.E_RED_POINT_TYPE[] = [
    E_RED_POINT_TYPE_HEAD,      // 头像
    E_RED_POINT_TYPE_ACTION,    // 动作
    E_RED_POINT_TYPE_TITLE,     // 称号
    E_RED_POINT_TYPE_USER_LEVEL,// 梗级
];
```

### 2.5 红点清除协议（已有，头像框复用同一协议）

`E_SVR_MSG_ID_USER_INFO_CLEAR_RED_DOT` → `TUserInfoRedDotClearReq { vecItemId: number[] }`（`TKPGPlayerInfoDetailPageSystem.ts:1822-1825`）。前端在切换到对应 Tab 时，把该 Tab 下所有「亮着的物品 id」通过此协议上报清除。

---

## 三、后端需要补的部分

### 3.1 新增红点类型枚举值（必需）

在 proto 的 `E_RED_POINT_TYPE` 枚举末尾追加：

```protobuf
E_RED_POINT_TYPE_HEAD_FRAME = 34;   // 头像框（建议命名；具体枚举名以后端规范为准）
```

> 当前最大值是 `E_RED_POINT_TYPE_EVAC_TALENT = 33`（`SOCClientBase.d.ts:136599`），新值接在其后即可。

### 3.2 下发头像框红点（必需）

在 `E_SVR_MSG_ID_RED_POINT_NOTIFY_RED_LIST` 下发时，头像框红点节点按头像红点**完全相同的结构**组织：

```
ITRedPointNode {
    iType = E_RED_POINT_TYPE_HEAD_FRAME,
    stData = { ... },
    vecRedSubList = [                    // 用户拥有的、未查看的头像框物品
        { iID: <头像框物品id>, stData: { iLightOff: 1, ... } },
        ...
    ]
}
```

即：`iID` 填头像框物品 id，`iLightOff = 1` 表示该头像框需要亮红点。前端会按 `path + "." + iID` 生成子节点红点（`TKPGPlayerInfoDetailPageSystem.ts:1783`）。

### 3.3 清除逻辑（复用，无需新协议）

前端切到头像框 Tab 时，会把头像框 Tab 下所有亮着的物品 id 通过 `TUserInfoRedDotClearReq { vecItemId }` 上报，后端按头像红点**同样方式**处理即可，无需新增清除协议。

---

## 四、前端已就位 / 协议就位后需补的部分

### 4.1 前端已就位（本次改动已完成）

| 项            | 位置                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 头像框红点路径定义    | `RedDotConfig.ts`：`PersonalInfo_BasicInfo_HeadIconFrameEntry = "Root.Main.PersonalInfo.BasicInfo.HeadIconFrameEntry"` |
| 头像框 Tab 红点展示 | `TKPGHeadIconAppearancePanelComponent.ts`：头像框 Tab 绑定 `WB_RedDot_Normal_1`（路径 `HeadIconFrameEntry`）                    |
| 头像框 Tab 红点清理 | `setPanelTabIndex`：切到头像框 Tab 时 `getAllChildItemID(HeadIconFrameEntry)` + `clearRedDotInUserInfo`                      |
| 头像 Tab 红点保留  | 同上，路径 `PersonalInfo_BasicInfo_HeadIconEntry`                                                                          |

### 4.2 协议字段就位后，前端需补 2 行（后端字段名确认后即可做）

```ts
// ① RedPointSystemConfig 加映射（RedDotConfig.ts）
{
    id: SOCClient.E_RED_POINT_TYPE.E_RED_POINT_TYPE_HEAD_FRAME,
    path: DefinedRedDotPath.PersonalInfo_BasicInfo_HeadIconFrameEntry,
    description: "头像框入口",
},

// ② RedDodTypeToFollow 白名单加关注（TKPGPlayerInfoDetailPageSystem.ts:1723）
E_RED_POINT_TYPE_HEAD_FRAME,   // 头像框
```

补完这两行后，头像框红点即完整生效（展示 + 清理），无需再改弹窗组件。

---

## 五、完整时序

```
后端：用户获得新头像框
  └─ 下发 E_SVR_MSG_ID_RED_POINT_NOTIFY_RED_LIST
       vecRedList 含 { iType = E_RED_POINT_TYPE_HEAD_FRAME, vecRedSubList = [{iID, iLightOff=1}] }
            ↓
前端 TKPGPlayerInfoDetailPageSystem.OnRedPointListNotify
  ├─ 白名单命中 E_RED_POINT_TYPE_HEAD_FRAME（需 4.2 ②）
  ├─ RedPointSystemConfig 映射到 HeadIconFrameEntry（需 4.2 ①）
  └─ 生成子节点红点 HeadIconFrameEntry.<itemId> = 亮
            ↓
弹窗 TKPGHeadIconAppearancePanelComponent
  └─ 头像框 Tab 的 WB_RedDot_Normal_1 显示红点
            ↓
用户切到头像框 Tab
  └─ setPanelTabIndex(HEAD_ICON_FRAME)
       ├─ getAllChildItemID(HeadIconFrameEntry) → [亮着的 itemId...]
       └─ clearRedDotInUserInfo(itemIds) → E_SVR_MSG_ID_USER_INFO_CLEAR_RED_DOT
            ↓
后端收到清除请求，熄灭对应头像框红点
```

---

## 六、关键约定与注意事项

1. **枚举命名**：`E_RED_POINT_TYPE_HEAD_FRAME` 是前端建议名，最终以后端 proto 实际命名为准，前端同步调整 `RedPointSystemConfig` 与 `RedDodTypeToFollow` 的引用即可。

2. **枚举值唯一性**：新值必须接在当前最大值 `33` 之后（`34`），不可复用已删除的历史值，避免与既有红点类型冲突。

3. **下发结构一致性**：头像框红点节点结构必须与头像（`E_RED_POINT_TYPE_HEAD`）**完全一致**（`iType` + `vecRedSubList[].iID/iLightOff`），前端才会正确解析到 `HeadIconFrameEntry.<itemId>` 子节点。

4. **清除协议复用**：头像框清除复用 `E_SVR_MSG_ID_USER_INFO_CLEAR_RED_DOT`，`vecItemId` 填头像框物品 id，无需新协议。

5. **头像框物品 id 空间**：头像框后续若物品化（参考头像的 `ItemType_HeadIcon=21`），需要新增独立的 `ItemType` 值，避免与头像物品 id 空间冲突。此点与红点无关，但建议后端在定义头像框物品时一并规划。

---

## 七、涉及文件索引

| 文件                                                                                                                 | 作用                                |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `MainBundleScripts/Protocol/ProtoJS/SOCClientBase.d.ts`                                                            | 协议枚举 `E_RED_POINT_TYPE`（后端生成，勿手改） |
| `MainBundleScripts/MinViableSystemSet/Modules/RedDot/Config/RedDotConfig.ts`                                       | 红点类型 → 路径映射（前端改，4.2 ①）            |
| `MainBundleScripts/MinViableSystemSet/Modules/TikiStarPlayerInfoSystem/UI/TKPGPlayerInfoDetailPageSystem.ts`       | 红点下发接收 + 白名单 + 清除协议（前端改，4.2 ②）    |
| `MainBundleScripts/MinViableSystemSet/Modules/TikiStarPlayerInfoSystem/UI/TKPGHeadIconAppearancePanelComponent.ts` | 弹窗红点展示 + 清理（已就位，无需改）              |
|                                                                                                                    |                                   |
