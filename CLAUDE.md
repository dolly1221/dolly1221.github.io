# CLAUDE.md — AI 辅助开发上下文

> 本文件供 AI 编码助手（CodeBuddy、Codex、Cursor 等）快速理解本项目。
> 修改本项目前请先阅读此文件。

## 项目概览

这是一个 **Hexo 静态博客**，仓库同时也是 **Obsidian 笔记库**。源笔记用 Obsidian 编写，通过 `sync-posts.js` 脚本自动转换为 Hexo 文章并部署到 GitHub Pages。

- **线上地址**：https://dolly1221.github.io
- **仓库**：https://github.com/dolly1221/dolly1221.github.io
- **主题**：Typography（非 npm 安装，git clone 到 `themes/typography/`，已入库）

## 核心架构：源笔记 → 博客 的自动转换

**不要直接编辑 `source/_posts/`** —— 它由脚本自动生成，每次同步会被清空重建。

源笔记目录（在 `scripts/sync-posts.js` 的 `SOURCE_DIRS` 中定义）：

| 目录 | 是否发布 | 说明 |
|------|---------|------|
| `TIKIstar 学习/` | ✅ | 游戏技术学习笔记 |
| `_Self/` | ✅ | 设计模式等自学 |
| `NBA2 学习/` | ✅ | NBA2 相关 |
| `_TMP/` | ✅ | 临时/练习笔记 |
| `TIKIstar BUG/` | ❌ | 工作内部，`.gitignore` 排除 |
| `TIKIstar 需求/` | ❌ | 工作内部，`.gitignore` 排除 |
| `TIKI STAR NOTEPAD.md` | ❌ | 含 GM 指令等，`.gitignore` 排除 |

## sync-posts.js 做了什么

运行 `node scripts/sync-posts.js` 时：

1. **清空** `source/_posts/` 并重建
2. **递归扫描** `SOURCE_DIRS` 中所有 `.md` 文件
3. 对每个 md：
   - 清理 IDE 内部跳转链接（`command:gongfeng...`、`file:///d:/...`、`d:\...`）→ 转为纯文本
   - 清理图片 alt 尺寸标记（`![|314x49]` → `![]`）
   - 按图片 basename 全局查找实际文件，复制到文章同名资源目录，改写引用为纯 basename
   - 生成 front-matter（title、date=源文件mtime、categories/tags=源目录名）
   - 文件名特殊字符清理（【】等移除，空格转 `-`）

## 关键文件清单

| 文件 | 作用 | 修改注意 |
|------|------|---------|
| `_config.yml` | Hexo 站点配置 | 主题相关配置（highlight 关闭、prism_plugin、feed 等）勿随意改 |
| `themes/typography/_config.yml` | 主题配置（标题、社交、配色） | 可改 title_primary/secondary、themeStyle |
| `scripts/sync-posts.js` | 核心同步脚本 | 增删发布目录改 `SOURCE_DIRS` 数组 |
| `.github/workflows/deploy.yml` | 自动部署工作流 | push 到 main 自动触发 |
| `package.json` | 依赖管理 | workflow 用 `npm ci`，改依赖后须 `npm install` 同步 lock |
| `.gitignore` | 排除规则 | 敏感内容、node_modules、workspace.json |
| `.obsidian/` | Obsidian 配置 | 已入库同步，仅 workspace.json 排除 |

## 写作与发布约定

- 新笔记放到 `SOURCE_DIRS` 中的目录，支持子目录
- 图片由 Obsidian 插件自动存到 `assets/笔记名/`，脚本会自动处理，无需手动管路径
- 文件名可含中文和特殊字符，脚本会生成 URL 安全的 slug
- 发布只需 `git push`，GitHub Actions 自动 sync + build + deploy

## 常用命令

```powershell
npm run sync     # 同步笔记到 _posts
npm run dev      # 同步 + 本地预览 (localhost:4000)
npm run build    # 构建到 public/
npm run clean    # 清理缓存
```

## 修改指南

### 想新增发布目录
编辑 `scripts/sync-posts.js` 的 `SOURCE_DIRS` 数组，加入目录名即可。

### 想换主题
1. 删除 `themes/typography/`
2. 安装新主题到 `themes/新主题名/`
3. 改 `_config.yml` 的 `theme:` 字段
4. 注意新主题的渲染器依赖（pug/ejs/stylus 等）
5. 删除 `themes/typography/.git`（若有）避免 submodule 问题

### 想调整站点信息
- 站点标题/作者：`_config.yml` 顶部
- 导航栏标题/社交链接：`themes/typography/_config.yml`

## 不要做的事

- ❌ 不要手动编辑 `source/_posts/` 下的文件（会被脚本覆盖）
- ❌ 不要把 `TIKIstar BUG/`、`TIKIstar 需求/` 加入 git 跟踪（含工作内部信息）
- ❌ 不要提交 `node_modules/`、`public/`、`db.json`
- ❌ 不要改 `themes/typography/` 内的 `.git`（已删除，避免 submodule）
