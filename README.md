# Cookie LocalStorage Exporter

[English](README.en.md) | [简体中文](README.md)

> 点击扩展弹窗后，从当前 Chrome / Edge 标签页读取 cookies 和 `localStorage`，并复制为格式化 JSON。

Cookie LocalStorage Exporter 是一个面向 Chrome 和 Edge 的极简 Manifest V3 扩展。点击扩展弹窗后，它会读取当前 `http(s)` 页面中的 cookies 和 `localStorage`，然后将结果整理成格式化 JSON 并复制到剪贴板。

## 截图

![Cookie LocalStorage Exporter popup](store/assets/chrome-web-store-screenshot-1.png)

## 它能做什么

- 在弹窗中显示当前标签页的标题、host 和 favicon。
- 通过 Chrome host permissions 读取 `http(s)` 页面相关 cookies，包括父域名 cookies。
- 优先按当前标签页 URL 读取 cookies，在必要时回退到 apex 风格域名查询。
- 通过 `chrome.scripting.executeScript` 从当前标签页读取 `localStorage`。
- 将结果复制为 JSON；如果剪贴板写入失败，会回退到手动复制文本框。
- 当页面没有返回 cookies 时，在弹窗中显示 cookie 查询诊断信息。
- 采集完成后，支持对 cookie 名称和 `localStorage` key 进行模糊搜索。

## 它不做什么

- 不会读取 `chrome://`、`edge://`、`about:blank`、扩展商店等非 `http(s)` 页面数据。
- 不会导出 `sessionStorage`。
- 不会保存文件，也不会触发浏览器下载流程。
- 在你点击扩展弹窗之前，不会主动读取任何标签页。

## 权限说明

扩展只使用以下必需权限：

- `cookies`：读取当前标签页相关域名的 cookies。
- `scripting`：在当前标签页执行一小段脚本，用于读取 `localStorage`。
- `activeTab`：限定扩展只操作你当前打开并点击弹窗的标签页。

同时还声明了以下 host permissions：

- `http://*/*`
- `https://*/*`

这样做的原因是 Chrome Cookies API 需要 host 访问权限，才能稳定返回 cookies，包括 `.example.com` 这种父域名 cookies。即便如此，扩展仍然只会在你点击后读取当前活动标签页。

## JSON 结构

复制出来的 JSON 顶层结构如下：

```json
{
  "capturedAt": "2026-06-14T04:00:00.000Z",
  "exporter": {
    "name": "Cookie LocalStorage Exporter",
    "version": "0.1.0"
  },
  "tab": {
    "url": "https://example.com/app",
    "title": "Example",
    "host": "example.com"
  },
  "cookies": [],
  "localStorage": {}
}
```

如果 `localStorage` 读取失败，JSON 中仍然会保留 cookies，并将 `localStorage` 设为 `{}`。对应的警告只会显示在弹窗里，不会写进 JSON。

## 本地安装

1. 打开 Chrome 或 Edge 的扩展管理页。
2. 打开开发者模式。
3. 点击 **Load unpacked** / **加载已解压的扩展程序**。
4. 选择当前仓库目录：`C:\Users\zhiyu_liu\Documents\cookie-localstorage-exporter`
5. 打开任意 `http(s)` 页面，然后点击扩展图标。

## 常见问题

### 为什么有些 cookies 读不到？

浏览器扩展能读取哪些 cookies，取决于当前标签页 URL、host permissions、cookie domain 和浏览器安全策略。扩展会尝试父域名回退查询，但仍可能存在扩展不可访问的 cookies。

### 为什么 `chrome://` 或扩展商店页面不能用？

Chrome 和 Edge 不允许普通扩展在浏览器内部页面、扩展商店页面等受限 URL 中注入脚本或读取页面数据。

### 剪贴板复制失败怎么办？

使用弹窗里的手动复制回退方案。浏览器阻止剪贴板写入、弹窗失焦等情况都可能导致自动复制失败。

## 鸣谢

- 特别感谢 [Linux.do](https://linux.do/) 和 [V2EX](https://www.v2ex.com/) 社区，以及其他网友在开发与调试过程中提供的反馈、讨论与支持。

## 敏感数据提醒

Cookies 和 `localStorage` 里经常会包含登录态、账号标识、令牌和页面状态。请把导出的 JSON 当作敏感数据处理，不要随意粘贴到聊天工具、工单系统或日志里，除非你明确打算暴露这些内容。

## 开源协议

当前仓库尚未包含明确的 license 文件。正式分发、打包或接受外部贡献前，建议补充明确的开源协议。
