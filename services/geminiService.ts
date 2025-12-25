'use client'

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzePrompt = async (prompt: string): Promise<AnalysisResult> => {
  // 必须在函数内部初始化，以确保能正确读取到环境变量
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
  
  // Use gemini-3-pro-preview for complex reasoning and technical expert tasks
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `请作为深度学习专家分析以下文本： "${prompt}"。
    1. 解释 Transformer 架构的注意力机制如何处理这段输入。
    2. 提供模拟的分词（Tokens）列表。
    3. 提供下一个 Token 预测的概率分布。
    请务必使用中文进行专业的技术解释。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tokens: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "分词结果。"
          },
          explanation: {
            type: Type.STRING,
            description: "关于注意力机制处理逻辑的中文技术解析。"
          },
          probabilities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                token: { type: Type.STRING },
                prob: { type: Type.NUMBER }
              },
              required: ["token", "prob"]
            },
            description: "概率分布预测。"
          }
        },
        required: ["tokens", "explanation", "probabilities"]
      }
    }
  });

  try {
    // response.text is a getter property that returns the generated string
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      tokens: prompt.split(" "),
      explanation: "暂时无法生成详细解析报告。",
      probabilities: []
    };
  }
};