---
title: "Push With Different Account"
description: 
date: 2025-05-14T04:57:39+08:00
image: 
math: 
license: 
hidden: false
comments: true
draft: true
---

## 🧰 方法 3：使用 SSH 管理多个 GitHub 账号
我们假设：
- 你的旧账号是：olduser
- 你的新账号是：dolly1221
- 想同时提交不同的项目到不同账号的仓库

## 🛠️ 步骤 1：为两个账号生成不同的 SSH key
打开终端（Git Bash / PowerShell / CMD），执行以下命令：

### 为旧账号生成 SSH key：
```bash
ssh-keygen -t ed25519 -C "olduser@example.com" -f ~/.ssh/id_ed25519_old
```
- 按提示一路回车（除非你想设置密码）

### 为新账号 dolly1221 生成 SSH key：
```bash
ssh-keygen -t ed25519 -C "dolly1221@example.com" -f ~/.ssh/id_ed25519_dolly
```
- 每次生成时都用不同的 -f 文件名，防止覆盖。

## 📎 步骤 2：添加 SSH key 到 GitHub
登录你的两个 GitHub 账号分别做：
1. 打开 GitHub SSH Key 设置页面
2. 点“New SSH Key”
3. Title 写清楚哪个账号用的，比如：MyLaptop - dolly
4. 打开对应 key 文件复制内容：
```bash
# 复制旧账号的 key
cat ~/.ssh/id_ed25519_old.pub

# 复制新账号的 key
cat ~/.ssh/id_ed25519_dolly.pub
```
5. 粘贴并保存

## 🛠️ 步骤 3：配置 SSH 使用不同的 key（重点）
编辑或创建配置文件：
```bash
notepad ~/.ssh/config
```

添加以下内容（如果已有就追加）：
```ssh
# olduser 账号配置
Host github-old
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_old
  IdentitiesOnly yes

# dolly1221 账号配置
Host github-dolly
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_dolly
  IdentitiesOnly yes
```

## 🧪 步骤 4：测试是否配置成功
```bash
ssh -T github-dolly
```

如果成功，会显示：
```rust
Hi dolly1221! You've successfully authenticated...
```

同理：

```bash
ssh -T github-old
```

## 🔗 步骤 5：为项目设置正确的远程地址
在你的项目目录里，设置远程地址时用 git@github-别名:username/repo.git 的形式：

### 比如你要推送到 dolly1221 账号的仓库：
```bash
git remote set-url origin git@github-dolly:dolly1221/dolly1221.github.io.git
```

### 如果是旧账号项目：
```bash
git remote set-url origin git@github-old:olduser/some-old-project.git
```