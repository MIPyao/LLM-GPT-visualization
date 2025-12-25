# Hugging Face 模型配置指南

## 问题说明

如果遇到 401 错误（Unauthorized），说明需要配置 Hugging Face API token 才能访问某些模型。

## 解决方案

### 方案 1：使用环境变量（推荐）

1. 在项目根目录创建 `.env.local` 文件
2. 添加以下内容：

```env
NEXT_PUBLIC_HUGGINGFACE_TOKEN=your_token_here
```

3. 获取 token：

   - 访问 https://huggingface.co/settings/tokens
   - 创建新的 token（选择 "Read" 权限即可）
   - 将 token 复制到 `.env.local` 文件中

4. 重启开发服务器

### 方案 2：使用浏览器 localStorage（临时方案）

在浏览器控制台运行：

```javascript
localStorage.setItem("hf_token", "your_token_here");
```

然后刷新页面。

### 方案 3：使用公开可用的模型（无需 token）

代码已默认使用 `gpt2` 模型，这是一个公开可用的模型，通常不需要 token。

如果仍然遇到 401 错误，可以尝试：

1. 检查网络连接
2. 尝试其他公开模型（如 `distilgpt2`）
3. 使用 Hugging Face API token（推荐）

## 推荐的模型

以下模型通常不需要 token 或更容易访问：

- `gpt2` - 默认模型，公开可用
- `distilgpt2` - 更小的 GPT-2 变体
- `Xenova/gpt2` - Xenova 转换的版本

## 常见问题排查

### 问题：配置了环境变量但仍然显示"未配置 API token"

**可能原因和解决方案：**

1. **环境变量名称错误**

   - ✅ 正确：`NEXT_PUBLIC_HUGGINGFACE_TOKEN`
   - ❌ 错误：`HUGGINGFACE_TOKEN`、`HUGGINGFACE_ACCESS_TOKEN`、`HF_TOKEN` 等
   - 注意：必须使用 `NEXT_PUBLIC_` 前缀才能在客户端访问

2. **未重启开发服务器**

   - Next.js 的环境变量在启动时读取
   - 添加或修改 `.env.local` 后，必须**完全停止并重启**开发服务器
   - 使用 `Ctrl+C` 停止，然后重新运行 `npm run dev`

3. **文件位置错误**

   - `.env.local` 必须在**项目根目录**（与 `package.json` 同级）
   - 不是 `app/.env.local` 或 `src/.env.local`

4. **文件格式错误**

   - 确保没有引号：`NEXT_PUBLIC_HUGGINGFACE_TOKEN=your_token_here`
   - 不要写成：`NEXT_PUBLIC_HUGGINGFACE_TOKEN="your_token_here"`（引号会被包含在值中）

5. **检查环境变量是否被读取**
   - 打开浏览器控制台，查看 `[Transformers] 环境变量检查:` 日志
   - 如果 `hasEnvToken: false`，说明环境变量未被读取
   - 如果 `hasEnvToken: true` 但 `envTokenLength: 0`，说明值是空的

### 问题：`GET /installHook.js.map 404` 错误

这是 source map 文件的警告，不影响功能。已在 `next.config.ts` 中配置忽略此警告。

如果仍然看到，可以忽略，或者：

- 这是开发环境的正常警告
- 不影响应用功能
- 生产构建时不会出现

## 注意事项

- `.env.local` 文件不应提交到 Git（已在 .gitignore 中）
- Token 应该保密，不要分享给他人
- 如果使用 localStorage 方案，token 会在浏览器中存储，刷新页面后仍然有效
- **重要**：修改 `.env.local` 后必须重启开发服务器才能生效
