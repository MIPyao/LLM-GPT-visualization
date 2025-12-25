"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Binary,
  Network,
  Zap,
  ArrowRight,
  ShieldCheck,
  Settings,
  Activity,
  Box,
  AlertCircle,
} from "lucide-react";
import { useTransformer } from "@/hooks/useTransformer";
import { analyzePrompt } from "@/services/geminiService";
import EmbeddingVisualizer from "@/components/EmbeddingVisualizer";
import AttentionHeadView from "@/components/AttentionHeadView";
import OutputVisualizer from "@/components/OutputVisualizer";
import SettingsModal from "@/components/SettingsModal";
import { AnalysisResult } from "@/types";

const App: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("Attention is all you need");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeLayer, setActiveLayer] = useState(0); // 视图层：0=嵌入, 1=注意力, 2=输出
  const [activeTransformerLayer, setActiveTransformerLayer] = useState(0); // Transformer 层索引 (0-11)
  const [mode, setMode] = useState<"cloud" | "local">("local");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [topK, setTopK] = useState(10);
  const [topP, setTopP] = useState(1.0);

  const {
    initModel,
    isReady,
    loadingProgress,
    generate,
    error: modelError,
  } = useTransformer();

  // 1. 专门负责挂载标记
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. 专门负责模式切换和初始化逻辑
  useEffect(() => {
    // 关键：只有在客户端挂载完成，且是本地模式，且模型没准备好时才触发
    if (mounted) {
      console.log("组件已挂载");
      if (mode === "local" && !isReady) {
        console.log("触发本地模型初始化...");
        initModel();
      }
    }
  }, [mounted, mode, isReady, initModel]);

  const handleProcess = async () => {
    if (!input.trim()) return; // 防止空输入请求
    setLoading(true);

    try {
      if (mode === "cloud") {
        const result = await analyzePrompt(input);
        setAnalysis(result);
      } else {
        // 本地模式：必须确保初始化完成
        let currentIsReady = isReady;
        if (!currentIsReady) {
          // 如果还没初始化，先初始化
          await initModel();
          currentIsReady = true;
        }

        const result = await generate(input, { topK, topP });
        if (result) {
          setAnalysis(result);
        }
      }
    } catch (err) {
      console.error("处理失败:", err);
      // 这里可以加一个 setAnalysis(仿真数据) 防止界面崩掉
    } finally {
      setLoading(false);
    }
  };

  // 解决 Next.js SSR 引起的不一致问题
  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  // 检查是否正在加载模型
  const isModelLoading = mode === "local" && !isReady;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative">
      {/* 模型加载遮罩层 */}
      {isModelLoading && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-sm z-100 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md px-8">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Box className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                正在加载本地模型
              </h2>
              <p className="text-slate-400 text-sm">
                首次加载需要下载模型文件，请稍候...
              </p>
              {loadingProgress > 0 && loadingProgress < 1 && (
                <div className="mt-4 space-y-2">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${loadingProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {Math.round(loadingProgress * 100)}%
                  </p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                控制台中的 ONNX Runtime 警告是正常的优化提示，不影响使用
              </p>
            </div>
          </div>
        </div>
      )}
      <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 border-r border-slate-800 bg-slate-950 z-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl mb-12 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Cpu className="text-white w-6 h-6" />
        </div>

        <nav className="flex flex-col gap-8">
          {[
            { id: 0, icon: Binary, label: "嵌入层" },
            { id: 1, icon: Network, label: "注意力" },
            { id: 2, icon: Zap, label: "输出预测" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveLayer(item.id)}
              disabled={isModelLoading}
              className={`group relative p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                activeLayer === item.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 hover:bg-slate-900"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-6">
          <button
            onClick={() => setShowSettings(true)}
            disabled={isModelLoading}
            className="text-slate-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        </div>
      </aside>

      <main className="ml-20 p-8 max-w-8xl mx-auto">
        <header className="flex flex-col md:flex-row gap-6 mb-12 items-end">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              LLM{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
                架构可视化
              </span>
            </h1>
            <div className="relative group mt-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isModelLoading && handleProcess()
                }
                disabled={isModelLoading}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="输入文本以进行推理（本地模型只能是英文）..."
              />
              <button
                onClick={handleProcess}
                disabled={loading || isModelLoading}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                运行
              </button>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setMode("cloud")}
              disabled={isModelLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "cloud"
                  ? "bg-slate-800 text-white shadow-lg"
                  : "text-slate-500"
              }`}
            >
              <Activity className="w-3 h-3" /> Gemini 云端
            </button>
            <button
              onClick={() => setMode("local")}
              disabled={isModelLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "local"
                  ? "bg-slate-800 text-white shadow-lg"
                  : "text-slate-500"
              }`}
            >
              <Box className="w-3 h-3" /> 本地引擎
            </button>
          </div>
        </header>

        <div className="space-y-8">
          {analysis ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden min-h-[500px]">
                  {activeLayer === 0 && (
                    <EmbeddingVisualizer
                      tokens={analysis.tokens}
                      embeddingData={analysis.embeddingData}
                    />
                  )}
                  {activeLayer === 1 && (
                    <AttentionHeadView
                      tokens={analysis.tokens}
                      hiddenStates={analysis.hiddenStates}
                      activeLayer={activeTransformerLayer}
                      onLayerChange={setActiveTransformerLayer}
                    />
                  )}
                  {activeLayer === 2 && (
                    <OutputVisualizer
                      probabilities={analysis.probabilities}
                      logits={analysis.logits}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    分词 (Tokenization)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.tokens.map((t, i) => (
                      <div
                        key={i}
                        className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex flex-col items-center"
                      >
                        <span className="text-indigo-400 text-[10px] font-mono mb-1">
                          {i}
                        </span>
                        <span className="text-sm font-bold text-white">
                          "{t}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                      层逻辑解析
                    </h4>
                    <p className="text-slate-200 text-sm leading-relaxed font-medium">
                      "{analysis.explanation}"
                    </p>
                  </div>
                </div>

                <div className="bg-linear-to-br from-indigo-900 to-indigo-700 p-6 rounded-3xl shadow-xl">
                  <h3 className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                    推理引擎状态
                  </h3>
                  <p className="text-2xl font-bold text-white mb-2">
                    {mode === "cloud" ? "Gemini 2.5 Flash" : "WASM 引擎"}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {mode === "cloud"
                      ? "状态：在线 (Connected)"
                      : isReady
                      ? "状态：本地就绪"
                      : "状态：等待载入"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 border border-dashed border-slate-800 rounded-3xl">
              <Box className="w-12 h-12 text-slate-800 animate-pulse mb-4" />
              <p className="text-slate-600 font-medium">
                准备就绪，请输入文本开启可视化分析
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 设置模态框 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        topK={topK}
        topP={topP}
        onTopKChange={setTopK}
        onTopPChange={setTopP}
      />
    </div>
  );
};

export default App;
