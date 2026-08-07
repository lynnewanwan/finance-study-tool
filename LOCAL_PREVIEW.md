# Local Preview

v3.0 本地预览建议使用静态服务运行。

## 启动方式

进入项目目录：

```bash
cd /Users/lynne/.codex/visualizations/2026/07/29/中级会计/中级会计_v3/finance-study-tool_v3
python3 -m http.server 8031
```

打开：

```text
http://localhost:8031/
```

开发者质检视图：

```text
http://localhost:8031/?dev=1
```

## 预览检查重点

- 首页公告显示 v3.0。
- 财务管理和经济法均可进入。
- 题目标签首位显示题型。
- 单选题、多选题、判断题均可作答。
- 多选题答错后能看到错选和漏选提示。
- 完成页展示分题型统计。
- AI 解题可正常生成。
