/**
 * sync-posts.js
 * 将源笔记目录中的 Markdown 同步到 Hexo 的 source/_posts，
 * 自动完成：源文档 header 合并、图片路径修正、IDE 跳转链接清理、front-matter 生成。
 *
 * 用法：node scripts/sync-posts.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');

// ========== 可配置：要发布的学习笔记源目录（section: blog）==========
// 在此增删目录即可控制 blog 的发布范围；BUG/需求类不放入即不会发布
const SOURCE_DIRS = [
  'TIKIstar 学习',
  '_Self',
  'NBA2 学习',
  '_TMP',
];

// 日常想法目录（section: daily）：位于 _Self 下，遍历 _Self 时会跳过它
const DAILY_DIRS = [
  '_Self/daily',
];
// =========================================================

const SLUG_REPLACE = /[【】\[\]()（）,，！!？?\\\/:*?"<>|]/g;
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

// 这些字段由脚本生成，源 header 里的其它字段会收进 header 供模板使用
const SYSTEM_FIELDS = new Set([
  'title', 'date', 'section', 'categories', 'tags', 'show_header', 'header',
]);

/* ---------- 工具函数 ---------- */

function walk(dir, fn, skipDirs) {
  if (!fs.existsSync(dir)) return;
  const skip = skipDirs || [];
  for (const name of fs.readdirSync(dir)) {
    if (skip.includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, fn, skip);
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

/* ---------- 源文档 header ---------- */

// 解析并剥离源 md 顶部的简单 YAML front-matter（key: value）。
// 剥离后 header 不会再出现在正文里，也就不会被网页渲染出来。
function parseSourceHeader(md) {
  const text = md.replace(/^\uFEFF/, '');
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { fields: {}, body: md };
  const fields = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(raw.trim());
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fields[kv[1]] = v;
  }
  return { fields, body: text.slice(m[0].length) };
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

function frontMatter(title, date, category, section, fields) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  // 开关默认 false：header 只作记录，不在页面上展示
  const showHeader = String(fields.show_header || '').toLowerCase() === 'true';
  const custom = Object.keys(fields)
    .filter(k => !SYSTEM_FIELDS.has(k) && fields[k] !== '')
    .sort();

  let out = '---\n';
  out += `title: ${JSON.stringify(title)}\n`;
  out += `date: ${fields.date ? JSON.stringify(fields.date) : ds}\n`;
  out += `section: ${section}\n`;
  out += `categories:\n  - ${category}\n`;
  out += `tags:\n  - ${category}\n`;
  out += `show_header: ${showHeader}\n`;
  if (custom.length) {
    out += 'header:\n';
    for (const k of custom) out += `  ${k}: ${JSON.stringify(fields[k])}\n`;
  }
  out += '---\n';
  return out;
}

/* ---------- 主流程 ---------- */

function main() {
  const groups = [
    ...SOURCE_DIRS.map(dir => ({
      dir,
      category: dir,
      section: 'blog',
      skipDirs: dir === '_Self' ? ['daily'] : [],
    })),
    ...DAILY_DIRS.map(dir => ({
      dir,
      category: 'daily',
      section: 'daily',
      skipDirs: [],
    })),
  ];

  console.log('▶ 同步源目录:', groups.map(g => `${g.dir} (${g.section})`).join(', '));

  // 重建 _posts
  rmrf(POSTS_DIR);
  ensureDir(POSTS_DIR);
  fs.writeFileSync(path.join(POSTS_DIR, 'README.md'),
    '# 此目录由 sync-posts.js 自动生成，请勿手动编辑。\n');

  const imageIndex = buildImageIndex([...SOURCE_DIRS, ...DAILY_DIRS]);
  console.log(`▶ 图片索引: ${imageIndex.size} 个图片文件`);

  let total = 0, imgsCopied = 0, imgsMissing = 0;
  const missingList = [];

  for (const g of groups) {
    const absDir = path.join(ROOT, g.dir);
    if (!fs.existsSync(absDir)) {
      console.log(`! 跳过不存在的目录: ${g.dir}`);
      continue;
    }
    const log = [];
    walk(absDir, (full) => {
      if (!/\.md$/i.test(full)) return;
      // 下划线开头的文件是模板，不发布
      if (path.basename(full).startsWith('_')) return;
      const rel = path.relative(absDir, full);
      const baseName = path.basename(full, '.md');
      const slug = makeSlug(rel);

      let md = fs.readFileSync(full, 'utf8');
      const parsed = parseSourceHeader(md);
      md = parsed.body;
      md = cleanIdeLinks(md);
      md = cleanImgSize(md);

      const assetDir = path.join(POSTS_DIR, slug);
      const r = processImages(md, assetDir, imageIndex, log);
      md = r.md;
      imgsCopied += r.copied;
      imgsMissing += r.missing;

      const stat = fs.statSync(full);
      const fm = frontMatter(baseName, stat.mtime, g.category, g.section, parsed.fields);
      fs.writeFileSync(path.join(POSTS_DIR, `${slug}.md`), fm + md, 'utf8');
      total++;
    }, g.skipDirs);
    if (log.length) missingList.push(`${g.dir}: ${log.slice(0, 5).join(', ')}${log.length > 5 ? ' ...' : ''}`);
  }

  console.log(`\n✔ 完成：生成 ${total} 篇文章`);
  console.log(`✔ 图片：复制 ${imgsCopied} 个${imgsMissing ? `，缺失 ${imgsMissing} 个` : ''}`);
  if (missingList.length) {
    console.log('⚠ 缺失图片（引用已保留，可能无法显示）:');
    for (const m of missingList) console.log('   -', m);
  }
}

main();
