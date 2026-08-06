/**
 * sync-posts.js
 * 将源笔记目录中的 Markdown 同步到 Hexo 的 source/_posts，
 * 自动完成：图片路径修正、IDE 跳转链接清理、front-matter 生成。
 *
 * 用法：node scripts/sync-posts.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');

// ========== 可配置：要发布的源目录（相对仓库根）==========
// 在此增删目录即可控制发布范围；BUG/需求类不放入即不会发布
const SOURCE_DIRS = [
  'TIKIstar 学习',
  '_Self',
  'NBA2 学习',
  '_TMP',
];
// =========================================================

const SLUG_REPLACE = /[【】\[\]()（）,，！!？?\\\/:*?"<>|]/g;
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

/* ---------- 工具函数 ---------- */

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, fn);
    } else {
      fn(full, name);
    }
  }
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) {
    for (const n of fs.readdirSync(p)) rmrf(path.join(p, n));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// 收集所有图片 basename -> 绝对路径
function buildImageIndex(dirs) {
  const index = new Map();
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    walk(abs, (full, name) => {
      if (IMG_EXT.test(name)) {
        const base = decodeURIComponent(name);
        if (!index.has(base)) index.set(base, []);
        index.get(base).push(full);
      }
    });
  }
  return index;
}

function makeSlug(relPath) {
  const base = path.basename(relPath, '.md');
  return base.replace(SLUG_REPLACE, '').trim().replace(/\s+/g, '-') || 'untitled';
}

/* ---------- 清洗 Markdown ---------- */

// 清理 IDE 内部跳转链接，保留显示文本
function cleanIdeLinks(md) {
  return md.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (m, text, url) => {
    if (/command:gongfeng/i.test(url) ||
        /^file:\/\/\/[a-z]:/i.test(url) ||
        /^[a-z]:[\\/]/i.test(url)) {
      return text;
    }
    return m;
  });
}

// 清理图片 alt 中的尺寸标记 ![|314x49](x) -> ![](x)
function cleanImgSize(md) {
  return md.replace(/!\[([^\]]*?)\|(\d+)\s*x\s*(\d+)\]/g, '![$1]');
}

// 处理图片：复制到文章资源目录，并把引用改写为纯 basename
function processImages(md, assetDir, imageIndex, log) {
  let copied = 0, missing = 0;
  const out = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, rawUrl) => {
    let url = rawUrl.split(/\s+/)[0].replace(/^["']|["']$/g, '');
    url = url.split('#')[0].split('?')[0];
    let base = path.basename(decodeURIComponent(url));
    const found = imageIndex.get(base);
    if (found && found.length) {
      ensureDir(assetDir);
      try {
        fs.copyFileSync(found[0], path.join(assetDir, base));
        copied++;
      } catch (e) { /* ignore */ }
    } else {
      missing++;
      log.push(base);
    }
    return `![${alt}](${base})`;
  });
  return { md: out, copied, missing };
}

function frontMatter(title, date, category) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `---
title: ${JSON.stringify(title)}
date: ${ds}
categories:
  - ${category}
tags:
  - ${category}
---
`;
}

/* ---------- 主流程 ---------- */

function main() {
  console.log('▶ 同步源目录:', SOURCE_DIRS.join(', '));

  // 重建 _posts
  rmrf(POSTS_DIR);
  ensureDir(POSTS_DIR);
  fs.writeFileSync(path.join(POSTS_DIR, 'README.md'),
    '# 此目录由 sync-posts.js 自动生成，请勿手动编辑。\n');

  const imageIndex = buildImageIndex(SOURCE_DIRS);
  console.log(`▶ 图片索引: ${imageIndex.size} 个图片文件`);

  let total = 0, imgsCopied = 0, imgsMissing = 0;
  const missingList = [];

  for (const dir of SOURCE_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) {
      console.log(`! 跳过不存在的目录: ${dir}`);
      continue;
    }
    const log = [];
    walk(absDir, (full) => {
      if (!/\.md$/i.test(full)) return;
      const rel = path.relative(absDir, full);
      const baseName = path.basename(full, '.md');
      const slug = makeSlug(rel);

      let md = fs.readFileSync(full, 'utf8');
      md = cleanIdeLinks(md);
      md = cleanImgSize(md);

      const assetDir = path.join(POSTS_DIR, slug);
      const r = processImages(md, assetDir, imageIndex, log);
      md = r.md;
      imgsCopied += r.copied;
      imgsMissing += r.missing;

      const stat = fs.statSync(full);
      const fm = frontMatter(baseName, stat.mtime, dir);
      fs.writeFileSync(path.join(POSTS_DIR, `${slug}.md`), fm + md, 'utf8');
      total++;
    });
    if (log.length) missingList.push(`${dir}: ${log.slice(0, 5).join(', ')}${log.length > 5 ? ' ...' : ''}`);
  }

  console.log(`\n✔ 完成：生成 ${total} 篇文章`);
  console.log(`✔ 图片：复制 ${imgsCopied} 个${imgsMissing ? `，缺失 ${imgsMissing} 个` : ''}`);
  if (missingList.length) {
    console.log('⚠ 缺失图片（引用已保留，可能无法显示）:');
    for (const m of missingList) console.log('   -', m);
  }
}

main();
