---
title: "UGUI合批"
description: 
date: 2025-05-15T10:50:06+08:00
image: 
math: 
license: 
hidden: false
comments: false
draft: false
---

- 参考 [https://blog.csdn.net/sinat_25415095/article/details/112388638#comments_34860579]()
- UI batching 和 Unity 的动态、静态合批是类似的，但有不一样的规则
- Unity 的 UI 系统主要可以分为三类：View，Interact，Layout
- 使用 UI mask 来裁剪图片（比如说圆形的用户头像），即使被裁剪的元素与其他GO使用相同的材质和纹理，也会导致额外的 drawcall，所以除非必要（例如滚动框），不推荐使用，推荐预先将其裁剪，仅仅使用一张图片，原理：
	- Mask 底层使用的是 stencil buffer 技术，stencil buffer 是与 Color buffer 和 Depth Buffer 并列的缓冲区，它记录的是像素位置上的一个整型值，每次 GPU 渲染一个像素时，可以根据这个值来判断：
		- 1. 是否允许该像素被绘制
		- 2. 是否需要修改模板值
		- 3. 是否跳过这个像素
	- 工作流程：
		- 1. 首先会对比模板值（Stencil Test）
		- 2. 如果通过：可以允许该像素写入 Color\Depth Buffer，或者按照你设置的规则修改 Stencil Buffer 的值
		- 3. 如果没通过： 像素被丢弃，不会绘制也不会更新其它 Buffer
- 在 UI 中使用组件 outline 和 shadow 性能是非常差的，它会导致画很多的mesh（通过 wireframe 可以看到），在处理文字阴影时，使用 TextmeshPro来代替
- 在 ScrollRect 中，我们使用循环列表的很重要一个原因也是可以减少rebulid的次数，这样也能提升性能
- 参考 [https://dev.to/devsdaddy/unity-ui-optimization-workflow-step-by-step-full-guide-for-everyone-44da]()
- 