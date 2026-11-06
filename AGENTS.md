# AGENTS.md — 跨 agent 协作规则速查

> 完整上下文见 `CLAUDE.md`。本文件自包含，可直接遵循；两份文件内容一致，冲突时以 `CLAUDE.md` 为准。
> 适用对象：任何在本仓库工作的 AI 编码助手。

## 状态与纪律

- 当前线上 `main` 与本地均为 **Cactus 主题 + 自带 `dark` 配色**，导航为 daily / blog（自提交 `319de05` 起）。三套主题目录都在 `themes/`，改 `_config.yml` 的 `theme:` 即可切换。
- 以上是记录时的快照；实际状态以 `_config.yml`、`git log -1` 与 `git status` 为准。
- **未经用户明确要求，不要 `git commit` / `git push`**。新文件必须 `git add` 才会随部署生效。
- 回答用户用中文。

## 目录结构

- **笔记内容统一放在 `notes/`**：`notes/TIKIstar 学习/`、`notes/_Self/`、`notes/NBA2 学习/`、`notes/_TMP/`、`notes/assets/`；各笔记目录下的 `assets/笔记名/` 与笔记同级，跟着一起移动。
- **`.obsidian/` 必须留在仓库根**（vault root），不要移进 `notes/`。
- Hexo 工程文件（`_config.yml`、`package.json`、`scripts/`、`source/`、`themes/`、`.github/`）留在根目录。
- Obsidian 附件插件的 `attachmentFolderPath` 是相对笔记的 `./assets/${noteFileName}`：移动笔记要连同 `assets/` 一起搬，不要把 md 平铺到单一目录。
- `.gitignore` 里带路径的规则已改为 `notes/...`；再移动笔记目录时须同步检查。

## 内容管线（核心）

- `source/_posts/` 由 `scripts/sync-posts.js` **每次清空重建**，禁止手工编辑；要改 front-matter 就改脚本。
- 源目录为脚本的 `SOURCE_DIRS`（4 个 `notes/` 目录，section: blog）与 `DAILY_DIRS`（`notes/_Self/daily`，section: daily）。`category` 取目录 basename，分类名仍是 `TIKIstar 学习` 等，不带 `notes/` 前缀。
- 导航**只有** `daily: /daily/` 与 `blog: /`；**首页即 blog**，只列 blog 文章；`/daily/` 只列 daily 文章。不要加 archives / tags / categories tab。
- `_` 开头的 md 是模板，不发布。
- 同步脚本会**剥离**源 md 顶部的 YAML header 并合并成生成文章的唯一一段 front-matter，header 不会出现在网页正文里。
- 日期优先级：源 header 的 `date` > **沿用上一轮 `source/_posts/` 同名文章的 date** > 文件 mtime。因此移动/编辑笔记或 CI checkout 都不会改变已发布文章的 permalink。

## daily 文档规则

- 放在 `notes/_Self/daily/`；**文件名不以日期开头**，用简短标题（文章 title = 文件名）。
- 顶部写 YAML header：

```yaml
---
show_header: false
date: YYYY-MM-DD
keywords:
mood:
note:
---
```

- `date` 填**创建当天的日期并写死**，之后编辑不改；**不要用文件系统 mtime / birthtime 当稳定日期**（git checkout、CI 会重置，线上日期会集体跑偏）。日期由列表左侧显示。
- `show_header` 默认 `false`：header 只记录信息、便于查询，页面完全不显示；改成 `true` 才在文章页顶部列出 header 字段。
- 自定义字段可任意增删（简单 `key: value`，`#` 注释忽略，空值不写入）。
- 模板：`notes/_Self/daily/_template.md`。**为用户创建新 daily 文档或模板时，默认 `show_header: false` 并自动填入创建当天日期。**

## 主题与配色

- 新增配色一律用「**覆盖层 CSS + 配置追加**」，不改主题模板或 stylus 源文件；原有方案保持可回退。模板里加载 CSS 的分支必须保留。
- Gruvbox Dark Soft 色板：`#32302f` 底、`#ebdbb2` 字、`#3c3836` 代码区/面板、`#504945` 边框；`#fabd2f` 黄、`#83a598` 蓝、`#8ec07c` 绿、`#fb4934` 红、`#b8bb26` 黄绿、`#d3869b` 紫、`#fe8019` 橙、`#928374` 注释、`#a89984` 弱化文字。
- Typography：`themeStyle: light|dark|gruvbox`；Oasis：`stylesheets` 追加 `/css/gruvbox.css`；Cactus：站点 `_config.yml` 的 `theme_config.colorscheme: dark`。
- 主题目录以普通文件入库；克隆自带的 `.git` 移到仓库外备份，避免变成 gitlink。

## 工程约定

- 本地预览：`npm ci` → `npm run server`（localhost:4000）；`npm run sync` 手动同步。
- 改了 `_config.yml`、主题模板或 `sync-posts.js` 后，先 `hexo clean` 再重启预览服务。
- push 到 `main` 会触发 GitHub Actions（sync-posts + hexo generate + deploy）。
- 不提交 `node_modules/`、`public/`、`db.json`；不把 `TIKIstar BUG/`、`TIKIstar 需求/` 加入 git 跟踪。
