# TikiStar TS 前端框架架构说明书

> 文档定位：系统级说明书，覆盖框架启动、UE 接入、MVVM、ViewComponent、窗口管理、System 设计、面试准备。
> 代码真相源：`MainBundleScripts/Framework/` + `Plugins/GameFeatures/*/TypeScript/`

---

## 目录

1. [框架总览](#1-框架总览)
2. [框架启动链路与 UE 接入](#2-框架启动链路与-ue-接入)
3. [IoC 容器与依赖注入](#3-ioc-容器与依赖注入)
4. [System 设计](#4-system-设计)
5. [MVVM 响应式体系](#5-mvvm-响应式体系)
6. [ViewComponent 体系](#6-viewcomponent-体系)
7. [窗口管理与层级](#7-窗口管理与层级)
8. [事件系统](#8-事件系统)
9. [面试准备模块](#9-面试准备模块)

---

## 1. 框架总览

### 1.1 技术栈

| 维度 | 选型 |
|---|---|
| 语言 | TypeScript |
| UE 脚本后端 | Puerts（UE5 的 V8/NodeJS 绑定） |
| 响应式 | `@nx-js/observer-util`（Proxy-based 响应式库） |
| 架构模式 | MVVM + IoC + 状态机驱动的 System |
| UI 底层 | UE5 UMG（Widget Blueprint） |

### 1.2 分层架构

```
┌──────────────────────────────────────────────────┐
│              GameFeature 业务层                    │
│  (Hearthbound / TKPartyGame / TKPartyGameSystem)   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ 业务 View │  │ 业务 VC   │  │ 业务 System  │   │
│  │ (UMG BP)  │  │ (extends  │  │ (extends     │   │
│  │           │  │  VCBase)  │  │  SystemBase) │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├──────────────────────────────────────────────────┤
│              Framework 核心层                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Window    │  │ ViewComp │  │ IoC          │   │
│  │ Manager   │  │ Base     │  │ Container    │   │
│  │ +Layer    │  │ +MVVM    │  │ +@Inject     │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Event    │  │ System   │  │ Framework     │   │
│  │ System   │  │ Container│  │ (入口+状态机) │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├──────────────────────────────────────────────────┤
│              UE5 引擎层                            │
│  GameInstance / GameMode / UMG / Actor            │
└──────────────────────────────────────────────────┘
```

### 1.3 目录结构

```
MainBundleScripts/
├── Framework/                     ⭐ 框架核心
│   ├── Core/
│   │   ├── Framework.ts           ⭐ 框架入口 + IoC + 状态机
│   │   ├── SystemContainer.ts     System 容器 + 状态机驱动
│   │   ├── System.ts              ISystem 接口
│   │   ├── Observable/            响应式 observable/observe 封装
│   │   └── GameStateMachine.ts    状态机定义
│   ├── Common/
│   │   └── FeatureSystemBase.ts   ⭐ 业务 System 基类
│   ├── IocContainer/
│   │   ├── IocContainer.ts        IoC 容器实现
│   │   └── Injection.ts           @Inject 装饰器
│   ├── UI/
│   │   ├── MVVM/
│   │   │   ├── ViewComponent.ts   ⭐ ViewComponent 基类
│   │   │   ├── WidgetRegistery.ts Widget 绑定注册表
│   │   │   ├── BinderFactory.ts   Binder 工厂
│   │   │   └── BaseBinder.ts      Binder 基类
│   │   ├── WindowControllerBase.ts ⭐ 窗口控制器基类
│   │   ├── WindowManager.ts      窗口管理器
│   │   ├── WindowLayerManagePlugin.ts 层级管理插件
│   │   ├── ReactionBinder.ts      响应式绑定器
│   │   ├── EventBinder.ts         事件绑定器
│   │   └── UIGlobalDefine.ts      UI 枚举定义（层级/覆盖/屏蔽）
│   ├── EventSystem/
│   │   └── EventSystem.ts         ⭐ 全局事件总线
│   ├── Bundles/
│   │   ├── BundleManager.ts       Bundle 管理
│   │   └── BundleInstaller.ts    Bundle 安装器
│   └── LoggerManager/
│       └── LoggerUtils.ts        日志工具
├── MinViableSystemSet/            ⭐ 最小可用系统集
│   ├── Systems/
│   │   ├── HttpSystem/           HTTP 请求
│   │   ├── ReportSystem/         上报系统
│   │   ├── InputHandlerSystem/   输入处理
│   │   └── ...
│   └── Modules/
│       ├── MainWorld/            主世界系统
│       ├── TikiStarPlayerInfo/   玩家信息
│       └── ...
└── tsconfig.build.json           TS 编译配置（含 4 个 transformer）
```

---

## 2. 框架启动链路与 UE 接入

### 2.1 UE 端入口

UE 通过 **Puerts** 将 TS 脚本引擎嵌入 UE5。UE 侧由 `GameInstance`（或其子类）在 `OnStartup`/`Init` 时机调用 TS 入口：

```
UE.GameInstance.OnStartup
  → 加载 JS bundle（由 tsconfig.build.json 编译）
  → 调用 TS 入口函数
```

### 2.2 TS 入口：`Framework.startup()`

```typescript
// Framework.ts:88
public startup(
    iocCfg: IocConfigure,
    sysCfg: SystemGraphConfig<StateKey>,
    startupTags: Set<string>,
    subsystemMap: Map<symbol, ISystem>
): void {
    // 1. 设置 CrashSight 版本指纹
    UE.TKCrashSightFunctionLibrary.SetUserValue("VersionFP", ...);

    // 2. 应用 C++ TS 补丁
    applyCppTSPatches();

    // 3. 注册未捕获 Promise rejection handler
    this.registerUnhandledRejectionHandler();

    // 4. 注册到 FrameworkContainer（UE GameInstance → Framework 映射）
    FrameworkContainer.add(this.gameInstance, this);

    // 5. 初始化 IoC 容器
    this.setupIocContainer(iocCfg);

    // 6. 注册 UE 子系统实例
    this.iocContainer.registerSubsystemInstances(subsystemMap);

    // 7. 初始化 SystemContainer（状态机 + System 图）
    this.setupSystemContainer(sysCfg);

    // 8. 安装 Bundle（GameFeature 模块）
    let bundleInstaller = new DefaultBundleInstaller(...);
    this.bundleManager = new BundleManager(bundleInstaller, this.isServer);
    this.iocContainer.resolve(this.bundleManager);

    // 9. Android 线程亲和性设置
    if (UE.TKEngineUtilsLibrary.IsAndroidPlatform()) { ... }

    // 10. 客户端 GC 策略：关闭引擎自动 GC，由 TS 驱动
    if (!this.isServer) {
        UE.PerformanceLibrary.SetTimeBetweenPurgingPendingKillObjects(360000);
    }
}
```

### 2.3 启动流程图

```
UE GameInstance.OnStartup
  │
  ▼
加载编译后的 JS bundle
  │
  ▼
创建 Framework 实例
  │
  ├── setGameInstance(gameIns)          ← 保存 UE GameInstance 引用
  ├── setServerType(typ)               ← 标记客户端/服务端
  │
  ▼
Framework.startup(iocCfg, sysCfg, ...)
  │
  ├── 1. applyCppTSPatches()           ← 应用 C++ 侧 TS 补丁
  ├── 2. registerUnhandledRejectionHandler()  ← 全局异常兜底
  ├── 3. FrameworkContainer.add()      ← 建立 GI→Framework 映射
  ├── 4. setupIocContainer(iocCfg)    ← IoC 容器初始化 + 绑定所有 System
  ├── 5. setupSystemContainer(sysCfg)  ← 状态机 + System 依赖图
  ├── 6. BundleManager 安装            ← 安装所有 GameFeature 模块
  ├── 7. Android 线程亲和性             ← 移动端优化
  └── 8. GC 策略                       ← 客户端 TS 驱动 GC
  │
  ▼
switchToState(initialState)            ← 切到初始状态，触发 System enter()
  │
  ▼
框架就绪，等待玩家操作
```

### 2.4 FrameworkContainer：UE ↔ TS 的桥梁

```typescript
// FrameworkContainer 维护一个 Map<UE.GameInstance, IFramework>
FrameworkContainer.add(this.gameInstance, this);

// 任何 UE 对象都可以通过 contextObj 反查到 Framework
public static getRunningIns(contextObj: UE.Object): IFramework {
    let gameIns = UE.GameplayStatics.GetGameInstance(contextObj);
    return FrameworkContainer.get(gameIns);
}
```

**这是 UE 与 TS 通信的核心桥梁**：UE 对象 → `GetGameInstance` → `FrameworkContainer` Map → `Framework` 实例 → IoC 容器 → System。

### 2.5 GameInstance 与 World 的关系

```typescript
// Framework.ts:85
public getWorld(): UE.World {
    return this.gameInstance.GetWorld();
}
```

Framework 持有 `gameInstance`，通过它获取当前 World。所有 System 也通过 Framework 获取 World。

---

## 3. IoC 容器与依赖注入

### 3.1 IocContainer 设计

```typescript
// IocContainer.ts
export class IocContainer implements IObjectResolver {
    private innerMap: Map<ObjectTypeKey, IocBindInfo> = new Map();

    // 绑定：key → 工厂函数 + 生命周期
    bind<T>(key, factory, lifetime): void;

    // 解析：根据 key 创建/返回实例
    get<T>(key): T;

    // 批量 resolve：对对象注入 @Inject 属性
    resolve(obj): void;
}
```

### 3.2 三种生命周期

| EBindLifetime | 行为 | 典型场景 |
|---|---|---|
| `Singleton` | 首次 get 时创建，缓存到 `singletonInsMap`，后续直接返回 | 大部分 System |
| `GameInstanceSubSystem` | 从 `singletonInsMap` 取预注册的 UE 子系统实例 | UE 原生子系统桥接 |
| `Transient`（默认） | 每次 get 都创建新实例 | 无状态工具类 |

### 3.3 @Inject 装饰器

```typescript
// Injection.ts
export function Inject(key: ObjectTypeKey): PropertyDecorator {
    // 在属性上标记元数据，IoC 容器 resolve 时自动填充
}

// 使用
class ViewComponent {
    @Inject(CoreObjectDefine.EventSystem)
    private eventSys: IEventSystem;
}
```

`@Inject` 在对象创建后，由 IoC 容器调用 `resolve(obj)` 时根据元数据自动填充属性。

### 3.4 Framework.getObject：命令式获取

```typescript
// Framework.ts:465
public static getObject<T>(contextObj: UE.Object, key: ObjectTypeKey): T | undefined {
    let framework = this.getRunningIns(contextObj);
    return framework.getInIocContainer<T>(key);
}
```

**`@Inject` vs `getObject`**：

| 方式 | 场景 | 时机 | 性能 |
|---|---|---|---|
| `@Inject` | IoC 管理的对象（System/ViewComponent） | 对象创建时自动注入 | 属性访问，最快 |
| `getObject` | 非 IoC 对象（UE Actor/静态方法） | 运行时手动调用 | 每次走 Map 查找，较慢 |

---

## 4. System 设计

### 4.1 FeatureSystemBase

```typescript
// FeatureSystemBase.ts
export abstract class FeatureSystemBase implements ISystem {
    // 生命周期
    init(runtimeCtx): void;         // 初始化
    enter(): void;                  // 进入当前状态时调用
    exit(): void;                   // 离开当前状态时调用

    // 事件注册（框架自动注册）
    getEventConfigs(): EventConfig[] | undefined;

    // GM 命令注册
    onRegisterCmd(cheatHandler): void;

    // Tick
    onTick(dt: number): void;
}
```

### 4.2 System 生命周期

System 的生命周期由 **状态机** 驱动：

```
Framework.switchToState(state)
  │
  ▼
SystemContainer.switchToState(state)
  │
  ├── exit 当前状态的 System
  │   └── 调用各 System.exit()
  │
  └── enter 新状态的 System
      └── 调用各 System.enter()
```

不同状态下激活的 System 集合不同。例如：
- `LoginState`：激活 LoginSystem
- `GameState`：激活 GameSystem、UISystem、InputHandlerSystem 等
- `HearthState`：激活 Hearthbound 相关 System

### 4.3 System 间通信

| 方式 | 场景 | 示例 |
|---|---|---|
| `@Inject` | 依赖关系固定，被依赖方先创建 | `@Inject(HttpSystem)` |
| `Framework.getObject` | 运行时动态获取，跨模块 | `Framework.getObject(world, key)` |
| 事件总线 | 松耦合，一对多 | `triggerEvent` / `registerEventHandler` |

### 4.4 核心 System 清单

| System | 职责 |
|---|---|
| `HttpSystem` | HTTP 请求 + 文件下载缓存 |
| `ReportSystem` | 数据上报 + 截图保存 |
| `InputHandlerSystem` | 输入屏蔽 + 按键管理 |
| `EventSystem` | 全局事件总线 |
| `WindowManager` | 窗口创建/销毁/层级管理 |
| `MainWorldSystem` | 主世界状态管理 |
| `TikiStarPlayerInfoSystem` | 玩家信息 + 点击选中 |

---

## 5. MVVM 响应式体系

### 5.1 响应式核心：`@nx-js/observer-util`

```typescript
// Observable.ts
import * as observerImpl from "@nx-js/observer-util"

export function observable<T extends object>(obj?: T): T {
    return observerImpl.observable(obj);  // Proxy 包装，劫持 get/set
}

export function observe<R extends Function>(func: R): R {
    return observerImpl.observe(func);   // 创建 reaction，自动追踪依赖
}
```

**原理**：`observable()` 用 ES6 Proxy 劫持对象的 get/set。当 `observe(func)` 执行 func 时，func 内部访问的 observable 属性会注册依赖。之后属性变化时，对应的 reaction 重新执行。

### 5.2 ViewComponent 的响应式 context

```typescript
// ViewComponent.ts:117
protected setup(props: TProps): TState & TProps {
    let reactiveProps = observable(props);       // props 响应式化
    let rawState = this.getState(reactiveProps);  // 子类实现 getState
    let reactiveState = observable(rawState);     // state 响应式化

    // 用 Proxy 合并 state + props 到 context
    let context = new Proxy(instance, {
        get(target, key) {
            if (state && key in raw(state)) return state[key];
            else if (key in raw(props)) return props[key];
        },
        set(target, key, val) {
            if (state && key in raw(state)) state[key] = val;
            else if (key in raw(props)) props[key] = val;
        },
    });

    this.context = context;
    return context;
}
```

**关键设计**：`context` 是 state 和 props 的合并视图。子类通过 `this.context.xxx` 访问，自动建立响应式依赖追踪。

### 5.3 bindWidget：响应式绑定到 UMG

```typescript
// ViewComponent 子类中
this.bindWidget(viewRes, "Canvas_MutualAidStation", "canvasPanel", {
    get visibility() {
        return self.mainWorldSys.isInHearthWorld() && context.orderUnlock
            ? Visibility.Visible : Visibility.Hidden;
    }
})
```

**绑定机制**：
1. `bindWidget` 创建一个 Binder，内部用 `observe()` 包裹 getter
2. getter 执行时访问 `context.orderUnlock`（observable 属性）→ 注册依赖
3. `orderUnlock` 变化时 → reaction 重新执行 getter → 新值写入 UMG Widget 的 `SetVisibility`

### 5.4 observe：手动响应式

```typescript
// ViewComponent.ts:167
protected observe(func: BinderFunc): ReactionFunc {
    if (!this.reactionBinder) {
        this.reactionBinder = this.reactionBinderProvider.createReactionBinder(this.constructor.name);
    }
    return this.reactionBinder.bind(func);
}
```

子类用 `this.observe(() => { ... })` 创建自定义 reaction。当函数体内访问的 observable 属性变化时，函数重新执行。

### 5.5 两层刷新机制

| 层级 | 机制 | 用途 |
|---|---|---|
| **属性级** | observable + observe + bindWidget | Widget 属性（可见性/文本/颜色）自动刷新 |
| **结构级** | 事件总线 triggerEvent(ModelUpdate) | 列表重建/页面跳转等结构性变更 |

---

## 6. ViewComponent 体系

### 6.1 ViewComponent 基类

```typescript
// ViewComponent.ts:40
export class ViewComponent<TState extends {}, TProps extends {}> {
    @Inject(BinderFactoryManager)    // IoC 自动注入
    private binderFactoryMgr;

    @Inject(EventSystem)
    private eventSys: IEventSystem;

    protected context: TState & TProps;   // 响应式 context

    // 生命周期（子类 override）
    protected getState(props: TProps): TState;  // 定义初始 state
    protected onInit(context): void;            // 初始化
    protected onBind(viewRes, context): void;    // 绑定 UMG Widget
    protected onUnbind(): void;                  // 解绑
    protected onDestroy(): void;                 // 销毁

    // 响应式 API
    protected observe(func): ReactionFunc;
    protected bindWidget(viewRes, name, type, options);  // 绑定 UMG Widget

    // 事件 API
    protected triggerGlobalEvent(evtType, evtId, param?);
    protected registerGlobalEventHandler(evtType, evtId, callback);

    // 动画 API
    public playAnimation(animName, options?);
    public stopAnimation(animName);
}
```

### 6.2 ViewComponent 生命周期

```
bindView(viewResource, props)
  │
  ├── doBindView()
  │   ├── setup(props)          ← 创建响应式 context
  │   │   ├── observable(props)
  │   │   ├── getState(props)    ← 子类返回初始 state
  │   │   └── observable(state)
  │   │
  │   ├── onInit(context)       ← 子类初始化（注册事件、定时器）
  │   └── onBind(viewRes, context) ← 子类绑定 UMG Widget（bindWidget）
  │
  │  ... 运行中 ...
  │
  ├── unbind()                  ← 解绑所有 Binder + Reaction
  │
  └── destroy()                 ← 最终清理
      ├── onDestroy()           ← 子类清理
      ├── context = undefined   ← 置空 context（⚠️ 异步守卫关键点）
      └── 清理子组件
```

### 6.3 父子组件

```typescript
// ViewComponent 支持树形结构
private childComponents: ViewComponent[];
private parent: ViewComponent;

// 组件事件冒泡
public triggerComponentEvent(evtName, payload) {
    let root = this.getRoot();   // 从当前组件向上找根
    root.eventDispatcher.triggerEvent(evtName, payload);
}
```

### 6.4 典型子类示例

```typescript
class HearthboundHUDViewComponent extends ViewComponent<HearthboundHUDViewState, HearthboundHUDViewProps> {
    // 1. 定义初始 state
    protected getState(props): HearthboundHUDViewState {
        return { orderUnlock: false, buildBtnShow: false, ... };
    }

    // 2. 初始化
    protected onInit(context): void {
        this.registerGlobalEventHandler(...);
        this.checkMutualAidStationUnlock();
    }

    // 3. 绑定 UMG Widget
    protected onBind(viewRes, context): void {
        this.bindWidget(viewRes, "Canvas_MutualAidStation", "canvasPanel", {
            get visibility() {
                return context.orderUnlock ? Visibility.Visible : Visibility.Hidden;
            }
        });
    }

    // 4. 销毁清理
    protected onUnbind(): void {
        // 清理定时器、事件等
    }
}
```

---

## 7. 窗口管理与层级

### 7.1 WindowControllerBase

```typescript
// WindowControllerBase.ts:16
export class WindowControllerBase implements IWorldProvider, IWindowOwner {
    @Inject(EventSystem)
    protected eventSys: IEventSystem;

    @Inject(WindowManager)
    protected windowManager: IWindowManager;

    // 生命周期
    protected onWindowCreate(viewRes, winInfo, params): void;
    protected onWindowEachOpen(lastCloseReason): void;    // 上层窗口关闭后重新显示
    protected onWindowBroughtToView(winInfo): void;       // 被带到最前
    protected onWindowClose(closeReason): void;

    // 事件注册
    protected getEventConfigs(): EventConfig[];

    // 标签系统
    protected addTagPayload(tag, payload): void;
}
```

### 7.2 窗口层级

```typescript
// UIGlobalDefine.ts:3
export enum EWindowLayer {
    Background = 0,       // 背景层
    UnderHUD = 400,       // HUD 之下
    HUD = 500,            // 摇杆、主界面 UI
    UnderNormal = 700,    // 摇杆之上，普通弹窗之下
    MiddleNormal = 800,   // UnderNormal 之上
    Normal = 1000,        // 普通弹窗
    UnderPopup = 2000,    // 普通弹窗之上
    Popup = 3000,         // 提示弹窗
}
```

**层级是数值**，ZOrder 越大越靠前。窗口打开时根据 `EWindowLayer` 设置 UMG 的 ZOrder。

### 7.3 窗口打开流程

```
System.openUI(windowDefine, params)
  │
  ▼
WindowManager.createWindow(windowDefine, params)
  │
  ├── 1. 查 WindowDefine → 获取 UMG 蓝图路径 + 层级 + 配置
  ├── 2. 异步加载 UMG Widget 蓝图
  ├── 3. 创建 ViewResource（UMG Widget 实例包装）
  ├── 4. 创建 WindowController 实例
  │   ├── IoC resolve（注入 @Inject 属性）
  │   ├── internalCreateWindow()
  │   │   ├── 创建 ReactionBinder
  │   │   ├── 注册 getEventConfigs 事件
  │   │   ├── 注册 TagPayload
  │   │   └── onWindowCreate()
  │   └── ViewComponent.bindView(viewResource, props)
  │       ├── setup(props) → 响应式 context
  │       ├── onInit(context)
  │       └── onBind(viewRes, context) → bindWidget
  │
  ├── 5. 添加到 WindowLayer（按 EWindowLayer 设置 ZOrder）
  ├── 6. 添加到视口（AddToViewport）
  └── 7. 输入屏蔽处理
```

### 7.4 窗口关闭流程

```
System.destroyUI(windowDefine)
  │
  ▼
WindowManager.destroyWindow(windowInfo, closeReason)
  │
  ├── 1. 从层级中移除
  ├── 2. WindowController.onWindowClose()
  ├── 3. ViewComponent.unbind()
  │   └── 解绑所有 Binder + Reaction（停止响应式追踪）
  ├── 4. ViewComponent.destroy()
  │   ├── onDestroy()
  │   └── context = undefined   ← ⚠️ 异步操作的守卫点
  ├── 5. 从视口移除（RemoveFromViewport）
  └── 6. 通知下层窗口 onWindowBroughtToView()
```

### 7.5 输入屏蔽

```typescript
// UIGlobalDefine.ts:35
export enum EKeySheildType {
    Normal,       // 无按键绑定
    NeedSheild,   // 当前界面需要屏蔽其他快捷键
    IgnoreSheild, // 不屏蔽也不被屏蔽
}
```

```typescript
// InputHandlerSystem
// 窗口打开时根据 EKeySheildType 把按键加入 needSheildKeyWindowStack
// 窗口关闭时移除
```

### 7.6 窗口标签系统（Tag）

```typescript
protected addTagPayload(tag: WindowTag, payload: WindowTagPayload): void;
protected getTagPayloadConfigs(): WindowTagPayloadPair[];
```

窗口可以携带标签数据，其他窗口可以通过标签查询。用于窗口间数据传递，避免直接引用。

---

## 8. 事件系统

### 8.1 全局事件总线

```typescript
// EventSystem
interface IEventSystem {
    triggerEvent(evtType: EventType, evtId: number, param?: EventParam): void;
    triggerEventScopped(evtType: EventType, evtId: number, scope: EventScope, param?: EventParam): void;
    registerEvent(evtType: EventType, evtId: number, callback: EventCallback): void;
    unregisterEvent(evtType: EventType, evtId: number, callback: EventCallback): void;
}
```

### 8.2 两种事件作用域

| 方式 | 范围 | 典型用法 |
|---|---|---|
| `triggerGlobalEvent` | 全局，所有监听者收到 | 跨 System 通信 |
| `triggerGlobalEventScopped` | 限定 scope，只有同 scope 的监听者收到 | 模块内通信（如 `TKPartyGameSystemEventScope`） |

### 8.3 组件内事件

```typescript
// ViewComponent 内部事件（不冒泡到全局）
protected registerComponentEventHandler(evtName, handler): void;
public triggerComponentEvent(evtName, payload?): void;
```

组件事件通过根组件的 `eventDispatcher` 派发，不经过全局事件总线。

### 8.4 事件定义约定

```typescript
// TKPartyGameSystemEventDefine.ts
export class TKPartyGameSystemEventDefine {
    public static TKPGSequenceCompleted = 2600;
    public static TKPGRoomInviteAccepted = 2700;
    // ...
}
```

事件 ID 用静态数字常量定义，按模块分段（2500-2999 为 TKPartyGameSystem 模块）。

---

## 9. 面试准备模块

### 9.1 30 秒电梯介绍

> "我参与的是 TikiStar 项目的前端开发，这是一个基于 UE5 + Puerts + TypeScript 的游戏客户端。前端框架采用 MVVM 架构，用 IoC 容器管理依赖，用 Proxy-based 响应式库实现数据到 UMG 的自动绑定。
>
> 框架分三层：核心层是 Framework + IoC + 状态机驱动的 System 容器；UI 层是 ViewComponent + WindowController 的 MVVM 体系；业务层是按 GameFeature 拆分的模块化系统。
>
> 我负责的互助站订单系统涉及 GS/DS 双服务器交互、每日刷新轮询重试、订单状态机等设计。在排查一个断线重连 bug 时，我发现根因是 ViewComponent 异步操作与组件生命周期的竞态——组件销毁后 `context` 被置空，但 RPC 回调仍在执行，最终用 `if (!this.context)` 守卫解决。"

### 9.2 高频面试问题

#### Q1: 框架是怎么启动的？UE 和 TS 怎么对接？

**回答要点**：
- UE 通过 Puerts 嵌入 V8 引擎，在 GameInstance 启动时加载编译后的 JS bundle
- TS 入口是 `Framework.startup()`，依次完成：IoC 容器初始化 → SystemContainer 状态机 → Bundle 安装 → 平台优化
- UE 与 TS 的桥梁是 `FrameworkContainer`：维护 `Map<UE.GameInstance, Framework>` 映射
- 任何 UE 对象通过 `Framework.getObject(contextObj, key)` 反查到 Framework → IoC → System

#### Q2: MVVM 在 UE5 中怎么实现的？跟传统 UE 蓝图 UI 有什么区别？

**回答要点**：
- 用 `@nx-js/observer-util`（Proxy-based 响应式库）包装 state/props 为 observable
- `bindWidget` 创建 Binder，内部用 `observe()` 包裹 getter，getter 访问 observable 属性时自动注册依赖
- 属性变化 → reaction 重新执行 → 新值写入 UMG Widget 属性
- 区别：传统蓝图需要手动写事件回调刷新 UI；MVVM 声明式绑定，数据变 UI 自动变
- 两层刷新：属性级用 observable（Widget 可见性/文本），结构级用事件总线（列表重建）

#### Q3: ViewComponent 的生命周期是怎样的？异步操作有什么风险？

**回答要点**：
- 生命周期：`bindView` → `setup`（创建响应式 context）→ `onInit` → `onBind` → 运行 → `onUnbind` → `destroy`
- `destroy` 时 `context = undefined`
- **异步风险**：如果 `onBind` 中发了 RPC，RPC 返回前界面被关闭，`context` 已是 undefined，回调中访问 `context.xxx` 会 throw
- **解决**：await 后做 `if (!this.context) return` 守卫
- 这是实际遇到的 bug：日志显示 `Cannot set properties of undefined (setting 'orderUnlock')`，根因就是组件销毁后 RPC 回调执行

#### Q4: IoC 容器是怎么工作的？@Inject 和 getObject 有什么区别？

**回答要点**：
- IoC 容器维护 `Map<key, IocBindInfo>`，IocBindInfo 包含工厂函数 + 生命周期
- `@Inject(key)` 是属性装饰器，标记元数据；对象创建后容器调用 `resolve(obj)` 根据 `metadata` 自动填充属性
- `getObject(contextObj, key)` 是命令式获取，通过 UE 对象反查 Framework 再查 IoC
- 区别：`@Inject` 在 IoC 管理对象（`System`/`ViewComponent`）创建时自动注入，一次；`getObject` 运行时手动调用，每次走 `Map` 查找
- 三种生命周期：`Singleton`（缓存）、`GameInstanceSubSystem`（UE 子系统桥接）、`Transient`（每次新建）

#### Q5: 窗口层级是怎么管理的？窗口间怎么通信？

**回答要点**：
- `EWindowLayer` 枚举定义层级（`Background=0` / `HUD=500` / `Normal=1000` / `Popup=3000`），数值即 `ZOrder`
- `WindowLayerManagePlugin` 管理各层窗口栈
- 窗口打开时按 `EWindowLayer` 设置 UMG `ZOrder`，关闭时从栈移除并通知下层 `onWindowBroughtToView`
- 通信方式：全局事件总线（`triggerGlobalEvent`）/ 组件事件（`triggerComponentEvent` 冒泡到根）/ 窗口标签（`addTagPayload` 携带数据）
- 输入屏蔽：`EKeySheildType` 控制按键屏蔽策略（`Normal`/`NeedSheild`/`IgnoreSheild`）

#### Q6: System 的生命周期由什么驱动？不同场景下 System 怎么切换？

**回答要点**：
- 由状态机驱动：`Framework.switchToState(state)` → `SystemContainer` 切换激活的 System 集合
- 切换时先 `exit` 当前状态的 System，再 `enter` 新状态的 System
- 不同状态激活不同 System（如 `LoginState` → `LoginSystem`，`GameState` → `GameSystem`）
- System 间通信：`@Inject`（依赖固定）/ `getObject`（运行时）/ 事件总线（松耦合）

#### Q7: 响应式系统的原理是什么？有什么需要注意的陷阱？

**回答要点**：
- 基于 ES6 Proxy，`observable()` 劫持 `get`/`set`，`observe(func)` 执行时追踪依赖
- 陷阱 1：**异步操作中访问 observable 不建立依赖**——`observe` 只在同步执行期间追踪，`await` 后的代码访问 `observable` 不触发 `reaction`
- 陷阱 2：**组件销毁后 `context` 为 `undefined`**——`observable` 对象被释放，`reaction` 仍可能触发
- 陷阱 3：**循环依赖**——`A` 的 `observe` 修改 `B`，`B` 的 `observe` 修改 `A`，无限循环
- 项目中用 `reactionBinder` 管理 `reaction` 生命周期，`unbind` 时统一清理

#### Q8: 如果让你重新设计这个框架，你会怎么改？

**回答要点**：
- **响应式库**：`@nx-js/observer-util` 已不维护，考虑迁移到 `@vue/reactivity` 或 `mobx`，性能更好且社区活跃
- **异步生命周期**：框架层面提供 `AsyncSafe` 装饰器或 `useSafeArea`，自动处理组件销毁后的异步回调
- **类型安全**：`EventSystem` 的事件 `ID` 是 `number`，没有类型约束，考虑用 `string` + 泛型约束 `payload` 类型
- **窗口管理**：`WindowDefine` 用静态配置，考虑改为声明式装饰器（`@Window(layer=Normal)`）
- **GC**：当前客户端自己驱动 GC，说明 `Puerts` 对象生命周期管理有挑战，可以考虑引入 `FinalizationRegistry`

#### Q9: Puerts 跟普通前端开发有什么区别？有什么特殊限制？

**回答要点**：
- Puerts 是 UE5 的 TS 绑定，TS 运行在 V8 引擎中，通过生成的声明文件（`.d.ts`）调用 UE C++ API
- 区别 1：**不能直接操作 DOM**，UI 是 UMG Widget，不是 HTML
- 区别 2：**GC 机制不同**——JS 对象和 UE 对象的生命周期需要手动管理，项目通过 TS 驱动 GC 解决
- 区别 3：**多线程**——UE 有 `GameThread`/`RenderThread`/`RHI`，TS 运行在 `GT`，跨线程需要调度
- 限制：TS 类继承 UE Actor/Component 时，`constructor` 阶段不能操作 `PrimaryActorTick`（`Puerts` 初始化时序问题）

#### Q10: 你在项目中遇到的最有挑战的 bug 是什么？

**回答要点**（互助站 HUD 按钮消失 bug）：
- 现象：断线重连后家园互助站入口按钮消失，打开互助站界面后恢复
- 排查过程：从 UI 可见性条件入手 → `orderUnlock` 被置 `false` → 追踪 `checkMutualAidStationUnlock` → 发现 `catch` 被触发
- **第一轮误判**：以为 `catch` 是 `RPC` 网络失败，改成保持原值
- **第二轮误判**：以为是并发问题，加了 `trailing` 补查
- **第三轮真相**：看日志发现 `RPC` 成功了（`retCode=0`, `count=1`），`catch` 触发是因为组件销毁后 `context` 为 `undefined`
- **最终修复**：去掉 `try-catch`，`await` 后用 `if (!this.context) return` 守卫
- 教训：不要只看 `catch` 就假设是 `RPC` 失败，要看日志确认异常类型；组件销毁后的异步操作必须做生命周期守卫

### 9.3 面试加分项

1. **能讲清 Proxy-based 响应式的原理**：`get` 劫持收集依赖、`set` 劫持触发 `reaction`
2. **能对比不同响应式方案**：`Vue2 Object.defineProperty` vs `Vue3 Proxy` vs `MobX` vs 项目用的 `observer-util`
3. **能讲 GC 策略**：为什么客户端要自己驱动 GC（Puerts 对象生命周期 + 引擎对象引用）
4. **能讲跨平台优化**：Android 线程亲和性、大核绑定策略
5. **能从 bug 中提炼设计教训**：异步操作必须有生命周期守卫，不能靠 `try-catch` 兜底

### 9.4 面试避坑

- 不要只说"用了 MVVM"，要讲清 **observable 怎么追踪依赖、reaction 怎么触发 UMG 刷新**
- 不要把 `IoC` 说得很玄，就是"用 `Map` 存 `key`→工厂函数，`get` 时创建/返回实例"
- 被问"有什么问题"时，主动讲 `observer-util` 已不维护、事件 `ID` 无类型约束等
- 如果面试官追问"并发问题"，讲到 `ViewComponent` 销毁后异步回调的 `context undefined` 问题，这是真实踩过的坑

---

> 本文档基于代码静态分析生成，如需验证具体实现请参照源文件行号锚点。
