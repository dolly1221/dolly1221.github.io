---
title: "Puerts 与 UE"
date: 2026-01-28 21:35:11
categories:
  - _TMP
tags:
  - _TMP
---
# UE5
#### Gameplay 架构

#### 与 Unity 基本概念的一些类比对照

| **Unity**    | **UE**            |
| ---------------- | --------------------- |
| GameObject       | Actor                 |
| Component        | Actor/Component       |
| Transform        | Actor Transform       |
| Awake/Start      | Constructor/BeginPlay |
| Update           | Tick                  |
| Script 挂载        | Blueprint/C++         |
| Addressables     | Asset Manager         |
| Scene            | Level                 |
| Prefab           | Blueprint             |
| ScriptableObject | UObject               |
| Event            | Delegate              |

### blueprint 

创建:

![[Pasted image 20260128155718.png]]


UE 蓝图类在磁盘上的真实形态
比如：

`/Game/Blueprints/BP_Cube.uasset`

实际上包含：

- 类定义
    
- 默认属性（CDO）
    
- 组件结构
    
- 蓝图 VM 指令
    

加载后你得到的是：

`UClass* BP_Cube_C`

---

#### 反射



#### MVP/MVP/MVVM 的区别
- https://www.ruanyifeng.com/blog/2015/02/mvcmvp_mvvm.html

---

# puerTS



- puerts 原理
- demo项目解析
- tiki项目初解析