# GitHub Upload Checklist

v3.0 上传 GitHub Pages 时，请上传本目录下全部正式文件和文件夹。

## 必须上传

- `index.html`
- `styles.css`
- `app.js`
- `questions.json`
- `questions-data.js`
- `knowledge-base.json`
- `knowledge-base-data.js`
- `quality-rules.json`
- `quality-rules-data.js`
- `generated-questions.json`
- `generated-questions-data.js`
- `edge-functions/`
- `README.md`
- `CHANGELOG.md`
- `LOCAL_PREVIEW.md`
- `DATA_MIGRATION_AND_BACKUP.md`
- `V2_DESIGN_NOTES.md`
- `V3_FULL_IMPORT_REPORT.md`

## 可一起上传

- `ECONOMIC_LAW_IMPORT_REPORT.md`
- `FINANCIAL_MANAGEMENT_PUBLIC_IMPORT_REPORT.md`
- `GITHUB_UPLOAD_CHECKLIST.md`

## 不建议上传

- `.DS_Store`
- `questions.backup-before-full-import.json`
- `questions-data.backup-before-full-import.js`

## 上传后测试

1. 打开 GitHub Pages 地址。
2. 首页能看到财务管理和经济法两张卡片。
3. 首页公告显示 `v3.0 已升级`。
4. 财务管理可进入并开始新一轮测试。
5. 经济法可进入并开始新一轮测试。
6. 能抽到单选题、多选题、判断题。
7. 多选题答错后能看到“你错选了 / 漏选正确项”。
8. 完成页能看到分题型统计标签。
9. AI 解题按钮可调用 CloudBase 或 fallback 代理。
10. AI动态测试中不会直接出现当前错题集原题。
11. 复习错题会打乱选项。
12. 导出学习记录按钮可下载 JSON。
