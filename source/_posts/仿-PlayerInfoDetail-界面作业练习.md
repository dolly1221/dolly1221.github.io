---
title: "仿 PlayerInfoDetail 界面作业练习"
date: 2026-02-11 18:39:19
categories:
  - TIKIstar 学习
tags:
  - TIKIstar 学习
---

## 原有界面分析

#### 外观
![](file-20260206203115181.png)
#### 此次主要复现其中的界面
```
主界面
├── 基础信息页签             
│   ├── 个人信息界面
│   │   ├── 等级界面
│   │   └── 更换头像界面
│   └── 弹窗气泡界面
└── 光仔称号页签
    └── 称号界面
```
1. 主界面
2. 更换头像界面
3. 个人信息界面
4. 光仔称号界面
5. 详细等级界面
---

## 实现步骤

0. 模仿主界面自建一个 Widget Blueprint
![](file-20260207154350054.png)
这里将菜单列表由垂直分布改为水平分布

1. 找到原来个人信息界面的入口
![](file-20260207154533454.png)

2. 找到对应的代码入口
`` TKPGControlPanelViewComponent.ts``
```ts
protected override onBind(viewRes: ViewResource, context: TKPGControlPanelViewState & TKPGControlPanelViewProps): void {
	// 原本 逻辑
	// this.userInfoChildView = this.bindComponent(viewRes, "WBP_ControlPanel_UserInfo", TKPGControlPanelUserInfoViewComponent, {
	//     clickCallback: () => {
	//         LoggerUtils.log("TKPGControlPanelViewComponent", `onBind TKPGUserInfoViewComponent click`);
	//         if (!self.checkIsDealWithCallback()) {
	//             return;
	//         }
	//         self.onControlPanelModuleDataReport("个人档案");
	//         this.hadReciveCallback = true;
	//         self.playerDetailInfoSys.showPersonalInfoDetailPanel(true, true);
	//     },
	//     skinDataModel:this.context.dataModel,
	// });


	// 打开 Fake UserInfo
	this.bindComponent(viewRes, "WBP_ControlPanel_UserInfo", FAKEControlPanelUserInfoViewComponent, {
		clickCallback: () => {
			if (!self.checkIsDealWithCallback()) {
				return;
			}

			self.onControlPanelModuleDataReport("个人档案");
			this.hadReciveCallback = true;
			self.fakePlayerInfoDetailPageSystem.showPersonalInfoDetailPanel(true, true);
		},
	});
}
```

3. 创建对应的 FAKEPlayerInfoDetailPageSystem.ts`
```ts 
// 为达到简化目的，这个 System 接口里只定义打开和关闭主界面两个接口
export interface IFAKEPlayerInfoDetailPageSystem {
    showPersonalInfoDetailPanel(isSelf?: boolean, needingAnim?: boolean): void; 
    closePersonalInfoDetailPanel(exit?: boolean): void;
}
```

`TKPartyGameSystemIocConfig.ts`
```ts 
    //#region 个人信息
    iocBindCfg<ITKPGPlayerInfoDetailPageSystem>(TKPartyGameSystemObjectDefine.TKPGPlayerInfoDetailPageSystem, EBindLifetime.Singleton, TKPGPlayerInfoDetailPageSystem),
    //#endregion

    //#region FAKE 个人信息
    iocBindCfg<IFAKEPlayerInfoDetailPageSystem>(TKPartyGameSystemObjectDefine.FAKEPlayerInfoDetailPageSystem, EBindLifetime.Singleton, FAKEPlayerInfoDetailPageSystem),
    //#endregion
```
在  config 中引用
![](file-20260207164543684.png)

4. 实现 `FAKEPlayerInfoDetailPageSystem`
```ts
//打开个人信息详情界面
public showPersonalInfoDetailPanel(isSelf?: boolean, needingAnim?: boolean): void {

	LoggerUtils.log("FAKEPlayerInfoDetailPageSystem", "showPlayerInfoDetailPanel", "isSelf", isSelf, "needingAnim", needingAnim);

	// 这里直接用伪造的数据打开
	this.openUI(TKPartyGameSystemWindowDefine.FakePersonalInformationUI, FAKEPlayerInfoDetailPageController, {
			currData: fakePlayerDetailPageInfo,
			needAnmin: false,
	});

}

//关闭个人信息详情界面
public closePersonalInfoDetailPanel(exit: boolean = true): void {
	let isOpen = this.isWindowOpen(TKPartyGameSystemWindowDefine.FakePersonalInformationUI);

	LoggerUtils.log("FAKEPlayerInfoDetailPageSystem", `closePersonalInfoDetailPanel exit:${exit} isOpen:${isOpen}`);

	if (!isOpen) {
		return;
	}
	
	// 关闭窗口的方法
	this.windowMgr.destroyWindow(TKPartyGameSystemWindowDefine.FakePersonalInformationUI)
}
```

5. 用 debug 截到的假数据 `FAKEPlayerInfoDetailPageSystem.ts`
```ts
// 伪造 Player Info Data
const fakePlayerDetailPageInfo: TikiPlayerDetailPageInfo = {
    uid: 107374192401n,
    isSelf: true,
    avatarID: 31,
    headID: 210001,
    actionData: {TogetherActionID: -1, AvatarActionID: 220002, HumanActionID: 221001},
    name: "测试玩家",
    biography: "这是一个假的个人简介",
    recordList: {GameCount: 0, WinCount: 0, StunCount: 0, TreasureChestCount: 0},
    levelInfo: {
        iUserLevel: 1,
        iTotalExpValue: 233,
    },
    AvatarActionList: [220002],
    HumanActionList: [220002, 221001],
    TogetherActionList: [220002, 221001],
    hadHeadIdList: [210001, 210028],
    gender: 1,
    equipData: {} as SOCClient.ITUserEquipNode,
    rankedInfo: {
        iRankPoints: 0,
        iRankedLevel: 1,
        iRankInterval: 1,
        iPointThreshold: 30,
        sRankDescribe: '坑队友我在行，操作下饭就是俺',
        sRankName: '拉完了·Ⅳ'},
};

```

6. 在 `TKPartyGameSystemWindowDefine.ts` 里定义我们自建的界面的窗口信息
```ts
//个人详情界面
public static PersonalInformationUI = new WindowInfo({
	path: PlatformUIPrefix + "PersonalInformation/WB_PartyGame_PersonalInformation_PlayerSelect1.WB_PartyGame_PersonalInformation_PlayerSelect1_C",
	resType: ViewResourceType.UMG,
	layer: EWindowLayer.Normal,
	coverageType: ECoverageType.FullScreen,
	inputBlockType: EKeySheildType.NeedSheild,
	hideWidgetLayers: [EWidgetComponentLayer.CommonScreenLayer],
});  

// FAKE 个人信息界面
public static FakePersonalInformationUI = new WindowInfo({
	path: PlatformUIPrefix + "PersonalInformation/DEMO/WB_FakePersonalInformationPanel.WB_FakePersonalInformationPanel_C",
	resType: ViewResourceType.UMG,
	layer: EWindowLayer.Normal,
	coverageType: ECoverageType.FullScreen,
	inputBlockType: EKeySheildType.NeedSheild,
	hideWidgetLayers: [EWidgetComponentLayer.CommonScreenLayer],
});
```

7. 创建 `FAKEPlayerInfoDetailPageController` 和对应的 `FAKEPlayerInfoDetailPageComponent`，在  `onBind()` 中主要进行数据的绑定

8. 返回按钮的绑定 `FAKEPlayerInfoDetailPageComponent.ts`
```ts
// 返回按钮
this.bindComponent(viewRes, "WBP_CommonExitButton", TKPGCommonExitViewComponent, {
	onClick: () => {
		self.returnMainUI();
	},

	// 绑定按钮上显示的文字
	get btntext() {
		return context.returnBtntext
	}
})
```

9. 页签列表按钮的生成与绑定 `FAKEPlayerInfoDetailPageComponent.ts`
```ts
// 页签列表
this.bindComponent(viewRes, "ListView_PageTitle", (ListViewComponent<FAKEPlayerInfoDetailPageTabData>), {
	get list() {
		return context.PageTabListOptions;
	},
	itemCompClass: FAKEPlayerInfoDetailPageTabItemComponent,
	entrySelectItem: context.PageTabListOptions[0],
	
	// 将页签按钮的点击事件绑定到当前 Component 的 函数运行
	onItemClickFunc: this.onTabItemClick.bind(this),
})

// 切换页签界面的主要函数
private onTabItemClick(data: FAKEPlayerInfoDetailPageTabData) {
	LoggerUtils.log("FAKEPlayerInfoDetailPageComponent", `onMapItemClick`);

	// 切换页面
	if (data.name == "基础信息") {
		// this.showEnterAnim();
		this.showMainView();
	} else if (data.name == "光仔称号") {
		this.showTitleView();
	}
}
```

10. 以此类推，绑定所有需要动态改变的组件

11. 几个主要子窗口的打开函数，已经进行简化 `FAKEPlayerInfoDetailPageComponent.ts`
```ts
private showMainView() {
	this.setCurTabIndex(0);
	// this.personalSys.setActorShow(true);
	this.context.returnBtntext = "成分报告"
}

private showTitleView() {
	this.setCurTabIndex(3);
	// this.personalSys.setActorShow(true);
	this.context.returnBtntext = "成分报告"

	// this.triggerComponentEvent(TitlePageIsShowingEvent);
}
    
private showAvatarView() {
	LoggerUtils.log("FAKEPlayerInfoDetailPageComponent", "showAvatarView serverHeadData:" + JSON.stringify(this.context.serverHeadData))

	this.setSelectHeadItem(this.context.serverHeadData);
	this.setCurTabIndex(2);
	this.context.returnBtntext = "更换头像"
	// this.personalSys.setActorShow(true)
 }
 
 private openLevelWindow() {
	if (!this.context.currData.isSelf) {
		return
	}
	LoggerUtils.log("FAKEPlayerInfoDetailPageComponent", "openLevelWindow is start")

	this.levelSystem.openPlayerLevelUI(true, true, 0, undefined);
}
```

12. FAKE PlayerInfo 相关代码目录
![](file-20260209152349893.png)
---

## 注意
#### 代码规范
- 个人详细信息系统 `TKPGPlayerInfoDetailPageSystem` 相关的代码写得比较杂乱，后续开发时可注意顺便删除一些多余的注释，调整代码格式等

#### 如何在 UE Editor 中，游戏运行时能通过点击游戏界面中的 UMG ，来找到其对应的具体 Widget Blueprint 资产？

- 打开 Tools -> Debug -> Widget Reflector 
- ![](file-20260209114938096.png)
- 界面如下：
- ![](file-20260209115224641.png)
- 点击 Pick Hit-Testable Widgets ,然后鼠标去选中想要的画面即可
- 效果如下
- ![](file-20260209141401641.png)

#### View Component 里 getState() 的作用，以及调用时机
- 先看调用地点的代码：
`ViewComponent.ts`
```ts
protected /* virtual */ getState(props: TProps): TState {
	return undefined;
}

public bindView(viewResource: ViewResource, props?: TProps): void {
	this.viewResource = viewResource;
	let context = this.setup(props);
	this.onInit(context);
	// this.observe(()=>{
	this.onBind(viewResource, context);
	// });
	this.hasBound = true;
}
    
protected setup(props: TProps): TState & TProps {
	let reactiveProps = observable(props);
	let rawState = this.getState(reactiveProps);
	let reactiveState = observable(rawState);
	let instance = {
		state: reactiveState,
		props: reactiveProps,
		methods: {},
	};
	let context = new Proxy(instance, {
		get(target, key, receiver) {
			const { state, props, methods } = target;
			if (state && key in raw(state)) {
				return state[key];
			}
			else if (key in raw(props)) {
				return props[key];
			}
			else if (key in raw(methods)) {
				LoggerUtils.log('ViewComponent', `get method:${key.toString()}`);
				return methods[key];
			}
			else {
				//LoggerUtils.error('ViewComponent', "key not exist:" + key.toString());
			}
		},
		set(target, key, val, receiver) {
			const { state, props, methods } = target;
			if (state && key in raw(state)) {
				state[key] = val;
			}
			else if (key in raw(props)) {
				props[key] = val;
			}
			else if (key in raw(methods)) {
				methods[key] = val;
			}
			else {
				LoggerUtils.error('ViewComponent', "key not exist:" + key.toString());
			}
			return true;
		},
	});
	let ctx = context as unknown as TState & TProps;
	this.context = ctx;
	return ctx;
}

```

- 可以看到在我们为这个 ViewComponent BindView 的时候，会进行 setup，setup 的主要作用是：把 props + state 包装成“响应式对象”，再用 Proxy 把它们“融合成一个上下文 context”，这样以后，在 ViewComponent 里可以像用一个对象一样同时访问 state / props / methods。例如
`this.context.xxx`
- setup 里会调用 getState()，如果我们有对其进行重载，那么就会在这里被调用一次，也就是说它的作用是：根据初始 `props`，一次性生成 ViewCompoent 的初始 `state` 快照，简单点理解就是一个构造函数。例如
```ts
protected override getState(props: TKPGControlPanelViewProps): TKPGControlPanelViewState {
	return {
		showSkinPanel:false,
		petImgUrl:"",
		returnImgUrl:"",
		enterImgUrl:"",
		systemsList: [],
	};
}
```
