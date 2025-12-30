"use client";

import { useState, useCallback } from "react";
import type { LossStats, TransformerStates } from "@/types";

export type ModelType = "Xenova/tiny-random-gpt2" | "Xenova/gpt2" | "gpt2";

export function useTransformer() {
  const [isReady, setIsReady] = useState(false);
  const [generatorProgress, setGeneratorProgress] = useState(0);
  const [featureModelProgress, setFeatureModelProgress] = useState(0);
  const [generator, setGenerator] = useState<any>(null);
  const [miniModel, setMiniModel] = useState<any>(null);
  const [tokenizer, setTokenizer] = useState<any>(null);
  const [currentModel, setCurrentModel] = useState<ModelType>("Xenova/gpt2");
  const [error, setError] = useState<string | null>(null);

  const initModel = useCallback(
    async (modelName: ModelType = "Xenova/gpt2") => {
      // 仅在浏览器环境下执行
      if (typeof window === "undefined") return;

      setIsReady(false);
      setCurrentModel(modelName);
      setError(null);

      try {
        // 动态导入 @xenova/transformers
        console.log("[Transformers] 开始导入模块...");

        // 使用命名导入
        const TransformersModule = await import("@xenova/transformers");

        // 检查导入是否成功
        if (!TransformersModule || typeof TransformersModule !== "object") {
          throw new Error("Transformers 模块导入失败：返回的对象无效");
        }

        console.log("[Transformers] 模块导入成功");

        // 使用命名导出，添加安全检查
        let AutoModelForCausalLM: any;
        let env: any;
        let AutoTokenizer: any;

        try {
          AutoModelForCausalLM = TransformersModule.AutoModelForCausalLM;
          env = TransformersModule.env;
          AutoTokenizer = TransformersModule.AutoTokenizer;
        } catch (e) {
          throw new Error(
            `无法解构 Transformers 模块: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }

        // 检查必要的导出是否存在
        if (!AutoModelForCausalLM) {
          throw new Error("AutoModelForCausalLM 不存在或无效");
        }
        if (!env || typeof env !== "object") {
          throw new Error("env 对象不存在或无效");
        }
        if (!AutoTokenizer) {
          throw new Error("AutoTokenizer 不存在");
        }

        // 等待一小段时间，确保模块完全初始化
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 配置环境变量（在访问属性前先检查）
        console.log("[Transformers] 配置环境变量...");

        // 检查缓存状态的辅助函数
        const checkCacheStatus = async () => {
          const cacheInfo: any = {
            cacheAPI: [],
            envConfig: {},
          };

          // 检查 Cache API
          try {
            if (typeof caches !== "undefined") {
              const cacheNames = await caches.keys();
              cacheInfo.cacheAPI = cacheNames;
              console.log("[Cache] Cache API 缓存列表:", cacheInfo.cacheAPI);

              // 检查每个缓存的大小
              for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                console.log(`[Cache] ${cacheName}: ${keys.length} 个条目`);
              }
            }
          } catch (e) {
            console.warn("[Cache] 无法访问 Cache API:", e);
          }

          // 检查 env 配置
          cacheInfo.envConfig = {
            useBrowserCache: env.useBrowserCache,
            allowLocalModels: env.allowLocalModels,
            remoteHost: env.remoteHost,
          };
          console.log("[Cache] 环境配置:", cacheInfo.envConfig);

          return cacheInfo;
        };

        // 在配置前检查缓存状态
        await checkCacheStatus();

        try {
          // 安全地设置环境变量
          if (typeof env.allowLocalModels !== "undefined") {
            env.allowLocalModels = false;
          }
          if (typeof env.useBrowserCache !== "undefined") {
            env.useBrowserCache = true;
            console.log("[Cache] ✅ useBrowserCache 已启用");
          } else {
            console.warn("[Cache] ⚠️ useBrowserCache 属性不存在");
          }
          if (typeof env.remoteHost !== "undefined") {
            env.remoteHost = "https://huggingface.co";
          }
          if (typeof env.remotePathTemplate !== "undefined") {
            env.remotePathTemplate = "{model}/resolve/{revision}/";
          }
        } catch (envError) {
          console.warn("[Transformers] 环境变量配置警告:", envError);
          // 继续执行，某些环境变量可能不可配置
        }

        console.log("[Transformers] 开始加载模型:", modelName);

        // 加载模型，添加超时和错误处理
        console.log("[Transformers] 加载 AutoModelForCausalLM...");
        let model;
        try {
          model = await AutoModelForCausalLM.from_pretrained(modelName, {
            progress_callback: (p: any) => {
              if (p.status === "progress") {
                setGeneratorProgress(p.progress);
              }
            },
          });
          console.log("[Transformers] ✅ 模型加载成功");
          // 加载后再次检查缓存状态
          console.log("[Cache] 模型加载后，检查缓存状态...");
          await checkCacheStatus();
        } catch (modelError: any) {
          console.error("[Transformers] 模型加载失败:", modelError);

          // 如果是 404
          if (
            modelError?.message?.includes("404") ||
            modelError?.status === 404
          ) {
            throw new Error(
              `模型加载失败：\n` +
                `原始模型 "${modelName}" 未找到 (404)\n` +
                `建议：检查网络连接或尝试其他模型`
            );
          }

          throw modelError;
        }

        // 2. 加载 MiniLM (用于获取真实的 last_hidden_state)
        console.log(
          "[Transformers] 开始加载特征提取模型: Xenova/all-MiniLM-L6-v2"
        );
        let featureModel: any;
        try {
          featureModel = await TransformersModule.AutoModel.from_pretrained(
            "Xenova/all-MiniLM-L6-v2",
            {
              progress_callback: (p: any) => {
                if (p.status === "progress") {
                  setFeatureModelProgress(p.progress);
                }
              },
            }
          );
          console.log(
            "[Transformers] 加载特征提取模型: Xenova/all-MiniLM-L6-v2"
          );
        } catch (err) {
          console.error(
            "[Transformers] Xenova/all-MiniLM-L6-v2特征提取模型加载失败:",
            err
          );
        }

        console.log("[Transformers] 开始加载分词器...");
        let tok: any;
        try {
          tok = await AutoTokenizer.from_pretrained(modelName);
        } catch (err) {
          console.error("[Transformers] 分词器加载失败:", err);
        }

        console.log("[Transformers] 初始化完成");
        setGenerator(() => model);
        setMiniModel(() => featureModel);
        setTokenizer(() => tok);
        setGeneratorProgress(1);
        setFeatureModelProgress(1);
        setIsReady(true);
      } catch (err: any) {
        console.error("[Transformers] 初始化失败，启用高性能仿真模式:", err);
        console.error("[Transformers] 错误详情:", {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        });

        // 检查是否是 404 错误
        const errorMessage = err?.message || "";
        let userFriendlyError = errorMessage;

        if (
          errorMessage.includes("404") ||
          errorMessage.includes("Not Found")
        ) {
          userFriendlyError = `模型未找到 (404): 可能不存在或路径错误。\n\n建议：尝试使用 "gpt2" 或其他公开可用的模型。`;
        }

        setError(userFriendlyError);
        // 即使失败也标记为就绪，以便 UI 进入仿真逻辑
        setIsReady(true);
      }
    },
    []
  );

  // Softmax 函数：将 logits 转换为概率分布
  const softmax = (logits: number[]): number[] => {
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map((logit) => Math.exp(logit - maxLogit));
    const sumExp = expLogits.reduce((sum, exp) => sum + exp, 0);
    return expLogits.map((exp) => exp / sumExp);
  };

  // 从 Tensor 中提取数据
  const extractTensorData = (tensor: any): number[] => {
    if (tensor?.data) {
      const data = tensor.data;

      // 如果 data 是数组，直接转换
      if (Array.isArray(data)) {
        return Array.from(data);
      }

      // 如果 data 是对象（键为字符串索引，值为数字）
      // 例如: { "0": -0.951, "1": 2.370, ... }
      if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        // 获取所有键并转换为数字，然后排序
        const keys = Object.keys(data)
          .map((k) => parseInt(k, 10))
          .filter((k) => !isNaN(k))
          .sort((a, b) => a - b);

        // 按顺序提取值
        return keys.map((k) => data[k.toString()]);
      }

      // 尝试使用 Array.from（适用于 TypedArray 等）
      try {
        return Array.from(data);
      } catch (e) {
        console.warn("[Transformers] 无法转换 tensor.data:", e);
      }
    } else if (Array.isArray(tensor)) {
      return tensor;
    } else if (tensor?.dims && tensor?.data) {
      // 再次尝试处理 data（可能是对象格式）
      const data = tensor.data;
      if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        const keys = Object.keys(data)
          .map((k) => parseInt(k, 10))
          .filter((k) => !isNaN(k))
          .sort((a, b) => a - b);
        return keys.map((k) => data[k.toString()]);
      }
      try {
        return Array.from(data);
      } catch (e) {
        console.warn("[Transformers] 无法转换 tensor.data:", e);
      }
    }
    return [];
  };

  const generate = async (
    text: string,
    options?: { topK?: number; topP?: number }
  ) => {
    const topK = options?.topK ?? 10;
    const topP = options?.topP ?? 1.0;

    try {
      // 对输入文本进行编码
      let encoded: any;
      try {
        encoded = await tokenizer(text);
        console.log(encoded);
      } catch (tokenizerError) {
        console.error("[Transformers] Tokenizer 编码失败:", tokenizerError);
        throw tokenizerError;
      }

      // 提取 input_ids
      let inputIds: any;
      if (encoded?.input_ids) {
        inputIds = encoded.input_ids;
      }

      const extractInputIds = (data: any): bigint[] => {
        if (!data) return [];
        if (
          typeof BigInt64Array !== "undefined" &&
          data instanceof BigInt64Array
        ) {
          return Array.from(data);
        }
        return [];
      };

      const encodedInputIds = extractInputIds(inputIds?.data);
      const rawIds = encodedInputIds.map((value) =>
        typeof value === "number" ? value : Number(value)
      );
      // 解码 tokens（用于显示）
      const tokens = rawIds.map((id: number) => {
        try {
          return tokenizer.decode([id]);
        } catch (decodeError) {
          console.warn(`[Transformers] 解码 token ${id} 失败:`, decodeError);
          return `[token_${id}]`;
        }
      });

      // 调用模型
      console.log("[Transformers] 调用模型进行前向传播...");
      let outputs: any;

      try {
        outputs = await generator(encoded);
      } catch (callError: any) {
        console.error("[Transformers] 模型调用失败:", callError);
        throw callError;
      }

      // --- 支路 2: 调用 MiniLM 获取真实 Embedding ---
      console.log("[Transformers] MiniLM 提取特征...");
      const featureOutputs = await miniModel(encoded);

      // 从 MiniLM 中提取你在 Netron 看到的节点
      let embeddingData: any = null;
      if (featureOutputs.last_hidden_state) {
        const tensor = featureOutputs.last_hidden_state;
        const rawData = extractTensorData(tensor);
        const dims = tensor.dims; // [1, seq_len, 384]

        // 切分出每个 Token 的向量
        const [, seqLen, dim] = dims;
        const tokenEmbeddings: number[][] = [];
        for (let i = 0; i < seqLen; i++) {
          tokenEmbeddings.push(
            Array.from(rawData.slice(i * dim, (i + 1) * dim))
          );
        }

        embeddingData = {
          data: rawData,
          dims: dims,
          tokenEmbeddings: tokenEmbeddings,
        };
        console.log("✅ 成功从 MiniLM 获取真实 Hidden States", embeddingData);
      }

      // 1. 在 generate 函数内部，计算 probabilities 之后添加：
      const calculateLoss = (allLogits: number[][], inputIds: number[]) => {
        // allLogits 形状应为 [seqLen, vocabSize]
        // inputIds 形状为 [seqLen]

        let totalLoss = 0;
        const tokenLosses: number[] = [];

        // 注意：对于第 i 个位置的预测，其 target 是 inputIds[i+1]
        // 所以我们计算到 seqLen - 1 即可
        for (let i = 0; i < inputIds.length - 1; i++) {
          const currentLogits = allLogits[i];
          const targetId = inputIds[i + 1];

          // 计算 Softmax 概率（仅针对正确答案那个点）
          const maxLogit = Math.max(...currentLogits);
          const expLogits = currentLogits.map((l) => Math.exp(l - maxLogit));
          const sumExp = expLogits.reduce((a, b) => a + b, 0);

          const probOfTarget = expLogits[targetId] / sumExp;

          // 计算负对数似然 (Negative Log Likelihood)
          const loss = -Math.log(probOfTarget + 1e-10); // 防止 log(0)

          tokenLosses.push(loss);
          totalLoss += loss;
        }

        const avgLoss = totalLoss / (inputIds.length - 1);
        return {
          avgLoss,
          perplexity: Math.exp(avgLoss),
          tokenLosses, // 每个词带来的“惊讶程度”
        };
      };

      // 提取 logits（最后一层的输出）与计算损失值lossStats
      let logits: number[] = [];
      let lossStats: LossStats | null = null;
      if (outputs?.logits) {
        const logitsTensor = outputs.logits;
        // logits 的形状通常是 [batch_size, sequence_length, vocab_size]
        // 我们需要最后一个位置的 logits（即最后一个 token 的预测）
        const logitsData = extractTensorData(logitsTensor);

        console.log("[Transformers] Logits tensor:", logitsTensor);

        // 如果 logits 是多维的，我们需要获取最后一个 token 的 logits
        if (logitsTensor?.dims) {
          const dims = logitsTensor.dims;
          if (dims.length === 3) {
            // [batch_size, seq_len, vocab_size]
            const [, seqLen, vocabSize] = dims;
            // 获取最后一个 token 的 logits（索引为 seqLen - 1）
            const lastTokenIndex = (seqLen - 1) * vocabSize;
            logits = logitsData.slice(
              lastTokenIndex,
              lastTokenIndex + vocabSize
            );
            console.log(
              `[Transformers] 提取最后一个 token 的 logits: seqLen=${seqLen}, vocabSize=${vocabSize}, 提取了 ${logits.length} 个值`
            );

            // 将一维数据还原为二维 [seqLen, vocabSize]
            const allLogitsMatrix: number[][] = [];
            for (let i = 0; i < seqLen; i++) {
              allLogitsMatrix.push(
                logitsData.slice(i * vocabSize, (i + 1) * vocabSize)
              );
            }

            lossStats = calculateLoss(allLogitsMatrix, rawIds);
          }
        }

        console.log(`[Transformers] 最终提取了 ${logits.length} 个 logits 值`);
      }

      const transformerStates: TransformerStates[] = [];

      // 提取 past_key_values （transformer层的输出）
      if (outputs?.past_key_values) {
        // past_key_values 包含每一层的 key 和 value 张量
        console.log(
          "[Transformers] 从 past_key_values 中提取层信息...",
          outputs.past_key_values
        );

        const pastKeyValues = outputs.past_key_values;

        // past_key_values 是对象
        if (typeof pastKeyValues === "object") {
          // "past_key_values.0.key", "past_key_values.0.value" (带前缀格式)
          const layerIndices = new Set<number>();
          const keyMap = new Map<string, string>(); // 存储实际键名

          // 收集所有层索引和对应的键名
          Object.keys(pastKeyValues).forEach((key) => {
            // 匹配 "0.key" 或 "past_key_values.0.key" 格式
            const match = key.match(/(?:^|\.)(\d+)\.(key|value)$/);
            if (match) {
              const layerIndex = parseInt(match[1], 10);
              const type = match[2]; // "key" 或 "value"
              layerIndices.add(layerIndex);
              keyMap.set(`${layerIndex}.${type}`, key);
            }
          });

          // 按层索引排序并提取数据
          Array.from(layerIndices)
            .sort((a, b) => a - b)
            .forEach((layerIndex) => {
              const valueKey = keyMap.get(`${layerIndex}.value`);
              const keyKey = keyMap.get(`${layerIndex}.key`);

              // 提取 key 和 value 张量
              const keyTensor = keyKey ? pastKeyValues[keyKey] : null;
              const valueTensor = valueKey ? pastKeyValues[valueKey] : null;

              // 优先使用 value，如果没有则使用 key
              const mainTensor = valueTensor || keyTensor;

              if (mainTensor) {
                transformerStates.push({
                  layerIndex,
                  // 保存 key 和 value 的原始数据用于注意力可视化
                  keyData: keyTensor ? extractTensorData(keyTensor) : undefined,
                  valueData: valueTensor
                    ? extractTensorData(valueTensor)
                    : undefined,
                  keyDims: keyTensor?.dims || null,
                  valueDims: valueTensor?.dims || null,
                });
              }
            });
        }

        if (transformerStates.length > 0) {
          console.log(
            `[Transformers] 从 past_key_values 中提取了 ${transformerStates.length} 层的信息`
          );
        } else {
          console.log(
            "[Transformers] ⚠️ 无法从 past_key_values 中提取层信息",
            "\npast_key_values 结构:",
            pastKeyValues
          );
        }
      } else {
        console.log(
          "[Transformers] ⚠️ outputs 中没有 past_key_values 字段",
          "\n可用的字段:",
          outputs ? Object.keys(outputs) : "无"
        );
      }

      // 计算概率分布（使用 softmax）
      let probabilities: Array<{ token: string; prob: number }> = [];
      let logitsData: Array<{ token: string; logit: number }> = [];

      if (logits.length > 0) {
        // 先获取 top-k logits（按 logit 值排序）
        const indexedLogits = logits
          .map((logit, index) => ({ index, logit }))
          .sort((a, b) => b.logit - a.logit)
          .slice(0, topK);

        // 将 top-k logits 转换为 token 文本（用于显示 softmax 之前的数据）
        logitsData = await Promise.all(
          indexedLogits.map(async ({ index, logit }) => {
            try {
              const token = tokenizer.decode([index]);
              return { token, logit };
            } catch (e) {
              console.warn(`[Transformers] 解码 token ${index} 失败:`, e);
              return { token: `[token_${index}]`, logit };
            }
          })
        );

        // 计算 softmax 概率
        const probs = softmax(logits);

        // 应用 Top-K 筛选
        let candidateIndices = probs
          .map((prob, index) => ({ index, prob }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, topK);

        // 应用 Top-P (Nucleus Sampling) 筛选
        if (topP < 1.0) {
          let cumulativeProb = 0;
          const topPIndices: Array<{ index: number; prob: number }> = [];
          for (const candidate of candidateIndices) {
            cumulativeProb += candidate.prob;
            topPIndices.push(candidate);
            if (cumulativeProb >= topP) {
              break;
            }
          }
          candidateIndices = topPIndices;
        }

        // 将索引转换为 token 文本
        probabilities = await Promise.all(
          candidateIndices.map(async ({ index, prob }) => {
            try {
              const token = tokenizer.decode([index]);
              return { token, prob };
            } catch (e) {
              console.warn(`[Transformers] 解码 token ${index} 失败:`, e);
              return { token: `[token_${index}]`, prob };
            }
          })
        );
      }

      // 生成解释文本
      let explanationText = `本地引擎推理成功：正在使用浏览器 WebAssembly 驱动 ${currentModel} 模型。`;
      if (transformerStates && transformerStates.length > 0) {
        explanationText += `已从 past_key_values 中提取 ${transformerStates.length} 层的信息（包含注意力机制的 key/value）和最后一层的 logits。`;
      }
      explanationText += ` 同时使用特征提取器 Xenova/all-MiniLM-L6-v2 提取 token embedding，便于后续可视化。`;

      return {
        tokens,
        probabilities,
        logits: logitsData,
        explanation: explanationText,
        transformerStates,
        embeddingData,
        lossStats,
        encodedInputIds: encodedInputIds.length ? encodedInputIds : undefined,
      };
    } catch (err: any) {
      console.error("推理过程出错:", err);
      console.error("错误详情:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      });
      return null;
    }
  };

  return {
    initModel,
    generate,
    isReady,
    generatorProgress,
    featureModelProgress,
    currentModel,
    error,
  };
}
