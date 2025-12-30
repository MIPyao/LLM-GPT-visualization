# my-llm-viz

浏览器端可视化的自回归语言模型实验室，集成了本地 Xenova/gpt2与 Gemini 云端推理。通过分词、注意力、输出层等多视角展示 Transformer 的中间态，同时揭示logits/loss/perplexity、token ID 以及 embedding 数据。

## 特性概览

- **多模式推理**：可切换本地 WebAssembly 引擎（Xenova Transformers）与 Gemini 云端服务；本地模式下可调 Top-K/Top-P，云端模式则调用 Gemini 2.5 Flash。
- **层级可视化**：输出层采用 ECharts 呈现 logits 与概率条，嵌入层/注意力层通过自制组件揭秘 key/value 结构以及 head-level similarity；分词面板显示编码后的 `input_ids`（`bigint[]`）与每个 token 的负对数似然。
- **模型分析**：页面右侧展示层解析（含主模型 GPT-2 与特征提取器 MiniLM）、loss/perplexity 指标、token loss 分布，有助理解生成阶段的“惊讶程度”。
- **诊断信息**：日志（console）记录加载进度、past_key_values 细节，便于调试本地模型与特征提取器的加载流程。

## 快速启动

1. 安装依赖：`pnpm install`（或 `npm install` / `yarn`）。
2. 启动开发服务器：`npm run dev`（`next dev --webpack`）。
3. 默认页面 `http://localhost:3000` 会在本地模型就绪后支持推理，首次必须下载 Xenova 模型与 `MiniLM` 特征提取器。
4. 调试提示：本地模式初始化自动展开双进度遮罩，控制台会记录 `generatorProgress` 与 `featureModelProgress`。若有警告（例如 `ONNX Runtime`），可以放行。

## 目录核心说明

- `app/page.tsx`：主界面，协调 tokenizer/generator 调用、切换层视图、展示损失与 token 信息，并与 `OutputVisualizer`、`AttentionHeadView`、`EmbeddingVisualizer` 交互。
- `hooks/useTransformer.ts`：封装 Xenova transformers 调用、loss/perplexity 计算、MiniLM embedding 提取，以及 `encodedInputIds` 的 BigInt 兼容处理。
- `components/OutputVisualizer.tsx`：ECharts 输出层条形图，附带平均 loss/困惑度读数，以概率或 logits 模式切换。
- `components/AttentionHeadView.tsx`：基于 key/value 数据生成 attention heatmap（可用模拟数据退化支持）。
- `components/EmbeddingVisualizer.tsx`：展示 embedding 维度、token 向量，可切换 head/seq 视角（详见组件内部文档）。

## 本地 vs. 云端模式差异

- **本地**：依赖 Xenova Transformers + MiniLM，在浏览器里通过 WebAssembly调用 WebGPU 运行，支持获取 logits、past_key_values 和真实 embedding；推荐用于调试和展示内部状态。
- **云端**：调用 Gemini 2.5 Flash API 生成 tokens/analysis，内嵌 `geminiService`（需配置 `NEXT_PUBLIC_GEMINI_API_KEY`），适合生产级文本与更复杂解释。

## 开发 & 调试要点

- 控制台输出会在模型加载、tokenizer 解码、loss 计算时打印关键变量；若屏幕卡在“等待分析数据”，观察 `[Transformers]` 日志链。
- 若想替换模型可编辑 `useTransformer` 中的 `ModelType` 与 `tokenizer` 初始化，注意保留 `MiniLM` 提取器以读取 embedding。
- 生产部署建议走 `next build`/`next start`，且若使用 Gemini 云端，请确保环境变量 `NEXT_PUBLIC_GEMINI_API_KEY` 可用。

## 贡献 & 参考

- 参考 Xenova Transformers 文档（`@xenova/transformers`）与 Gemini GenAI SDK。
- 若要继续扩展 Hugging Face 模型，可在 `useTransformer` 模块中追加 `AutoModel` / `AutoTokenizer` 的配置。
- 欢迎通过提交 PR 或 issue 补充更详细的视觉分析用例。
