---
title: "UE  puerTS"
date: 2026-01-30 14:21:59
categories:
  - _TMP
tags:
  - _TMP
---
## 什么是 puerTS
- 在引擎里启动一个 js 运行环境
- 实现 js 运行环境和引擎的交互
- 生成 UE 引擎 api 的 ts 声明

## 怎么用
一般有两种用法

1. 用 Script 来驱动引擎
```ts
import * as UE from 'ue'

class TetrisCell extends UE.Character {

    ReceiveBeginPlay(): void {

        super.ReceiveBeginPlay();
        console.log("--- hello puerts ---");

    }

    Foo(): void {
        console.log("TetrisCell.Foo");
    }

}

export default TetrisCell;

```

指向 TS 对象

1. 用 Minxin，代理 blueprint
```ts
const uClass = UE.Class.Load('/Game/UI/WBP_Start.WBP_Start_C')
const jsClass = blueprint.tojs<typeof UE.Game.UI.WBP_Start.WBP_Start_C>(uClass)

export interface TS_Start extends UE.Game.UI.WBP_Start.WBP_Start_C{}
export class TS_Start implements TS_Start { {
    ReceiveConstruct() {
        console.log("Widget Construct");
    }

    OnClick() {
        this.RemoveFromParent();
    }
}

blueprint.mixin(jsClass, TS_Start);

```

指向 UE 对象，mixin 的做法感觉有点像是 Unity里的 MonoBehaviour

## 实现原理

![[Pasted image 20260130142158.png]]

![[IMG_8718.png]]


mixin
![[IMG_8721.png]]
