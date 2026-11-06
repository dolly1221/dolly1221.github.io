# lzzlli 的学习笔记

基于 Hexo 的个人技术博客，使用 **Cactus** 主题（`dark` 配色），通过 GitHub Pages 自动部署。仓库同时是 Obsidian 笔记库：笔记写在 `notes/`，由 `scripts/sync-posts.js` 转成 Hexo 文章。

**线上地址**：https://dolly1221.github.io

## 项目特点

- **笔记与工程分层**：用户内容统一放在 `notes/`，Hexo 工程文件留在根目录
- **daily / blog 分区**：首页即 blog（学习文档），`/daily/` 单独列日常想法；导航只有这两项
- **图片自动处理**：Obsidian 粘贴的图片按 basename 全局索引，复制到文章资源目录并改写引用
- **IDE 链接自动清理**：md 中的 `command:gongfeng...`、本地绝对路径等无效链接自动转为纯文本
- **隐藏 header**：md 顶部 YAML header 不进入正文；`show_header: false` 时页面完全不显示
- **日期稳定**：已发布文章沿用上一轮生成结果的 `date`，移动或编辑笔记不会改变 permalink
- **自动部署**：push 到 `main` 后 GitHub Actions 自动 sync + build + deploy

## 目录结构

```
dolly1221.github.io/
├─ notes/                      ← 所有笔记内容（Obsidian vault 内容）
│  ├─ TIKIstar 学习/           # blog：游戏技术学习（含 assets/）
│  ├─ _Self/                   # blog：设计模式等自学
│  │  └─ daily/                # daily：日常想法，_template.md 是模板
│  ├─ NBA2 学习/               # blog：NBA2 相关
│  ├─ _TMP/                    # blog：临时/练习（含 assets/）
│  └─ assets/                  # 历史图片资源
├─ .obsidian/                  # Obsidian 配置，必须留在仓库根（vault root）
├─ source/_posts/              # Hexo 文章（sync-posts.js 自动生成，勿手改）
├─ source/daily/index.md       # /daily/ 列表页
├─ scripts/sync-posts.js       # 核心同步脚本
├─ themes/cactus/              # 当前主题（typography / oasis 保留以便回退）
├─ _config.yml                 # Hexo 站点配置
├─ .github/workflows/deploy.yml
├─ AGENTS.md / CLAUDE.md       # 跨 agent 协作规则
└─ package.json
```

> `.obsidian/` 不要移进 `notes/`。Obsidian 附件插件按 `./assets/${noteFileName}` 存图，移动笔记时须连同同级 `assets/` 一起搬，不要把 md 平铺到单一目录。

## 日常写作流程

### 1. 写笔记

在 Obsidian 中打开**仓库根目录**，在 `notes/` 下的发布目录创建/编辑 md：

- `notes/TIKIstar 学习/`、`notes/_Self/`、`notes/NBA2 学习/`、`notes/_TMP/` → 首页 blog
- `notes/_Self/daily/` → `/daily/`

支持子目录。图片照常粘贴即可。文件名以 `_` 开头的 md 是模板，不会发布。

daily 文档**文件名不带日期前缀**（用简短标题，日期由列表左侧显示）；顶部 header 模板见 `notes/_Self/daily/_template.md`，`show_header: false` 默认隐藏，`date` 写死创建当天日期。

### 2. 本地预览（可选）

```powershell
npm ci          # 首次使用
npm run dev     # 先同步笔记再启动本地服务器，访问 http://localhost:4000
```

改过 `_config.yml`、主题模板或 `sync-posts.js` 后，先 `npm run clean` 再重启预览服务。

### 3. 发布

```powershell
git add .
git commit -m "更新笔记"
git push
```

GitHub Actions 约 1-2 分钟后自动更新网站。

## 多电脑协作

新电脑首次使用：

```powershell
git clone https://github.com/dolly1221/dolly1221.github.io.git lzzlli
cd lzzlli
npm ci
```

用 Obsidian 打开 `lzzlli` 文件夹即可。**注意**：每次开始工作前先 `git pull`，工作完再 `git push`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run sync` | 同步源笔记到 `source/_posts`（不启动服务器） |
| `npm run dev` | 同步 + 启动本地预览服务器 |
| `npm run server` | 仅启动本地预览服务器 |
| `npm run build` | 构建静态文件到 `public/` |
| `npm run clean` | 清理构建缓存 |

## 技术栈

- Hexo 7 + Cactus 主题
- Node.js 18+
- GitHub Actions + GitHub Pages
- Obsidian（写作端，配置已随仓库同步）
