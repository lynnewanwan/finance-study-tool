# 中级会计财务管理刷题诊断工具

一个仅个人使用的浏览器学习工具，用于中级会计《财务管理》科目的真题摸底、薄弱点诊断和错题强化。

当前版本：v1

## 功能

- 30 道单选题摸底测试
- 答题后即时显示答案和解析
- 自动统计累计答题数和正确率
- 自动识别薄弱知识点
- 根据薄弱点进行强化练习
- 支持错题复习
- 使用浏览器本地保存记录
- 显示题库来源和核验状态

## 当前题库

- 科目：财务管理
- 年份：2023、2024、2025
- 题型：单选题
- 数量：51 道
- 来源：本地 PDF 真题资料
- 状态：已核验

## 使用方式

直接访问已发布的 GitHub Pages 链接即可使用。

如果在本地运行：

```bash
python3 -m http.server 8787
```

然后打开：

```text
http://127.0.0.1:8787/
```

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
├── questions.json
├── sources.md
└── docs
    ├── PRD.md
    ├── ROADMAP.md
    └── QUESTION_SCHEMA.md
```

## 数据保存

本工具使用浏览器 `localStorage` 保存答题记录。

- 不需要登录
- 不上传学习记录
- 不跨设备同步
- 清除浏览器数据后记录会丢失

## 版本定位

v1 是一个可用原型，目标是验证学习闭环：

```text
真题摸底 -> 发现短板 -> 薄弱点强化 -> 错题复习
```

后续版本会接入 AI，用于生成变式题、错因解释、知识卡片和每日复习计划。

## 文档

- 产品需求：[docs/PRD.md](./docs/PRD.md)
- 迭代路线：[docs/ROADMAP.md](./docs/ROADMAP.md)
- 题库格式：[docs/QUESTION_SCHEMA.md](./docs/QUESTION_SCHEMA.md)
- 扩展题源：[sources.md](./sources.md)
