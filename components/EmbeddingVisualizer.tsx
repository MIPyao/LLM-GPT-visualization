"use client";

import React, { useMemo } from "react";
import { EmbeddingData } from "@/types";
// @ts-expect-error: No types available for 'react-katex'
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

// Design tokens - using global CSS variables

interface Props {
  tokens: string[];
  embeddingData?: EmbeddingData | null;
}

const EmbeddingVisualizer: React.FC<Props> = ({ tokens, embeddingData }) => {
  const generateDeterministicVector = (text: string, dim: number = 16) => {
    const vector = [];
    const seed = text
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < dim; i++) {
      const val = Math.abs(Math.sin(seed * (i + 1) * 0.1));
      vector.push(val);
    }
    return vector;
  };

  const normalizeValue = (val: number): number => {
    return (Math.tanh(val) + 1) / 2;
  };

  const embedDim = useMemo(() => {
    if (embeddingData?.dims && embeddingData.dims.length >= 3) {
      return embeddingData.dims[2];
    }
    if (
      embeddingData?.tokenEmbeddings &&
      embeddingData.tokenEmbeddings.length > 0
    ) {
      return embeddingData.tokenEmbeddings[0].length;
    }
    return null;
  }, [embeddingData]);

  const hasRealData = !!embeddingData?.tokenEmbeddings && embeddingData.tokenEmbeddings.length > 0;

  const getTokenEmbedding = (idx: number): number[] => {
    if (hasRealData && embeddingData.tokenEmbeddings) {
      return embeddingData.tokenEmbeddings[idx] || [];
    }
    return generateDeterministicVector(tokens[idx] || "", 16);
  };

  const VISUALIZATION_DIMS = 768;
  const displayDims = embedDim ? Math.min(VISUALIZATION_DIMS, embedDim) : 16;

  return (
    <div className="glass rounded-2xl p-6 shadow-lg ring-1 ring-white/5">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center ring-1 ring-cyan-500/20">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-cyan-400">
              输入嵌入层 (Input Embedding)
            </h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            基于词表索引生成的高维向量映射，每个 token 映射到 {embedDim || 768} 维语义空间
          </p>
        </div>
        <div className="bg-cyan-500/10 text-cyan-300 text-[10px] px-3 py-1.5 rounded-full border border-cyan-500/20 font-mono shrink-0">
          dim={embedDim || 768}
          {hasRealData && embedDim && embedDim > VISUALIZATION_DIMS && (
            <span className="block text-cyan-400/70 text-[9px] mt-0.5">
              显示前 {VISUALIZATION_DIMS} 维
            </span>
          )}
        </div>
      </div>

      {/* Token 嵌入可视化网格 */}
      <div className="flex flex-wrap gap-5 mt-6">
        {tokens.map((token, idx) => {
          const vector = getTokenEmbedding(idx);
          const displayVector = vector.slice(0, displayDims);
          let stats = null;
          if (hasRealData && vector.length > 0) {
            const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
            const std = Math.sqrt(
              vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
                vector.length
            );
            stats = { mean, std };
          }

          return (
            <div key={idx} className="group flex flex-col items-center">
              <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 mb-3 font-mono text-xs text-cyan-300 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10">
                &quot;{token}&quot;
              </div>

              {/* 嵌入向量可视化 */}
              <div className="grid grid-cols-16 gap-[2px] p-2 bg-slate-950 rounded-lg border border-slate-800/60 shadow-inner">
                {displayVector.map((val, vIdx) => {
                  const normalizedVal = hasRealData ? normalizeValue(val) : val;
                  const isPositive = val >= 0;
                  return (
                    <div
                      key={vIdx}
                      className="w-3 h-3 rounded-[1px] transition-all duration-300 hover:scale-125 hover:z-10 cursor-crosshair"
                      style={{
                        backgroundColor: isPositive
                          ? `rgba(6, 182, 212, ${normalizedVal * 0.9 + 0.1})`
                          : `rgba(244, 63, 94, ${1 - normalizedVal})`,
                        boxShadow: normalizedVal > 0.7 ? `0 0 4px ${isPositive ? 'rgba(6,182,212,0.6)' : 'rgba(244,63,94,0.6)'}` : 'none',
                      }}
                      title={`维度 ${vIdx}: ${val.toFixed(4)}`}
                    />
                  );
                })}
              </div>

              {hasRealData && stats && (
                <div className="mt-2 text-[9px] text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded">
                  <div>
                    μ={stats.mean.toFixed(3)} σ={stats.std.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部说明 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-slate-500 font-mono">
        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
          <span className="text-cyan-400/80 block mb-2 font-bold text-xs">
            {hasRealData ? "// 词元嵌入 (WTE)" : "// 仿真语义空间"}
          </span>
          <div className="text-slate-300 text-xs scale-95 origin-left">
            {hasRealData ? (
              <InlineMath
                math={`\\mathbf{e}_{i} = \\text{WTE}[id_i] \\in \\mathbb{R}^{${embedDim || 384}}`}
              />
            ) : (
              <InlineMath math="\text{vec} \approx \mathcal{H}(\text{token}) \to \mathbb{R}^d" />
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
          <span className="text-cyan-400/80 block mb-2 font-bold text-xs">
            {hasRealData ? "// 位置嵌入 (WPE)" : "// 旋转/正弦位置编码"}
          </span>
          <div className="text-slate-300 text-xs scale-95 origin-left">
            {hasRealData ? (
              <InlineMath
                math={`\\mathbf{p}_{i} = \\text{WPE}[pos_i] \\in \\mathbb{R}^{${embedDim || 384}}`}
              />
            ) : (
              <InlineMath math="PE_{(p, 2i)} = \sin(\frac{p}{10000^{2i/d}})" />
            )}
          </div>
          {hasRealData && (
            <div className="mt-2 pt-2 border-t border-slate-800/50 text-cyan-400/70 text-xs">
              <InlineMath math="\mathbf{h}_0 = \mathbf{e}_i + \mathbf{p}_i" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbeddingVisualizer;
