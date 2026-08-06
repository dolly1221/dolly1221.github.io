# lzzlli 的学习笔记

基于 Hexo 的个人技术博客，使用 [Typography](https://github.com/SumiMakito/hexo-theme-typography) 主题，通过 GitHub Pages 自动部署。

**线上地址**：https://dolly1221.github.io

## 项目特点

- **源笔记与博客分离**：在源目录用 Obsidian 写作，`sync-posts.js` 自动同步到 Hexo
- **图片自动处理**：Obsidian 粘贴的图片路径自动修正、复制到文章资源目录
- **IDE 链接自动清理**：md 中的 `command:gongfeng...`、本地绝对路径等无效链接自动转为纯文本
- **自动部署**：`git push` 后 GitHub Actions 自动构建发布

## 目录结构

```
lzzlli/
├─ TIKIstar 学习/      # 源笔记（发布）- 游戏技术学习
├─ _Self/              # 源笔记（发布）- 设计模式等自学
├─ NBA2 学习/          # 源笔记（发布）- NBA2 相关
├─ _TMP/               # 源笔记（发布）- 临时/练习
├─ TIKIstar BUG/       # 不发布（.gitignore 排除，含工作内部信息）
├─ TIKIstar 需求/      # 不发布（同上）
├─ assets/             # 图片资源（部分笔记的图片）
├─ .obsidian/          # Obsidian 配置（已同步，workspace.json 除外）
├─ source/_posts/      # Hexo 文章（sync-posts.js 自动生成，勿手改）
├─ themes/typography/   # Hexo 主题
├─ scripts/sync-posts.js  # 核心同步脚本
├─ _config.yml         # Hexo 站点配置
├─ package.json
└─ .github/workflows/deploy.yml  # 自动部署工作流
```

## 日常写作流程

### 1. 写笔记

在 Obsidian 中打开本仓库，在以下任一目录创建/编辑 md 文件：

- `TIKIstar 学习/`、`_Self/`、`NBA2 学习/`、`_TMP/`

支持子目录。图片照常粘贴，Obsidian 插件会自动保存到 `assets/笔记名/` 并插入引用。

### 2. 本地预览（可选）

```powershell
npm run dev    # 先同步笔记再启动本地服务器，访问 http://localhost:4000
```

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
npm install
```

用 Obsidian 打开 `lzzlli` 文件夹即可。**注意**：每次开始工作前先 `git pull`，工作完再 `git push`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run sync` | 同步源笔记到 `source/_posts`（不启动服务器） |
| `npm run dev` | 同步 + 启动本地预览服务器 |
| `npm run build` | 构建静态文件到 `public/` |
| `npm run clean` | 清理构建缓存 |

## 技术栈

- Hexo 7 + Typography 主题
- Node.js 18+
- GitHub Actions + GitHub Pages
- Obsidian（写作端，配置已随仓库同步）
