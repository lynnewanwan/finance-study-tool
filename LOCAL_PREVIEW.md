# Local Preview

## 推荐方式

不要直接用 `file://` 判断最终效果，建议在本地启动一个静态服务预览。

在终端运行：

```bash
cd /Users/lynne/.codex/visualizations/2026/07/29/中级会计/财务管理_经济法_v1/finance-study-tool_v1.3
python3 -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

## 为什么推荐这样做

- 更接近 GitHub Pages 的运行方式。
- 避免 `file://` 对本地资源加载的限制。
- 可以在上传 GitHub 前先测试入口、题库、答题、AI 按钮等功能。

## 注意

`localhost` 和 GitHub Pages 不是同一个域名，所以不能直接读取线上 GitHub Pages 里的历史 localStorage。历史记录迁移的最终验证仍需要在 GitHub Pages 同一地址下测试。
