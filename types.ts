export interface TokenInfo {
  id: number;
  text: string;
  embedding: number[];
  attentionWeights: number[];
}

export interface LayerExplanation {
  title: string;
  description: string;
  technicalDetails: string[];
}

export interface ModelStep {
  name: string;
  description: string;
  component: "embedding" | "transformer" | "output";
}

export interface TransformerStates {
  layerIndex?: number; // Transformer 层索引 (0-11)
  keyData?: number[]; // 注意力机制的 Key 张量数据
  valueData?: number[]; // 注意力机制的 Value 张量数据
  keyDims?: number[] | null; // Key 张量的维度
  valueDims?: number[] | null; // Value 张量的维度
}

export interface EmbeddingData {
  data: number[]; // 嵌入向量数据（扁平化）
  dims: number[] | null; // 维度，例如 [batch_size, seq_len, embed_dim] = [1, 4, 768]
  tokenEmbeddings?: number[][]; // 每个token的嵌入向量 [seq_len, embed_dim]
}

export interface AnalysisResult {
  tokens: string[];
  explanation: string;
  probabilities: { token: string; prob: number }[];
  transformerStates?: TransformerStates[] | null;
  logits?: { token: string; logit: number }[]; // Softmax 之前的原始 logits
  embeddingData?: EmbeddingData | null; // 嵌入层数据（词元嵌入+位置嵌入）
}
