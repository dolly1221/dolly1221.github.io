# AGENTS.md — 跨 agent 协作规则速查

> 完整上下文见 `CLAUDE.md`。本文件自包含，可直接遵循；两份文件内容一致，冲突时以 `CLAUDE.md` 为准。
> 适用对象：任何在本仓库工作的 AI 编码助手。

## 状态与纪律

- 线上 `main`：Typography + Gruvbox Dark Soft；本地工作区（未提交）：`theme: cactus` + 自带 `dark`。三套主题目录都在 `themes/`，改 `_config.yml` 的 `theme:` 即可切换。
- 以上是记录时的快照；实际状态以 `_config.yml`、`git log -1` 与 `git status` 为准。
- **未经用户明确要求，不要 `git commit` / `git push`**。新文件必须 `git add` 才会随部署生效。
- 回答用户用中文。

## 内容管线（核心）

- `source/_posts/` 由 `scripts/sync-posts.js` **每次清空重建**，禁止手工编辑；要改 front-matter 就改脚本。
- 文章分 `section: blog`（`SOURCE_DIRS`：TIKIstar 学习 / _Self / NBA2 学习 / _TMP）与 `section: daily`（`_Self/daily/`）。
- 导航**只有** `daily: /daily/` 与 `blog: /`；**首页即 blog**，只列 blog 文章；`/daily/` 只列 daily 文章。不要加 archives / tags / categories tab。
- `_` 开头的 md 是模板，不发布。
- 同步脚本会**剥离**源 md 顶部的 YAML header 并合并成生成文章的唯一一段 front-matter，header 不会出现在网页正文里。

## daily 文档规则

- 放在 `_Self/daily/`；**文件名不以日期开头**，用简短标题（文章 title = 文件名）。
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
- 模板：`_Self/daily/_template.md`。**为用户创建新 daily 文档或模板时，默认 `show_header: false` 并自动填入创建当天日期。**

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
