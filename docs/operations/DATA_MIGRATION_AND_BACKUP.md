# Data Migration and Backup

日期：2026-08-05

## 1. 本次升级是否会删除历史记录

不会主动删除。

旧版财务管理记录原本保存在浏览器 localStorage：

```text
finance-study-tool-v1
```

双科版新增按科目隔离的 key：

```text
finance-study-tool-v1:financial_management
finance-study-tool-v1:economic_law
```

当用户第一次进入财务管理时，系统会检查旧 key。如果新 key 还没有记录，会把旧记录复制到财务管理新 key 下。

注意：这里是复制，不是剪切，所以旧 key 仍然保留。

## 2. migrationVersion

本次增加迁移版本标记：

```text
finance-study-tool-v1:financial_management:migrationVersion = dual-subject-v1
```

作用：

- 避免重复迁移。
- 避免用户已有新记录时被旧记录覆盖。
- 给后续 V2/V3 升级留下版本判断依据。

## 3. 数据导出

刷题诊断台侧边栏新增：

```text
导出学习记录
```

点击后会下载当前科目的 JSON 备份文件，包含：

- 导出时间
- 科目
- storageKey
- attempts 答题记录
- activeSession 未完成作答草稿

## 4. 不上传 GitHub 如何测试历史记录

可以，不一定要先上传 GitHub。

### 方法 A：用现有 GitHub Pages 测旧记录，再本地模拟

适合确认真实用户旧记录是否存在。

1. 先打开当前线上旧版 GitHub Pages。
2. 做 1-2 道财务管理题并提交。
3. 打开浏览器开发者工具。
4. 查看 Application / Local Storage。
5. 找到旧 key：`finance-study-tool-v1`。
6. 确认里面有 attempts。
7. 再打开新版页面，进入财务管理。
8. 检查是否出现累计答题、错题或历史正确率。

限制：本地 file 页面和 GitHub Pages 域名不同，localStorage 不互通。因此单纯打开本地 `file://` 页面，不能直接读取 GitHub Pages 上的旧记录。

### 方法 B：本地起一个小服务测试

适合开发时验证功能。

在项目目录运行本地静态服务，例如：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

这样能避免 `file://` 对 `fetch` 和本地资源加载的限制。

但注意：`localhost` 和 GitHub Pages 仍然不是同一个域名，因此不能直接读线上旧记录。

### 方法 C：手动复制 localStorage 测迁移

适合不上传 GitHub 前完整验证迁移逻辑。

1. 在浏览器中打开新版页面。
2. 打开开发者工具 Console。
3. 手动写入一段旧版记录到 `finance-study-tool-v1`。
4. 刷新页面，进入财务管理。
5. 检查是否生成新 key：`finance-study-tool-v1:financial_management`。

## 5. 真正上线前建议

- 先让用户在旧版页面导出或截图历史记录。
- 再上传新版。
- 用户第一次进入新版后，先进入财务管理，确认累计答题和错题仍在。
- 确认后再开始经济法。


## 6. 手动迁移兜底

本次增加“检测到旧版财务管理记录”的提示区。

出现条件：

- 当前进入的是财务管理。
- 浏览器里存在旧 key：`finance-study-tool-v1`。
- 新 key：`finance-study-tool-v1:financial_management` 还没有正式答题记录或未完成草稿。

用户可以点击：

```text
迁移旧版记录
```

系统会把旧记录复制到新的财务管理 key 下。

安全原则：

- 只复制，不删除旧记录。
- 如果当前财务管理已经有新记录，不执行覆盖。
- 迁移后会写入 `migrationVersion` 标记。
