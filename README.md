# AIDW V1.0.0 前端演示

这是 AIDW V1.0.0 的纯前端 Mock 演示仓库，使用 GitHub Pages 发布。

仓库只包含浏览器端页面、样式、脚本和脱敏 Mock 数据，不连接 AIDW FastAPI 后端、任何生产服务、本机文件或真实密钥。页面中的新增、编辑、删除和流程交互只保存在浏览器 `localStorage` 中。

## 本地预览

```bash
python3 -m http.server 8898
```

然后打开 `http://127.0.0.1:8898/`。在 GitHub Pages 的 `*.github.io` 域名上会自动启用 Mock；本地预览也可以使用 `?mock=1` 强制启用。

## 发布

推送到 `main` 分支后，GitHub Actions 会发布 GitHub Pages。页面地址：

https://tongyi1212.github.io/dw-agent/

## 版本

当前演示版本：`v1.0.0`。
