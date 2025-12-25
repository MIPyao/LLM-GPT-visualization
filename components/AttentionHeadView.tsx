"use client";

import React, { useState, useMemo } from "react";
import { HiddenState } from "@/types";
import "katex/dist/katex.min.css";
// @ts-expect-error: No types available for 'react-katex'
import { BlockMath } from "react-katex";

interface Props {
  tokens: string[];
  hiddenStates?: HiddenState[] | null;
  activeLayer?: number;
  onLayerChange?: (layerIndex: number) => void;
}

const AttentionHeadView: React.FC<Props> = ({
  tokens,
  hiddenStates,
  activeLayer = 0,
  onLayerChange,
}) => {
  const [activeHead, setActiveHead] = useState(0);

  // 从 hiddenStates 中获取当前层的数据
  const currentLayerData = useMemo(() => {
    if (!hiddenStates || hiddenStates.length === 0) return null;
    // 如果提供了 activeLayer，尝试找到对应的层
    const layerData = hiddenStates.find((h) => h.layerIndex === activeLayer);
    return layerData || hiddenStates[activeLayer] || null;
  }, [hiddenStates, activeLayer]);

  // 推断注意力头数量（从 key/value 的维度）
  // 维度格式: [batch_size, num_heads, sequence_length, head_dim]
  // 例如: [1, 12, 4, 64] 表示 1个批次，12个头，4个token，每个头64维
  const numHeads = useMemo(() => {
    if (!currentLayerData?.valueDims) return 8; // 默认8个头

    const dims = currentLayerData.valueDims;
    if (dims.length === 4) {
      // [batch, num_heads, seq_len, head_dim] 格式
      return dims[1] || 8;
    } else if (dims.length === 3) {
      // 可能是 [num_heads, seq_len, head_dim] 或其他格式
      return dims[0] || dims[1] || 8;
    }
    return 8;
  }, [currentLayerData]);

  const heads = Array.from({ length: numHeads }, (_, i) => i);

  // 从 Key 和 Value 数据计算真实的注意力矩阵
  // 注意：完整的注意力计算需要 Q, K, V，但我们只有 K 和 V
  // 这里我们使用 K 的相似度来近似注意力模式
  const matrix = useMemo(() => {
    const size = tokens.length;
    const mat = Array.from({ length: size }, () => new Array(size).fill(0));

    // 如果有真实的 Key 和 Value 数据，使用它们计算注意力
    if (
      currentLayerData?.keyData &&
      currentLayerData?.keyDims &&
      currentLayerData?.valueData &&
      currentLayerData?.valueDims
    ) {
      const keyDims = currentLayerData.keyDims;
      const valueDims = currentLayerData.valueDims;
      const keyData = currentLayerData.keyData;
      const valueData = currentLayerData.valueData;

      // 解析维度: [batch, num_heads, seq_len, head_dim]
      // 例如: [1, 12, 4, 64]
      const [batchSize, numHeads, seqLen, headDim] =
        keyDims.length === 4
          ? keyDims
          : keyDims.length === 3
          ? [1, ...keyDims]
          : [1, 12, size, 64]; // 默认值

      // 确保序列长度匹配
      const actualSeqLen = Math.min(seqLen, size);

      // 提取当前注意力头 (activeHead) 的 Key 数据
      // 数据布局: [batch][head][seq][dim] -> 扁平化索引计算
      // 索引公式: batch * (num_heads * seq_len * head_dim) + head * (seq_len * head_dim) + seq * head_dim + dim
      const getKeyValue = (
        data: number[],
        batch: number,
        head: number,
        seq: number,
        dim: number
      ): number => {
        const index =
          batch * (numHeads * seqLen * headDim) +
          head * (seqLen * headDim) +
          seq * headDim +
          dim;
        return data[index] || 0;
      };

      // 计算注意力得分矩阵
      // 使用 Key 之间的点积相似度来近似注意力模式
      // 注意：完整的注意力应该是 Q * K^T，这里我们用 K * K^T 作为近似
      for (let i = 0; i < actualSeqLen; i++) {
        const scores: number[] = [];
        let maxScore = -Infinity;

        for (let j = 0; j < actualSeqLen; j++) {
          // 计算 Key[i] 和 Key[j] 的点积（当前头的所有维度）
          let dotProduct = 0;
          for (let d = 0; d < headDim; d++) {
            const ki = getKeyValue(keyData, 0, activeHead, i, d);
            const kj = getKeyValue(keyData, 0, activeHead, j, d);
            dotProduct += ki * kj;
          }

          // 缩放点积（注意力机制中的缩放因子）
          const scaledScore = dotProduct / Math.sqrt(headDim);
          scores.push(scaledScore);
          maxScore = Math.max(maxScore, scaledScore);
        }

        // Softmax 归一化
        let sum = 0;
        const expScores = scores.map((s) => {
          const exp = Math.exp(s - maxScore); // 数值稳定性
          sum += exp;
          return exp;
        });

        for (let j = 0; j < actualSeqLen; j++) {
          mat[i][j] = expScores[j] / sum;
        }
      }

      console.log(
        `[Attention] 使用真实 Key 数据计算注意力矩阵 (头 ${activeHead}, 维度: [${keyDims.join(
          ", "
        )}])`
      );
    } else {
      // 如果没有真实数据，使用模拟数据（向后兼容）
      console.log("[Attention] 使用模拟数据计算注意力矩阵");
      const headSeed = activeHead * 13.37;

      for (let i = 0; i < size; i++) {
        let rowSum = 0;
        for (let j = 0; j < size; j++) {
          const identity = i === j ? 0.4 : 0;
          const charSim =
            tokens[i].split("").filter((c) => tokens[j].includes(c)).length /
            Math.max(tokens[i].length, tokens[j].length);
          const posBias = (1 / (Math.abs(i - j) + 1)) * 0.2;
          const randomness = Math.abs(Math.sin((i + j + headSeed) * 0.5)) * 0.3;

          const rawWeight = identity + charSim * 0.4 + posBias + randomness;
          mat[i][j] = rawWeight;
          rowSum += rawWeight;
        }
        for (let j = 0; j < size; j++) {
          mat[i][j] /= rowSum;
        }
      }
    }

    return mat;
  }, [tokens, activeHead, currentLayerData]);

  // 获取可用的层索引
  const availableLayers = useMemo(() => {
    if (!hiddenStates || hiddenStates.length === 0) return [];
    return hiddenStates
      .map((h, idx) => (h.layerIndex !== undefined ? h.layerIndex : idx))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a - b);
  }, [hiddenStates]);

  const hasRealData =
    !!currentLayerData &&
    (!!currentLayerData.keyData || !!currentLayerData.valueData);

  return (
    <div className="space-y-6">
      {/* 层选择器 */}
      {availableLayers.length > 0 && onLayerChange && (
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Transformer 层 (Layers)
            </span>
            <span className="text-xs text-slate-500">
              共 {availableLayers.length} 层
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableLayers.map((layerIdx) => (
              <button
                key={layerIdx}
                onClick={() => onLayerChange(layerIdx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeLayer === layerIdx
                    ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                Layer {layerIdx}
              </button>
            ))}
          </div>
          {currentLayerData && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500 space-y-1">
              {currentLayerData.keyDims && (
                <div>
                  <div className="font-semibold text-slate-400 mb-1">
                    Key 维度: [{currentLayerData.keyDims.join(", ")}]
                  </div>
                </div>
              )}
              {currentLayerData.valueDims && (
                <div>
                  <div className="font-semibold text-slate-400 mb-1">
                    Value 维度: [{currentLayerData.valueDims.join(", ")}]
                  </div>
                </div>
              )}
              {currentLayerData.keyData && (
                <div>
                  Key 数据点: {currentLayerData.keyData.length.toLocaleString()}
                </div>
              )}
              {currentLayerData.valueData && (
                <div>
                  Value 数据点:{" "}
                  {currentLayerData.valueData.length.toLocaleString()}
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-600">
                <div className="font-semibold text-slate-400 mb-1">
                  多头自注意力机制:
                </div>
                <div>
                  • Key (K): 用于计算注意力得分，表示每个token的"被查询"特征
                </div>
                <div>• Value (V): 用于加权聚合，表示每个token的"内容"特征</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-indigo-400">
            多头自注意力 (Multi-Head Self-Attention)
          </h3>
          {/* Fix: Wrap the formula in a JS string literal to prevent JSX from interpreting LaTeX curly braces as JS blocks */}
          <div className="text-xs text-slate-500">
            <BlockMath math="Attention(Q, K, V) = \text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {heads.map((h) => (
            <button
              key={h}
              onClick={() => setActiveHead(h)}
              className={`w-8 h-8 rounded text-[10px] font-black transition-all ${
                activeHead === h
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
              }`}
            >
              H{h}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 注意力得分矩阵 */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner">
          <div className="mb-3 pb-2 border-b border-slate-800">
            <h4 className="text-sm font-semibold text-indigo-400 mb-1">
              注意力得分矩阵 (Attention Score Matrix)
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="text-indigo-300">每一行</span>
              代表一个词元（Query）对所有词元（Key）的注意力权重。
              <br />
              <span className="text-cyan-300">
                经过 Softmax 归一化后，每行的和 = 1
              </span>
              ， 表示该词元将注意力"分配"给所有词元的总权重为 100%。
            </p>
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `40px repeat(${tokens.length}, minmax(0, 1fr))`,
            }}
          >
            <div />
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] text-slate-300 text-center truncate px-1 py-2 transform origin-bottom-left uppercase font-black border-b"
              >
                {t}
              </div>
            ))}

            {tokens.map((rowToken, i) => (
              <React.Fragment key={i}>
                <div className="text-[9px] text-slate-300 flex items-center pr-2 font-mono truncate uppercase font-black border-r">
                  {rowToken}
                </div>
                {tokens.map((_, j) => {
                  const val = matrix[i][j];
                  return (
                    <div
                      key={j}
                      className="aspect-square m-0.5 rounded-[2px] transition-all duration-700 cursor-crosshair hover:scale-125 hover:z-10"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${val * 3})`,
                        boxShadow:
                          val > 0.2
                            ? `0 0 10px rgba(99, 102, 241, ${val})`
                            : "none",
                      }}
                      title={`Score: ${val.toFixed(4)}`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 交互流可视化 */}
        <div className="relative h-[360px] bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="absolute top-4 left-0 right-0 flex justify-around px-4">
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-400 font-mono"
              >
                Query_{i}
              </div>
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient
                id="attGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.8)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0.8)" />
              </linearGradient>
            </defs>
            {tokens.map((_, i) =>
              tokens.map((_, j) => {
                const weight = matrix[i][j];
                if (weight < 0.1) return null; // 剪枝，只画显著的联系

                const x1 = (100 / tokens.length) * (i + 0.5);
                const x2 = (100 / tokens.length) * (j + 0.5);
                return (
                  <line
                    key={`${i}-${j}`}
                    x1={`${x1}%`}
                    y1="15%"
                    x2={`${x2}%`}
                    y2="85%"
                    stroke="url(#attGradient)"
                    strokeWidth={weight * 6}
                    strokeDasharray={weight > 0.3 ? "0" : "2,2"}
                    className="transition-all duration-1000 opacity-40 hover:opacity-100"
                  />
                );
              })
            )}
          </svg>

          <div className="absolute bottom-4 left-0 right-0 flex justify-around px-4">
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] bg-indigo-900/40 px-2 py-1 rounded border border-indigo-500/30 text-indigo-300 font-bold font-mono"
              >
                Key_{i}
              </div>
            ))}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="px-3 py-1 bg-indigo-600 rounded-full text-[9px] font-black text-white uppercase tracking-tighter mb-1">
              Linear Projection
            </div>
            <div className="h-12 w-px bg-gradient-to-b from-indigo-600 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttentionHeadView;
