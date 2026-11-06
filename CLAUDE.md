# CLAUDE.md — AI 辅助开发上下文

> 本文件供 AI 编码助手（CodeBuddy、Codex、Cursor 等）快速理解本项目。
> 修改本项目前请先阅读此文件。
> 跨 agent 的规则速查另见 `AGENTS.md`，两者内容一致，以本文件为准。

## 项目概览

这是一个 **Hexo 静态博客**，仓库同时也是 **Obsidian 笔记库**。源笔记用 Obsidian 编写，通过 `sync-posts.js` 脚本自动转换为 Hexo 文章并部署到 GitHub Pages。

- **线上地址**：https://dolly1221.github.io
- **仓库**：https://github.com/dolly1221/dolly1221.github.io
- **主题**：当前为 **Cactus**（`theme: cactus`，自带 `dark` 配色）。仓库里同时保留 `themes/typography/`、`themes/oasis/`、`themes/cactus/`，改 `_config.yml` 的 `theme:` 即可切换。
- **状态说明**：以上是记录时的快照；实际以 `_config.yml`、`git log -1` 与 `git status` 为准。

## 目录结构（重要）

**笔记内容统一收在 `notes/` 下**，与 Hexo 工程文件分层：

```text
dolly1221.github.io/
├── notes/                    ← 用户笔记（vault 内容）
│   ├── TIKIstar 学习/        （含 assets/）
│   ├── _Self/                （含 daily/）
│   ├── NBA2 学习/
│   ├── _TMP/                 （含 assets/）
│   └── assets/               ← 根 assets 历史遗留
├── .obsidian/                ← 必须留在仓库根（vault root）
├── .github/ scripts/ source/ themes/   ← Hexo 工程，零改动
└── _config.yml package.json AGENTS.md CLAUDE.md README.md
```

- `.obsidian/` **不要**移进 `notes/`，否则 Obsidian 配置与 `.gitignore` 规则全部错位。
- Obsidian 附件插件的 `attachmentFolderPath` 是相对笔记的 `./assets/${noteFileName}`：移动笔记要连同级 `assets/` 一起搬，不要把 md 平铺到单一目录。
- `.gitignore` 里带路径的规则已改成 `notes/...`；再调整目录时须同步检查。

## 核心架构：源笔记 → 博客 的自动转换

**不要直接编辑 `source/_posts/`** —— 它由脚本自动生成，每次同步会被清空重建。

源笔记目录（在 `scripts/sync-posts.js` 的 `SOURCE_DIRS` / `DAILY_DIRS` 中定义，均带 `notes/` 前缀）：

| 目录 | section | 是否发布 | 说明 |
|------|---------|---------|------|
| `notes/TIKIstar 学习/` | blog | ✅ | 游戏技术学习笔记 |
| `notes/_Self/` | blog | ✅ | 设计模式等自学（`daily/` 子目录会被跳过） |
| `notes/NBA2 学习/` | blog | ✅ | NBA2 相关 |
| `notes/_TMP/` | blog | ✅ | 临时/练习笔记 |
| `notes/_Self/daily/` | daily | ✅ | 日常想法，单独列表页 |
| `TIKIstar BUG/` | — | ❌ | 工作内部，`.gitignore` 排除 |
| `TIKIstar 需求/` | — | ❌ | 工作内部，`.gitignore` 排除 |
| `TIKI STAR NOTEPAD.md` | — | ❌ | 含 GM 指令等，`.gitignore` 排除 |

`category` 取目录 **basename**，所以分类名仍是 `TIKIstar 学习` 等，不带 `notes/` 前缀；归档 URL 不随目录层级变化。

## sync-posts.js 做了什么

运行 `node scripts/sync-posts.js`（或 `npm run sync`）时：

1. **读取**上一轮 `source/_posts/` 里每篇文章的 `date`（在清空之前）
2. **清空** `source/_posts/` 并重建
3. 扫描 `SOURCE_DIRS`（blog）与 `DAILY_DIRS`（daily），图片索引额外覆盖 `ASSET_DIRS`
4. 对每个 md：
   - **剥离并解析**源文档顶部的 YAML header（简单 `key: value`；`#` 注释忽略），避免它出现在正文里
   - 清理 IDE 内部跳转链接（`command:gongfeng...`、`file:///d:/...`、`d:\...`）→ 转为纯文本
   - 清理图片 alt 尺寸标记（`![|314x49]` → `![]`）
   - 按图片 basename 全局查找实际文件，复制到文章同名资源目录，改写引用为纯 basename
   - 生成**唯一一段** front-matter：`title`（文件名）、`date`、`section: blog|daily`、`categories`/`tags`、`show_header`（默认 `false`）、`header`（源 header 的自定义字段）
   - 文件名特殊字符清理（【】等移除，空格转 `-`）；**`_` 开头的 md 是模板，不发布**

`date` 优先级：**源 header 的 `date` > 沿用上一轮同名文章的 `date` > 文件 mtime**。这样移动/编辑笔记或 CI checkout 刷新 mtime 时，已发布文章的 permalink 不会变化。

## 关键文件清单

| 文件 | 作用 | 修改注意 |
|------|------|---------|
| `_config.yml` | Hexo 站点配置 | `theme:` 与 `theme_config.colorscheme: dark`；`highlight`/`prism_plugin`/`feed` 勿随意改 |
| `scripts/sync-posts.js` | 核心同步脚本 | 增删发布目录改 `SOURCE_DIRS` / `DAILY_DIRS`（带 `notes/` 前缀）；front-matter 与日期逻辑在此 |
| `source/daily/index.md` | `/daily/` 列表页 | `type: daily`，由 `page.ejs` 的 daily 分支渲染 |
| `notes/_Self/daily/_template.md` | daily 文档模板 | 新文档默认 `show_header: false` + 创建当天 `date` |
| `themes/cactus/_config.yml` | 当前主题配置 | `nav` 只有 daily/blog；示例账号链接已替换 |
| `themes/cactus/layout/index.ejs` | 首页 | 只列 `section: blog` 的文章 |
| `themes/cactus/layout/page.ejs` | 页面模板 | `type: daily` 分支只列 daily 文章 |
| `themes/cactus/layout/post.ejs` | 文章模板 | `show_header: true` 时才展示 header 信息块 |
| `.github/workflows/deploy.yml` | 自动部署工作流 | push 到 main 自动触发 |
| `package.json` | 依赖管理 | workflow 用 `npm ci`，改依赖后须 `npm install` 同步 lock |
| `.gitignore` | 排除规则 | 敏感内容、node_modules、workspace.json；含路径的规则带 `notes/` 前缀 |
| `.obsidian/` | Obsidian 配置 | 留在仓库根，仅 workspace.json 排除 |

## 当前定制约定（务必遵循）

### 导航与内容分区
- 导航**只有两个 tab**：`daily: /daily/` 和 `blog: /`；**首页即 blog**，不要加 archives / tags / categories tab。
- `blog` = `SOURCE_DIRS` 四个目录的现有学习文档；`daily` = `notes/_Self/daily/` 的文档。
- 文章用 front-matter 的 `section: blog|daily` 分区；首页只列 blog，`/daily/` 只列 daily。
- 如果用户要求 blog 不包含现有学习文档，清空 `SOURCE_DIRS` 即可（当前是包含）。

### daily 文档（最重要）
- 放在 `notes/_Self/daily/`；**文件名不以日期开头**，用简短标题，文章 `title` 就是文件名。
- 顶部写 YAML header，模板见 `notes/_Self/daily/_template.md`：
  ```yaml
  ---
  show_header: false
  date: YYYY-MM-DD
  keywords:
  mood:
  note:
  ---
  ```
- `date` 填**创建当天日期并写死**，之后编辑不再改变；**不要用文件系统 mtime/birthtime 当稳定日期**（git checkout / CI 会重置，线上日期会集体跑偏）。日期显示在列表左侧。
- `show_header` 默认 `false`：header 只用于记录信息、便于查询，页面完全不显示；改成 `true` 才在文章页顶部列出 header 字段。
- 自定义字段可任意增删（简单 `key: value`）；空值字段不会写进文章。
- **为用户创建新 daily 文档/模板时，默认 `show_header: false` 并自动填入创建当天日期。**

### 主题与配色
- 新增配色一律用「**覆盖层 CSS + 配置追加**」，不改主题模板或 stylus 源文件；原有 `light`/`dark` 等方案保持可回退。
- Typography：`themes/typography/_config.yml` 的 `themeStyle` 支持 `light` / `dark` / `gruvbox`，覆盖层是 `themes/typography/source/css/gruvbox.css`。
- Oasis：`themes/oasis/_config.yml` 的 `stylesheets` 追加 `/css/gruvbox.css`。
- Cactus：站点 `_config.yml` 的 `theme_config.colorscheme: dark`（写在站点侧，避免更新主题被覆盖）。
- Gruvbox Dark Soft 色板：`#32302f` 底、`#ebdbb2` 字、`#3c3836` 代码区/面板、`#504945` 边框；强调色 `#fabd2f` 黄、`#83a598` 蓝、`#8ec07c` 绿、`#fb4934` 红、`#b8bb26` 黄绿、`#d3869b` 紫、`#fe8019` 橙；注释 `#928374`、弱化文字 `#a89984`。
- 主题目录中模板加载 CSS 的分支（`head.pug` / `stylesheets` 配置）必须保留，否则配色不生效。
- 主题以普通文件入库；克隆自带的 `.git` 要移到仓库外备份，避免被 Git 当成 gitlink。

## 写作与发布约定

- 新笔记放到 `notes/` 下的 `SOURCE_DIRS` 目录，或 `notes/_Self/daily/`，支持子目录
- 图片由 Obsidian 插件存到笔记同级的 `assets/笔记名/`，脚本按 basename 全局索引，无需手动管路径
- 文件名可含中文和特殊字符，脚本会生成 URL 安全的 slug
- 发布只需 `git push`，GitHub Actions 自动 sync + build + deploy
- **未经用户明确要求，不要 `git commit` / `git push`**；新文件（CSS、主题目录、模板）必须 `git add` 才会随部署生效

## 常用命令

```powershell
npm ci              # 安装依赖（本地预览前）
npm run sync        # 同步笔记到 _posts
npm run dev         # 同步 + 本地预览 (localhost:4000)
npm run server      # 仅本地预览
npm run build       # 构建到 public/
npm run clean       # 清理缓存
```

改了 `_config.yml`、主题模板或 `sync-posts.js` 后，先 `hexo clean` 再重启预览服务（配置是启动时加载的）。

## 修改指南

### 想新增发布目录
编辑 `scripts/sync-posts.js` 的 `SOURCE_DIRS`（blog）或 `DAILY_DIRS`（daily）数组，路径带 `notes/` 前缀。

### 想换主题
1. 把新主题放到 `themes/新主题名/`，**以普通文件形式**（移除克隆自带的 `.git`）
2. 改 `_config.yml` 的 `theme:` 字段
3. 检查渲染器依赖（pug/ejs/stylus 等）与主题自带示例链接/菜单
4. 保留旧主题目录以便回退，不要删除

### 想调整站点信息
- 站点标题/作者：`_config.yml` 顶部
- 导航：`themes/<当前主题>/_config.yml` 的 `nav`

## 不要做的事

- ❌ 不要手动编辑 `source/_posts/` 下的文件（会被脚本覆盖）
- ❌ 不要把 `TIKIstar BUG/`、`TIKIstar 需求/` 加入 git 跟踪（含工作内部信息）
- ❌ 不要提交 `node_modules/`、`public/`、`db.json`
- ❌ 不要给 daily 文档文件名加日期前缀
- ❌ 不要用文件修改/创建时间当作发布到线上的日期
- ❌ 不要把 `.obsidian/` 移进 `notes/`，也不要把笔记 md 平铺到单一目录
- ❌ 不要在用户未明确要求时提交或推送
