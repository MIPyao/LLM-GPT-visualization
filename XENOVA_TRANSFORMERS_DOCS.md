# @xenova/transformers 文档查找指南

## 官方文档资源

### 1. GitHub 仓库（主要文档来源）

- **仓库地址**: https://github.com/xenova/transformers.js
- **文档地址**: https://huggingface.co/docs/transformers.js
- **API 文档**: 在 GitHub 仓库的 `docs/` 目录下

### 2. 在线文档

- **Hugging Face 文档**: https://huggingface.co/docs/transformers.js
- **npm 包页面**: https://www.npmjs.com/package/@xenova/transformers

### 3. 本地类型定义文件

项目中的类型定义文件位置：

```
node_modules/.pnpm/@xenova+transformers@2.17.2/node_modules/@xenova/transformers/types/
```

重要文件：

- `pipelines.d.ts` - Pipeline 类型定义
- `models.d.ts` - 模型类型定义
- `utils/generation.d.ts` - 生成配置类型定义

## 如何查找特定功能的文档

### 方法 1: 查看 GitHub Issues 和 Discussions

1. 访问 https://github.com/xenova/transformers.js/issues
2. 搜索关键词：`hidden_states`, `embedding`, `output_hidden_states`
3. 查看相关 issue 和讨论

### 方法 2: 查看示例代码

1. GitHub 仓库的 `examples/` 目录
2. 文档中的示例代码片段
3. 其他使用该库的项目

### 方法 3: 查看源码

1. 克隆仓库：`git clone https://github.com/xenova/transformers.js.git`
2. 查看 `src/` 目录下的实现
3. 特别关注 `src/pipelines/` 和 `src/models/` 目录

### 方法 4: 使用 TypeScript 类型定义

在 IDE 中：

1. 按住 `Ctrl` (Windows) 或 `Cmd` (Mac) 点击类型名称
2. 查看类型定义和注释
3. 查找相关的方法和属性

## 关于获取 hidden_states 和嵌入层数据

### 当前问题

`@xenova/transformers` 的 `TextGenerationPipeline` 可能不直接支持返回 `hidden_states`。

### 可能的解决方案

#### 方案 1: 直接使用模型对象（而非 Pipeline）

```typescript
import { AutoModelForCausalLM } from "@xenova/transformers";

// 直接加载模型
const model = await AutoModelForCausalLM.from_pretrained("gpt2");

// 调用模型的前向传播
const outputs = await model(inputs, {
  output_hidden_states: true,
  return_dict_in_generate: true,
});

// 访问 hidden_states
const hiddenStates = outputs.hidden_states;
```

#### 方案 2: 访问 Pipeline 内部的模型

```typescript
const generator = await pipeline("text-generation", "gpt2");

// 访问内部的模型对象
const model = generator.model;

// 直接调用模型
const outputs = await model(inputs, {
  output_hidden_states: true,
});
```

#### 方案 3: 从嵌入层权重矩阵提取

```typescript
// 访问嵌入层
const embeddingLayer = model.transformer.wte; // GPT-2 的路径
// 或
const embeddingLayer = model.model.transformer.wte;

// 从权重矩阵中提取
const tokenIds = [1, 2, 3]; // token IDs
const embeddings = tokenIds.map((id) => {
  const startIdx = id * embedDim;
  return embeddingLayer.data.slice(startIdx, startIdx + embedDim);
});
```

## 调试技巧

### 1. 检查对象结构

```typescript
console.log("Generator keys:", Object.keys(generator));
console.log("Generator model:", generator.model);
console.log(
  "Model keys:",
  generator.model ? Object.keys(generator.model) : "N/A"
);
```

### 2. 检查 outputs 结构

```typescript
console.log("Outputs keys:", Object.keys(outputs));
console.log("Outputs:", JSON.stringify(outputs, null, 2));
```

### 3. 检查模型配置

```typescript
const config = generator.model?.config;
console.log("Model config:", config);
console.log("Supports hidden_states:", config?.output_hidden_states);
```

## 有用的搜索关键词

在文档或 GitHub 中搜索：

- `output_hidden_states`
- `hidden_states`
- `embedding layer`
- `model forward`
- `model._forward`
- `model._call`
- `get embeddings`
- `extract embeddings`

## 相关资源

- **Transformers.js 官方文档**: https://huggingface.co/docs/transformers.js
- **GitHub 仓库**: https://github.com/xenova/transformers.js
- **示例项目**: https://github.com/xenova/transformers.js/tree/main/examples
- **Discord 社区**: 在 GitHub 仓库 README 中查找 Discord 链接

## 下一步建议

1. **查看 GitHub Issues**: 搜索是否有其他人遇到类似问题
2. **查看示例代码**: 查看 `examples/` 目录中是否有获取 hidden_states 的示例
3. **尝试直接使用模型**: 不使用 Pipeline，直接使用 `AutoModelForCausalLM`
4. **查看源码**: 查看 Pipeline 的实现，了解它如何处理模型调用
