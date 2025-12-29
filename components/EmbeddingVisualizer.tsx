"use client";
import React, { useMemo } from "react";
import { EmbeddingData } from "@/types";
// @ts-expect-error: No types available for 'react-katex'
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface Props {
  tokens: string[];
  embeddingData?: EmbeddingData | null;
}

const EmbeddingVisualizer: React.FC<Props> = ({ tokens, embeddingData }) => {
  // 确定性向量生成函数：基于字符编码生成"视觉指纹"（回退方案）
  const generateDeterministicVector = (text: string, dim: number = 16) => {
    const vector = [];
    const seed = text
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < dim; i++) {
      // 使用正弦函数模拟高维空间的分布，确保值在 0-1 之间且固定
      const val = Math.abs(Math.sin(seed * (i + 1) * 0.1));
      vector.push(val);
    }
    return vector;
  };

  // 归一化向量值到 0-1 范围（用于可视化）
  const normalizeValue = (val: number): number => {
    // 使用 tanh 函数将值映射到 [-1, 1]，然后转换到 [0, 1]
    return (Math.tanh(val) + 1) / 2;
  };

  // 提取嵌入维度信息
  const embedDim = useMemo(() => {
    if (embeddingData?.dims && embeddingData.dims.length >= 3) {
      return embeddingData.dims[2]; // [batch, seq_len, embed_dim]
    }
    if (
      embeddingData?.tokenEmbeddings &&
      embeddingData.tokenEmbeddings.length > 0
    ) {
      return embeddingData.tokenEmbeddings[0].length;
    }
    return null;
  }, [embeddingData]);

  const hasRealData =
    !!embeddingData?.tokenEmbeddings &&
    embeddingData.tokenEmbeddings.length > 0;

  // 获取每个token的嵌入向量
  const getTokenEmbedding = (idx: number): number[] => {
    if (hasRealData && embeddingData.tokenEmbeddings) {
      return embeddingData.tokenEmbeddings[idx] || [];
    }
    // 回退到模拟数据
    return generateDeterministicVector(tokens[idx] || "", 16);
  };

  // 可视化维度：由于768维太多，我们只显示前64维（或者用热力图显示所有维度）
  const VISUALIZATION_DIMS = 768;
  const displayDims = embedDim ? Math.min(VISUALIZATION_DIMS, embedDim) : 16;

  return (
    <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-cyan-400">
            输入嵌入层 (Deterministic Embedding)
          </h3>
        </div>
        <div className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-1 rounded border border-cyan-500/20 font-mono">
          {embedDim ? `dim=${embedDim}` : "dim=768"}
          {hasRealData && embedDim && embedDim > VISUALIZATION_DIMS && (
            <span className="text-cyan-300/70 block mt-0.5">
              (显示前{VISUALIZATION_DIMS}维)
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        基于词表索引生成的确定性高维向量映射
      </p>
      <div className="flex flex-wrap gap-4 mt-6">
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
            const min = Math.min(...vector);
            const max = Math.max(...vector);
            stats = { mean, std, min, max };
          }

          return (
            <div key={idx} className="flex flex-col items-center group">
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-700 mb-2 code-font text-[10px] text-cyan-300 transition-colors group-hover:border-cyan-500/50">
                {token}
              </div>
              <div className="grid grid-cols-16 gap-0.5 p-1 bg-slate-950 rounded-sm border border-slate-800">
                {displayVector.map((val, vIdx) => {
                  // 归一化值用于可视化
                  const normalizedVal = hasRealData ? normalizeValue(val) : val;
                  return (
                    <div
                      key={vIdx}
                      className="w-2 h-2 rounded-[1px] transition-all duration-500 hover:scale-150 hover:z-10"
                      style={{
                        backgroundColor: hasRealData
                          ? val > 0
                            ? `rgba(34, 211, 238, ${normalizedVal})`
                            : `rgba(239, 68, 68, ${1 - normalizedVal})`
                          : `rgba(34, 211, 238, ${normalizedVal})`,
                        opacity: normalizedVal,
                      }}
                      title={
                        hasRealData
                          ? `维度 ${vIdx}: ${val.toFixed(4)}`
                          : `模拟值: ${val.toFixed(4)}`
                      }
                    />
                  );
                })}
              </div>
              {hasRealData && stats && (
                <div className="mt-1 text-[8px] text-slate-500 font-mono">
                  <div>
                    μ={stats.mean.toFixed(3)} σ={stats.std.toFixed(3)}
                  </div>
                  <div>
                    [{stats.min.toFixed(2)}, {stats.max.toFixed(2)}]
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-mono">
        {/* 词元嵌入模块 */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <span className="text-cyan-500/70 block mb-2 font-bold text-xs">
            {hasRealData ? "// 词元嵌入 (WTE)" : "// 仿真语义空间"}
          </span>
          <div className="text-slate-300 scale-90 origin-left text-xs">
            {hasRealData ? (
              <InlineMath
                math={`\\mathbf{e}_{i} = \\text{WTE}[id_i] \\in \\mathbb{R}^{${
                  embedDim || 384
                }}`}
              />
            ) : (
              <InlineMath math="\text{vec} \approx \mathcal{H}(\text{token}) \to \mathbb{R}^d" />
            )}
          </div>
        </div>

        {/* 位置嵌入模块 */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <span className="text-cyan-500/70 block mb-2 font-bold text-xs">
            {hasRealData ? "// 位置嵌入 (WPE)" : "// 旋转/正弦位置编码"}
          </span>
          <div className="text-slate-300 scale-90 origin-left text-xs">
            {hasRealData ? (
              <InlineMath
                math={`\\mathbf{p}_{i} = \\text{WPE}[pos_i] \\in \\mathbb{R}^{${
                  embedDim || 384
                }}`}
              />
            ) : (
              <InlineMath math="PE_{(p, 2i)} = \sin(\frac{p}{10000^{2i/d}})" />
            )}
          </div>

          {hasRealData && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-cyan-400/70 text-xs">
              <InlineMath math="\mathbf{h}_0 = \mathbf{e}_i + \mathbf{p}_i" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbeddingVisualizer;
