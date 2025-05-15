---
title: "Messenger优化"
description: 
date: 2025-05-15T21:07:07+08:00
image: 
math: 
license: 
hidden: false
comments: false
draft: false
---

## 🔥 问题本质：

可能产生无限调用的情况是：

- 监听函数A 触发了事件 `B`；
- `B` 的监听函数中又广播了 `B`；
- 如此反复导致 **无限递归调用**（非死锁，是**递归栈溢出**）。


## ✅ 解决方案（推荐方案由简单到复杂）：

---

### ✅ 方案一：**添加调用栈限制（防止重复广播）**

在 `MessengerInternal` 中为每个事件维护一个**广播中事件栈**，广播时检查事件是否正在调用中，若是，则跳过或报错。
```csharp
static internal class MessengerInternal {
    readonly public static Dictionary<string, Delegate> eventTable = new();
    private static readonly HashSet<string> _broadcastingEvents = new();

    static public void OnBroadcasting(string eventType, MessengerMode mode) {
        if (_broadcastingEvents.Contains(eventType)) {
            throw new BroadcastException($"Recursive broadcast detected for event: {eventType}");
        }

        if (mode == MessengerMode.REQUIRE_LISTENER && !eventTable.ContainsKey(eventType)) {
            throw new BroadcastException($"Broadcasting message {eventType} but no listener found.");
        }

        _broadcastingEvents.Add(eventType);
    }

    static public void OnBroadcastComplete(string eventType) {
        _broadcastingEvents.Remove(eventType);
    }

    // ... 其他代码保持不变
}

```

然后在你每一个 `Broadcast` 的最后都加上：
```csharp
MessengerInternal.OnBroadcasting(eventType, mode);
try {
    var invocationList = MessengerInternal.GetInvocationList<Action<T>>(eventType);
    if (invocationList == null) return;
    foreach (var callback in invocationList)
        callback.Invoke(arg1);
} finally {
    MessengerInternal.OnBroadcastComplete(eventType);
}

```

这个方案可以**防止递归广播同一个事件名**，并抛出异常提示开发者注意逻辑问题。

### ✅ 方案二：**事件队列化（延迟广播）**

另一种方式是用一个队列存储广播事件，**逐帧或逐层处理**，不在广播过程中直接调用 listener，而是等当前广播完成后再执行新的广播。
```csharp
static class MessengerQueue {
    private static readonly Queue<Action> _eventQueue = new();
    private static bool _isProcessing = false;

    public static void Enqueue(Action broadcastCall) {
        _eventQueue.Enqueue(broadcastCall);
        if (!_isProcessing) {
            ProcessQueue();
        }
    }

    private static void ProcessQueue() {
        _isProcessing = true;
        while (_eventQueue.Count > 0) {
            var evt = _eventQueue.Dequeue();
            evt.Invoke();
        }
        _isProcessing = false;
    }
}

```

然后你把所有 `Broadcast(...)` 改成：

```csharp
MessengerQueue.Enqueue(() => {
    MessengerInternal.OnBroadcasting(eventType, mode);
    try {
        var invocationList = MessengerInternal.GetInvocationList<Action>(eventType);
        if (invocationList == null) return;
        foreach (var callback in invocationList)
            callback.Invoke();
    } finally {
        MessengerInternal.OnBroadcastComplete(eventType);
    }
});

```

## ✅ 建议

|场景|推荐方案|
|---|---|
|快速检测递归问题|**方案一：递归检测 + 异常抛出**|
|需要处理复杂嵌套事件|**方案二：事件队列（异步分发）**|
|可控触发但不希望中断|二者结合（递归检测 + 队列化 + 限层）|

## ✅ 高级优化：最大递归层级限制（保护机制）

可以增加一个最大层级深度：
```csharp
private const int MaxEventDepth = 10;
private static int _currentDepth = 0;

static public void OnBroadcasting(string eventType, MessengerMode mode) {
    _currentDepth++;
    if (_currentDepth > MaxEventDepth) {
        throw new BroadcastException($"Max broadcast depth exceeded for event: {eventType}");
    }
}
static public void OnBroadcastComplete(string eventType) {
    _currentDepth--;
}

```