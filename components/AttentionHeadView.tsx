"use client";

import React, { useState, useMemo } from "react";
import { TransformerStates } from "@/types";
import "katex/dist/katex.min.css";
// @ts-expect-error: No types available for 'react-katex'
import { BlockMath } from "react-katex";

// Design tokens - 使用全局 CSS 变量
// const DesignTokens = { ... };

interface Props {
  tokens: string[];
  transformerStates?: TransformerStates[] | null;
  activeLayer?: number;
  onLayerChange?: (layerIndex: number) => void;
}

const AttentionHeadView: React.FC<Props> = ({
  tokens,
  transformerStates,
  activeLayer = 0,
  onLayerChange,
}) => {
  const [activeHead, setActiveHead] = useState(0);

  const currentLayerData = useMemo(() => {
    if (!transformerStates || transformerStates.length === 0) return null;
    const layerData = transformerStates.find((h) => h.layerIndex === activeLayer);
    return layerData || transformerStates[activeLayer] || null;
  }, [transformerStates, activeLayer]);

  const numHeads = useMemo(() => {
    if (!currentLayerData?.valueDims) return 8;
    const dims = currentLayerData.valueDims;
    if (dims.length === 4) {
      return dims[1] || 8;
    } else if (dims.length === 3) {
      return dims[0] || dims[1] || 8;
    }
    return 8;
  }, [currentLayerData]);

  const heads = Array.from({ length: numHeads }, (_, i) => i);

  const matrix = useMemo(() => {
    const size = tokens.length;
    const mat = Array.from({ length: size }, () => new Array(size).fill(0));

    if (
      currentLayerData?.keyData &&
      currentLayerData?.keyDims &&
      currentLayerData?.valueData &&
      currentLayerData?.valueDims
    ) {
      const keyDims = currentLayerData.keyDims;
      const keyData = currentLayerData.keyData;

      const [, numHeads, seqLen, headDim] =
        keyDims.length === 4
          ? keyDims
          : keyDims.length === 3
          ? [1, ...keyDims]
          : [1, 12, size, 64];

      const actualSeqLen = Math.min(seqLen, size);

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

      for (let i = 0; i < actualSeqLen; i++) {
        const scores: number[] = [];
        let maxScore = -Infinity;

        for (let j = 0; j < actualSeqLen; j++) {
          let dotProduct = 0;
          for (let d = 0; d < headDim; d++) {
            const ki = getKeyValue(keyData, 0, activeHead, i, d);
            const kj = getKeyValue(keyData, 0, activeHead, j, d);
            dotProduct += ki * kj;
          }

          const scaledScore = dotProduct / Math.sqrt(headDim);
          scores.push(scaledScore);
          maxScore = Math.max(maxScore, scaledScore);
        }

        let sum = 0;
        const expScores = scores.map((s) => {
          const exp = Math.exp(s - maxScore);
          sum += exp;
          return exp;
        });

        for (let j = 0; j < actualSeqLen; j++) {
          mat[i][j] = expScores[j] / sum;
        }
      }
    } else {
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

  const availableLayers = useMemo(() => {
    if (!transformerStates || transformerStates.length === 0) return [];
    return transformerStates
      .map((h, idx) => (h.layerIndex !== undefined ? h.layerIndex : idx))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a - b);
  }, [transformerStates]);

  return (
    <div className="space-y-6">
      {/* 层选择器 */}
      {availableLayers.length > 0 && onLayerChange && (
        <div className="glass-darker p-6 rounded-2xl border border-indigo-500/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-indigo-400">
                注意力变换层 (Attention Transform)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                共 {availableLayers.length} 层 · 经过 L 层深层网络演变
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {availableLayers.length} layers
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            利用 Q/K/V 矩阵计算权重，实现从原始嵌入到语义特征空间的非线性映射。
          </p>
          <div className="flex flex-wrap gap-2">
            {availableLayers.map((layerIdx) => (
              <button
                key={layerIdx}
                onClick={() => onLayerChange(layerIdx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeLayer === layerIdx
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)] ring-1 ring-indigo-500/50"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                }`}
              >
                Layer {layerIdx}
              </button>
            ))}
          </div>
          {currentLayerData && (
            <div className="mt-4 pt-4 border-t border-slate-800/50 text-xs text-slate-500 space-y-2 bg-slate-900/30 rounded-lg p-3">
              {currentLayerData.keyDims && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">Key 维度:</span>
                  <code className="text-indigo-400 font-mono bg-indigo-500/5 px-2 py-0.5 rounded">
                    [{currentLayerData.keyDims.join(", ")}]
                  </code>
                </div>
              )}
              {currentLayerData.valueDims && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">Value 维度:</span>
                  <code className="text-cyan-400 font-mono bg-cyan-500/5 px-2 py-0.5 rounded">
                    [{currentLayerData.valueDims.join(", ")}]
                  </code>
                </div>
              )}
              {currentLayerData.keyData && (
                <div className="text-slate-400">
                  Key 数据点: <span className="text-white font-mono">{currentLayerData.keyData.length.toLocaleString()}</span>
                </div>
              )}
              {currentLayerData.valueData && (
                <div className="text-slate-400">
                  Value 数据点: <span className="text-white font-mono">{currentLayerData.valueData.length.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-indigo-400">
            多头自注意力 (Multi-Head Self-Attention)
          </h3>
          <div className="text-xs text-slate-500 mt-1">
            <BlockMath math="Attention(Q, K, V) = \text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {heads.map((h) => (
            <button
              key={h}
              onClick={() => setActiveHead(h)}
              className={`w-9 h-9 rounded text-[10px] font-black transition-all ${
                activeHead === h
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                  : "bg-slate-800/60 text-slate-500 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50"
              }`}
            >
              H{h}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 注意力得分矩阵 */}
        <div className="glass-darker p-6 rounded-2xl border border-slate-800/50">
          <div className="mb-4 pb-3 border-b border-slate-800/50">
            <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-400 rounded-full" />
              注意力得分矩阵
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-indigo-300">每一行</span>代表一个词元（Query）对所有词元（Key）的注意力权重。
              <br />
              <span className="text-indigo-300">经过 Softmax 归一化后，每行的和 = 1</span>，
              表示该词元将注意力&quot;分配&quot;给所有词元的总权重为 100%。
            </p>
          </div>
          <div
            className="grid overflow-x-auto"
            style={{
              gridTemplateColumns: `40px repeat(${tokens.length}, minmax(40px, 1fr))`,
            }}
          >
            <div />
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] text-slate-300 text-center truncate px-1 py-2 transform origin-bottom-left uppercase font-black border-b border-slate-800/30 bg-slate-950/30"
              >
                {t}
              </div>
            ))}

            {tokens.map((rowToken, i) => (
              <React.Fragment key={i}>
                <div className="text-[9px] text-slate-300 flex items-center justify-end pr-2 font-mono truncate uppercase font-black border-r border-slate-800/30 bg-slate-950/30">
                  {rowToken}
                </div>
                {tokens.map((_, j) => {
                  const val = matrix[i][j];
                  const intensity = Math.max(val, 0.05);
                  return (
                    <div
                      key={j}
                      className="aspect-square m-0.5 rounded-[2px] transition-all duration-300 cursor-crosshair hover:scale-125 hover:z-10 hover:ring-1 hover:ring-indigo-400/50"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${intensity * 2.5})`,
                        boxShadow: val > 0.15 ? `0 0 ${Math.min(val * 15, 10)}px rgba(99, 102, 241, ${val * 0.8})` : "none",
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
        <div className="relative h-[360px] glass-darker rounded-2xl border border-slate-800/50 overflow-hidden">
          <div className="absolute top-4 left-0 right-0 flex justify-around px-4 pointer-events-none">
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60 text-slate-400 font-mono"
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
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.9)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.9)" />
              </linearGradient>
            </defs>
            {tokens.map((_, i) =>
              tokens.map((_, j) => {
                const weight = matrix[i][j];
                if (weight < 0.1) return null;

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
                    strokeWidth={weight * 7}
                    strokeDasharray={weight > 0.3 ? "0" : "3,3"}
                    className="transition-all duration-1000 opacity-35 hover:opacity-100"
                  />
                );
              })
            )}
          </svg>

          <div className="absolute bottom-4 left-0 right-0 flex justify-around px-4 pointer-events-none">
            {tokens.map((t, i) => (
              <div
                key={i}
                className="text-[9px] bg-indigo-900/40 px-2 py-1 rounded border border-indigo-500/30 text-indigo-300 font-bold font-mono"
              >
                Key_{i}
              </div>
            ))}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
            <div className="px-3 py-1 bg-indigo-600/90 rounded-full text-[9px] font-black text-white uppercase tracking-tighter mb-1 shadow-lg">
              Linear Projection
            </div>
            <div className="h-10 w-0.5 bg-linear-to-b from-indigo-600 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttentionHeadView;
