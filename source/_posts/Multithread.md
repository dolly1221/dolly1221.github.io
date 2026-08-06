---
title: "Multithread"
date: 2026-07-27 21:23:49
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
---
## 二、项目自建的多线程（C++ FRunnable）
### 2.1 Puerts AsyncModulePreloader — JS 模块异步预加载

**文件**：AsyncModulePreloader.h

**作用**：在后台线程完成 JS 模块的磁盘 IO 和 V8 字节码反序列化，减少 GameThread 阻塞。

`GameThread                        Worker Thread(s)    │                                    │    ├─ QueuePreload("foo.js") ────MPSC──→│  Pop 任务    │  (立即返回)                         │  DoFileIO: 读磁盘    │                                    │  DoDeserialize: V8 解码    │                                    │  写入 ModuleMap    │                                    │    ├─ require("foo")                    │    │  TryConsume() ←─────── 共享 Map ───┤  命中 → 直接取` 

**关键实现细节**：

- 继承 `FRunnable`，通过 `FRunnableThread` 创建
    
- 默认 1 个 worker，可通过 `Puerts.AsyncPreloader.WorkerCount` CVar 调整
    
- 仅非编辑器、非 Linux 平台启用 (`WITH_PUERTS_ASYNC_MODULE`)
    
- 使用 `TQueue<EQueueMode::Mpsc>` 无锁队列
    
- 使用 `TSharedPtr<ESPMode::ThreadSafe>` 保护跨线程共享数据
    
- 使用 `TAtomic` + `FCriticalSection` 实现 CAS 状态机
    
- ⚠️ V8 操作需要 `v8::Locker` 保护

### 2.2 BlinkView BlinkThread — 内嵌 H5/WebView 渲染线程

**文件**：BvBlinkThread.h / `.cpp`

**作用**：BlinkView 是项目内嵌的 WebView 组件（类似 CEF），所有 WebView 操作必须在专有线程执行。

`GameThread                         BlinkThread (进程级单例)    │                                    │    ├─ PostTickAsync(Doc,View) ──MPSC──→│  Pop TickReq    │  (fire-and-forget)                 │  调用 BvWebView_Tick()    │                                    │  CompletedTickSeq++    │                                    │    ├─ PostBlinkTask(Fn) ───────MPSC──→ │  Pop BlinkTask    │  (可选: WaitForTaskSeq同步等待)      │  执行闭包 (Init/Create/LoadURL...)    │                                    │  CompletedTaskSeq++` 

**关键实现细节**：

- 进程级单例 `FBvBlinkThread`，继承 `FRunnable`
    
- **严格 lock-free**：GT→BT 全部走 `TQueue<EQueueMode::Mpsc>`（D17.2 约束）
    
- **fire-and-forget 模式**：GT 投递后立即返回（D17.3 约束）
    
- 唯一的 GT 等待原语：`WaitForTaskSeq(seq, timeoutMs)`，仅用于 setup/teardown
    
- 使用 `TAtomic<uint64>` 做序列号递增追踪
    
- 使用 `FEvent` 做唤醒信号（Manual-reset，一次 Trigger 唤醒多个 worker）
    
- GT 侧维护 `GtAttachedDocs` 列表（无锁），`KickAllAttachedDocsForBeginFrame()` 在帧首提前踢 Tick

### 2.3 GameBridgeWebSocket — AI 桥接 WebSocket

**文件**：GameBridgeClient.ts

**作用**：连接 TSClaw Web Server 的 WebSocket 客户端，用于 AI 工具调用。

**实现方式**：

- **底层**：C++ `UE.GameBridgeWebSocket`（UE 对象，WebSocket 的 IO 在 UE 网络层异步处理）
    
- **上层**：TS 通过事件回调（`OnConnected`/`OnMessage`/`OnDisconnected`/`OnError`）封装为 Promise
    
- **重连**：指数退避 + 随机抖动（thundering herd 防护）
    
- **心跳**：使用 `setInterval`（⚠️ 这里用的是 JS 原生 `setInterval`，不是 `UETimer`——属于少见的例外，因为 WebSocket 生命周期独立于 UE World）

## 三、TS 层的"伪多线程"（单线程 V8，异步编排）

> **核心约束**：Puerts 的 V8 Isolate 绑定在 GameThread 上，所有 TS 代码都在 GameThread 执行。**TS 没有真正的多线程**。但通过 Promise/async-await + UE 的 Latent Action 机制，实现了非阻塞的异步编程模型。

### 3.1 UETimer — 基于 `FTimerManager` 的定时器

**文件**：UETimerUtils.ts

|API|底层 C++|用途|
|---|---|---|
|`UETimer.setTimeout(ctx, cb, ms)`|`ExAsyncActionLibrary.SetTimerByCallback` (delayMs>0) 或 `SetTimerForNextTick` (delayMs==0)|延迟执行|
|`UETimer.setInterval(ctx, cb, ms)`|`ExAsyncActionLibrary.SetTimerByCallback` (looping=true)|循环执行|
|`UETimer.delay(ctx, ms)`|同上，包装为 Promise|await 等待|
|`UETimer.promiseWaitTimeout(ctx, prom, ms)`|`Promise.race([prom, timeout])`|Promise 超时等待|

**资源管理**（亮点设计）：

- 通过 `releaseJsFunctionDelegate` 主动释放 Puerts 侧的 `UDynamicDelegateProxy`
    
- 避免长期运行的 `setInterval` 累积 Proxy 导致内存泄漏
    
- 支持 `CancellationToken`：token 取消时自动清理所有注册的 timer
    

### 3.2 AsyncActionUtils — 基于 `FLatentActionManager` 的异步操作

**文件**：AsyncActionUtils.ts

|API|底层 C++|用途|
|---|---|---|
|`delay(world, seconds)`|`KismetSystemLibrary.Delay`|延迟指定秒数|
|`delayFrames(world, frames)`|`ExAsyncActionLibrary.DelayFrames`|延迟指定帧数|
|`delayUntilNextTick(world)`|`ExAsyncActionLibrary.ExDelayUntilNextTick`|等到下一帧|
|`loadStreamLevel(world, name)`|`GameplayStatics.LoadStreamLevel`|异步加载关卡|
|`calSkeletalMeshHull(...)`|`ExMeshLibrary.CalSkeletalMeshHull`|异步计算骨骼网格凸包|

**原理**：UE 的 `FLatentActionManager` 在每帧 Tick 时检查 Latent Action 是否完成，完成时触发回调。TS 侧封装为 Promise。

### 3.3 PromiseUtils — 可取消异步组合子

**文件**：PromiseUtils.ts

|API|功能|
|---|---|
|`createCancellablePromise(ctx, prom, timeout?, final?)`|可取消 Promise + 可选超时|
|`createWaitUntil(ctx, condition, timeout?, pollInterval?)`|轮询等待条件满足|
|`createCancellablePromiseAll(ctx, proms[], timeout?)`|Promise.all + 共享取消|
|`createCancellablePromiseWithToken(...)`|带 CancellationToken 感知版本|
|`createWaitUntilWithToken(...)`|轮询 + CancellationToken 感知|

### 3.4 网络异步（HTTP / WebSocket）

- **HTTP**：UGCNetSystem.ts — 使用 `UE.HttpUtilityBPLibrary.RequestUrlWithMultiHeader`
    
- **WebSocket**：`GameBridgeClient` — 使用 C++ `UGameBridgeWebSocket`
    

### 3.5 关键约束：禁止裸 JS Timer

**文件**：TickDriver.ts

`// 注释原文：禁用js的setTimeout, 都使用NativeTickDriver @ricexu // this.intervalID = setInterval(() => { ...  // 已被注释` 

所有业务代码必须使用 `UETimer.setTimeout/setInterval`，否则 timer 回调不会在正确的 World Tick 时机触发。

（唯一的例外是 `GameBridgeClient` 的重连/心跳用了原生 `setTimeout/setInterval`，因为它生命周期独立于 World）


## 四、线程间通信机制总结

|机制|使用场景|位置|
|---|---|---|
|**TQueue (MPSC)**|GameThread → Worker 任务投递|AsyncModulePreloader, BlinkThread|
|**TAtomic<T>**|跨线程计数器/状态|AsyncModulePreloader, BlinkThread|
|**FCriticalSection**|模块 Map、统计锁|AsyncModulePreloader|
|**FEvent**|Worker 唤醒信号|BlinkThread|
|**TSharedPtr<ESPMode::ThreadSafe>**|跨线程共享数据|AsyncModulePreloader|
|**v8::Locker**|V8 Isolate 的线程安全访问|AsyncModulePreloader|
|**FThreadSafeBool**|关闭标志|AsyncModulePreloader, BlinkThread|
|**FLatentActionManager**|C++ → TS 异步回调桥|AsyncActionUtils (引擎层)|
|**FTimerManager**|GameThread 定时回调|UETimer (引擎层)|

## 五、总结

`多线程层级金字塔：      ┌──────────────────────────────┐     │    TS 业务代码 (V8/GameThread) │  ← 单线程！Promise/async 只是编排     │    UETimer / AsyncActionUtils  │     不是真正的并行     ├──────────────────────────────┤     │    UE5 引擎标准线程             │  ← RenderThread/AsyncLoad/Chaos/     │    (项目只配置，不修改)          │     Audio/Network/TaskGraph     ├──────────────────────────────┤     │    项目自定义 FRunnable 线程     │  ← AsyncModulePreloader (JS预加载)     │    (2个：Puerts + BlinkView)   │     BlinkThread (WebView渲染)     └──────────────────────────────┘` 

- **TKPartyGame 游戏插件自身不创建任何线程**——所有游戏逻辑（怪物 AI、UI、网络同步、背包等）都是单线程 TS
    
- **Puerts AsyncModulePreloader** 是唯一的"JS 加速"多线程，在后台预加载 JS 模块
    
- **BlinkThread** 是内嵌 WebView 的独立渲染线程，与 GameThread 完全解耦
    
- **TS 层通过 Promise + LatentAction + FTimerManager 实现非阻塞异步**，但本质仍是 GameThread 上的协作式调度