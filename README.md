# 🔣 Base64 Tool

> Base64 编解码工具 — 文本编解码 · 图片/文件互转 · Data URI 生成

## ✨ 功能

| 模块 | 功能 |
|---|---|
| 📝 **文本编解码** | 将文本编码为 Base64 / 将 Base64 解码为文本 |
| 🌐 **URL 安全模式** | 替换 `+/` 为 `-_`，移除 `=` 填充，用于 URL 参数 |
| 🔢 **自动换行** | 可选每 76 字符自动换行（MIME 标准） |
| 🖼️ **图片 → Base64** | 拖拽或选择图片，自动生成 Base64 + Data URI |
| 📁 **文件 → Base64** | 支持 PDF、ZIP、SVG 等任意文件格式 |
| ⬇ **Base64 → 文件** | 粘贴 Base64 数据还原为文件下载，自动识别 MIME 类型和扩展名 |
| 📊 **体积统计** | 输入输出大小对比，编码膨胀率显示 |

## 🛠 技术栈

- 纯 HTML5 + CSS3 + JavaScript
- FileReader API / Blob API
- 零外部依赖

## 🚀 部署

支持 Vercel / Netlify / Cloudflare Pages 等静态托管平台。

```bash
npx vercel --prod
```

## 🔒 隐私

所有处理在浏览器端完成，**文件不上传服务器**。

## 📄 许可

MIT
