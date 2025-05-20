---
title: "面经  热血美职篮"
description: 
date: 2025-05-15T20:43:01+08:00
image: 
math: 
license: 
hidden: false
comments: false
draft: true
---

- 用两个stack实现queue

- 什么是异步编程

- 什么是协程

- C#的装箱拆箱

- C#的内存泄露

✅ 1. 什么是异步编程（Asynchronous Programming）
答：
异步编程是一种非阻塞编程模型，用于在执行耗时操作（如网络请求、磁盘 IO 等）时，不阻塞主线程，从而提升程序的响应性与性能。

在 C# 中的实现方式：

使用 async / await 关键字。

返回类型通常是 Task 或 Task<T>。

示例：

csharp
Copy
Edit
public async Task<string> DownloadDataAsync(string url)
{
    using HttpClient client = new HttpClient();
    string data = await client.GetStringAsync(url);
    return data;
}
✅ 2. 什么是协程（Coroutine）
答：
协程是 Unity 中用于实现可中断并分帧执行的函数，可用于控制时间流程，如动画播放、延时执行等。

与异步编程的区别：

协程是 Unity 引擎特有机制（基于 MonoBehaviour 和 IEnumerator 实现）。

异步编程是语言层支持，功能更强大。

Unity 协程示例：

csharp
Copy
Edit
IEnumerator MoveForward()
{
    yield return new WaitForSeconds(1f);
    transform.position += Vector3.forward * 5f;
}
StartCoroutine(MoveForward());
✅ 3. C# 中的装箱（Boxing）与拆箱（Unboxing）
答：

装箱（Boxing）：将值类型（如 int）转换为引用类型（如 object），开销较大。

拆箱（Unboxing）：将 object 类型还原为原来的值类型。

会导致 GC 和性能损耗，尤其是在频繁操作中。

示例：

csharp
Copy
Edit
int num = 42;
object boxed = num;        // 装箱
int unboxed = (int)boxed;  // 拆箱
避免方式：

使用泛型，如 List<T> 代替 ArrayList

减少对 object 的使用

✅ 4. C# 中的内存泄露（Memory Leak）
答：
C# 有垃圾回收（GC），但仍可能出现内存泄露，即对象虽然不再使用但无法被 GC 回收，常见原因包括：

常见内存泄露场景：
事件未解除订阅（event handler 引用被保留）

静态引用未清除

长生命周期对象引用短生命周期对象

资源未正确释放（如 Stream、Socket 未调用 Dispose）

示例问题：

csharp
Copy
Edit
myButton.OnClick += MyHandler; // 如果没 -= 卸载，会一直引用
解决方法：

使用 -= 取消事件订阅

使用 using 自动释放资源

定期检查工具：如 Unity Profiler、JetBrains dotMemory




🧩 一、有限状态机 FSM（Finite State Machine）
✅ 概念理解题：
1. 什么是有限状态机？适合解决什么问题？
答：FSM 是一种在任意时刻只处于一种状态，并根据输入事件发生状态切换的建模方式。适合处理有限逻辑步骤清晰、状态之间切换明确的问题，例如角色动画、敌人 AI、UI 状态控制等。

2. Unity 中 Animator Controller 的状态机属于哪种状态机？
答：它属于可视化的有限状态机（Visual FSM），通常用于管理动画状态及其过渡。

3. 状态机的组成包括哪些？
答：

状态（State）

转换条件（Transition）

条件参数（Parameters）

初始状态（Entry）

退出状态（Exit）

4. 什么是 Any State？
答：Any State 表示“任意状态都可以跳转到某个目标状态”，它是一个特殊的快捷入口，不需要知道当前状态是什么。

✅ 实践应用题：
5. 设计“待机-移动-攻击”的状态：
答：

Idle → Move：当速度 > 0

Move → Idle：当速度 = 0

任意状态 → Attack：当按下攻击键

Attack → Idle/Move：攻击动画播放完成后自动切回

6. Unity 中如何设置转换条件？
答：在两个状态之间创建 Transition，在 Inspector 中添加条件（如参数值大于多少）来决定是否转换。

7. 如何在状态切换时执行逻辑？
答：

使用 StateMachineBehaviour 脚本，重写 OnStateEnter()、OnStateExit()、OnStateUpdate()。

🌲 二、行为树（Behavior Tree）
✅ 概念理解题：
1. 什么是行为树？与 FSM 的区别？
答：行为树是一种以树结构组织 AI 行为的系统，更加模块化和可扩展。
区别：

FSM 更适合简单、固定逻辑

行为树适合复杂、分支多的 AI 行为，层次清晰，行为可重用

2. 常见节点类型：

Selector：从上到下选择第一个成功的行为（或“或”关系）

Sequence：从上到下顺序执行，直到失败（或“与”关系）

Decorator：修改子节点行为，如重复、反转等

Leaf（叶子节点）：实际执行的动作，如“移动到位置”、“播放动画”

3. 什么是黑板？
答：黑板（Blackboard）是共享数据存储区，用于行为树各节点共享信息（如玩家位置、状态标记等）。

✅ 实践应用题：
4. 用行为树描述简单敌人 AI

plaintext
Copy
Edit
Selector
├── Sequence
│   ├── CheckPlayerVisible
│   └── ChasePlayer
└── Patrol
含义：如果看见玩家就追击，否则巡逻。

5. 行为树更适合复杂逻辑的原因：
答：行为树结构清晰、支持模块化、逻辑可插拔，调试容易，适合大规模或复杂 AI 行为。

6. 如何处理中断行为？
答：通过 优先级高的 Selector + 条件判断，例如敌人巡逻时一旦发现玩家，立即打断巡逻并切入追击行为。
