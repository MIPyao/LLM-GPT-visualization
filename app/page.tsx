"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Palette,
  Sparkles,
} from "lucide-react";
import { useTransformer } from "@/hooks/useTransformer";
import { analyzePrompt } from "@/services/geminiService";
import EmbeddingVisualizer from "@/components/EmbeddingVisualizer";
import AttentionHeadView from "@/components/AttentionHeadView";
import OutputVisualizer from "@/components/OutputVisualizer";
import SettingsModal from "@/components/SettingsModal";
import { AnalysisResult } from "@/types";

// 设计 Token (基于新的设计系统)
const DesignTokens = {
  colors: {
    bgPrimary: "var(--color-bg-primary)",
    bgSecondary: "var(--color-bg-secondary)",
    bgTertiary: "var(--color-bg-tertiary)",
    bgElevated: "var(--color-bg-elevated)",
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    primary: "var(--color-primary)",
    primarySubtle: "var(--color-primary-subtle)",
    accentCyan: "var(--color-accent-cyan)",
    accentEmerald: "var(--color-accent-emerald)",
    accentAmber: "var(--color-accent-amber)",
    accentRose: "var(--color-accent-rose)",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
  },
  shadows: {
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    glow: "var(--shadow-glow)",
  },
};

const ProgressRow: React.FC<{ label: string; progress: number }> = ({
  label,
  progress,
}) => {
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono tracking-tight">{label}</span>
        <span className="font-bold tabular-nums">{Math.round(safeProgress * 100)}%</span>
      </div>
      <div className="relative w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
        {/* 静态背景条 */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-900 to-slate-800" />
        {/* 动态进度条 */}
        <div
          className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 to-cyan-400"
          style={{
            width: `${safeProgress * 100}%`,
            boxShadow: safeProgress > 0.1 ? "0 0 8px rgba(99, 102, 241, 0.5)" : "none",
            transition: `width var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out)`,
          }}
        />
        {/* 端点光晕 */}
        {safeProgress < 1 && safeProgress > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.7)] transition-all duration-300"
            style={{ left: `calc(${safeProgress * 100}% - 6px)` }}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [themeColor, setThemeColor] = useState("indigo");
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  const {
    initModel,
    isReady,
    generatorProgress,
    featureModelProgress,
    currentModel,
    generate,
  } = useTransformer();

  // 1. 专门负责挂载标记
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. 专门负责模式切换和初始化逻辑
  useEffect(() => {
    // 关键：只有在客户端挂载完成，且是本地模式，且模型没准备好时才触发
    if (mounted) {
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

  const formatEncodedId = (value: number | bigint) =>
    typeof value === "bigint" ? `${value}n` : value.toString();

  const encodedIds = analysis?.encodedInputIds ?? [];
  const tokenLosses = analysis?.lossStats?.tokenLosses ?? [];

  // 主题配色系统 - 基于 CSS 变量的动态更新
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // 预定义主题色板
    const themes: Record<string, { primary: string; gradient: string }> = {
      indigo: {
        primary: "#6366f1",
        gradient: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)"
      },
      cyan: {
        primary: "#06b6d4",
        gradient: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)"
      },
      emerald: {
        primary: "#10b981",
        gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)"
      }
    };

    const theme = themes[themeColor] || themes.indigo;

    root.style.setProperty("--color-primary", theme.primary);
    root.style.setProperty("--gradient-primary", theme.gradient);

    root.style.setProperty("--duration-normal", `${300 / animationSpeed}ms`);
  }, [themeColor, animationSpeed, mounted]);

  // 粒子背景效果
  useEffect(() => {
    if (!particlesEnabled || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    let animationFrameId: number;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

    // Read primary color once at initialization
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#6366f1';
    let baseR = 99, baseG = 102, baseB = 241; // default #6366f1
    if (primaryColor.startsWith('#')) {
      baseR = parseInt(primaryColor.slice(1, 3), 16);
      baseG = parseInt(primaryColor.slice(3, 5), 16);
      baseB = parseInt(primaryColor.slice(5, 7), 16);
    } else if (primaryColor.startsWith('rgb(')) {
      const match = primaryColor.match(/\d+/g);
      if (match) {
        baseR = parseInt(match[0]);
        baseG = parseInt(match[1]);
        baseB = parseInt(match[2]);
      }
    }

    const resize = () => {
      // 使用 window 尺寸作为 canvas 尺寸 (全屏背景)
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.max(10, Math.floor((canvas.width * canvas.height) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${p.alpha})`;
        ctx.fill();
      });
    };

    const update = () => {
      particles.forEach(p => {
        p.x += p.vx / animationSpeed;
        p.y += p.vy / animationSpeed;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
    };

    const animate = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };

    // 确保 canvas 尺寸正确
    resize();
    createParticles();
    animate();

    const handleResize = () => {
      resize();
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [particlesEnabled, animationSpeed, themeColor, mounted]);

  // 解决 Next.js SSR 引起的不一致问题
  if (!mounted) return null;

  // 检查是否正在加载模型
  const isModelLoading = mode === "local" && !isReady;

  return (
    <div className={`min-h-screen ${DesignTokens.colors.bgPrimary} text-slate-200 relative overflow-x-hidden`}>
      {/* 粒子背景 */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: particlesEnabled ? 0.6 : 0,
          transition: 'opacity 0.5s ease'
        }}
      />

      {/* 背景装饰光 - 动态 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[100px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* 模型加载遮罩层 */}
      {isModelLoading && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md z-[200] flex items-center justify-center">
          <div className="text-center space-y-8 max-w-lg px-8">
            {/* 三环加载器 */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-3 border-indigo-500/15 rounded-full"></div>
              <div className="absolute inset-0 border-3 border-transparent border-t-indigo-500 border-r-cyan-400 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-0 border-3 border-transparent border-b-emerald-400 rounded-full animate-spin-reverse" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Box className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                正在加载本地模型
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                GPT2 生成器和 MiniLM 特征提取器逐步加载中。首次加载可能需要几分钟。
              </p>
              <div className="mt-6 space-y-4 text-left max-w-sm mx-auto">
                <ProgressRow
                  label={`主模型：${currentModel}`}
                  progress={generatorProgress}
                />
                <ProgressRow
                  label="特征提取：Xenova/all-MiniLM-L6-v2"
                  progress={featureModelProgress}
                />
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" />
                ONNX Runtime 警告属于正常优化提示，可放心忽略
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 侧边栏 */}
      <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 border-r border-slate-800/50 bg-slate-950/90 backdrop-blur-xl z-[100]">
        {/* Logo 区域 */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-linear-to-r from-indigo-500 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/5">
            <Cpu className="text-white w-6 h-6" />
          </div>
        </div>

        <nav className="flex flex-col gap-6 mt-12">
          {[
            { id: 0, icon: Binary, label: "嵌入层" },
            { id: 1, icon: Network, label: "注意力" },
            { id: 2, icon: Zap, label: "输出预测" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveLayer(item.id)}
              disabled={isModelLoading}
              className={`group relative p-3.5 rounded-xl transition-all duration-300 disabled:opacity-40 ${
                activeLayer === item.id
                  ? "bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-lg ring-1 ring-indigo-500/50"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-slate-700/50 pointer-events-none z-30">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-4">
          <button
            onClick={() => setShowSettings(true)}
            disabled={isModelLoading}
            className="text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-40 p-2 hover:bg-slate-900 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30" />
            <div className="absolute -inset-1 bg-emerald-500/20 rounded-full animate-ping" />
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="ml-20 p-8 max-w-[160rem] mx-auto relative z-10">
        {/* 头部区 */}
        <header className="flex flex-col lg:flex-row gap-8 mb-12 items-end justify-between">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              Transformer Visualization Lab
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none">
              <span className="text-slate-100">LLM </span>
              <span className="text-gradient animate-gradient bg-clip-text text-transparent bg-[length:200%_200%]">
                自回归模型架构可视化
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              深入探索 Transformer 的神经脉络：从词元嵌入、多头注意力到输出概率分布。
              实时对比本地 WASM 引擎与 Gemini 云端推理的差异。
            </p>

            {/* 输入区 */}
            <div className="relative group mt-6 max-w-3xl">
              <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/50 to-cyan-400/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl focus-within:border-indigo-500/50 transition-all shadow-xl">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isModelLoading && handleProcess()
                  }
                  disabled={isModelLoading}
                  className="flex-1 bg-transparent px-6 py-4 text-base focus:outline-none disabled:opacity-50 font-mono placeholder:text-slate-500"
                  placeholder="输入文本进行推理（例如：The future of AI is）"
                />
                <button
                  onClick={handleProcess}
                  disabled={loading || isModelLoading}
                  className="magnetic-button relative mx-3 bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg ring-1 ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                >
                  <span className="relative z-10">{loading ? "处理中..." : "运行分析"}</span>
                  {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
                  <div className="absolute inset-0 bg-linear-to-r from-cyan-500/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </div>

          {/* 模式切换器 */}
          <div className="flex bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700/50 shadow-lg shrink-0">
            <button
              onClick={() => setMode("cloud")}
              disabled={isModelLoading}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-40 ${
                mode === "cloud"
                  ? "bg-slate-800 text-white shadow-md ring-1 ring-white/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-4 h-4" />
              Gemini 云端
            </button>
            <button
              onClick={() => setMode("local")}
              disabled={isModelLoading}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-40 ${
                mode === "local"
                  ? "bg-slate-800 text-white shadow-md ring-1 ring-white/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Box className="w-4 h-4" />
              本地引擎
            </button>
          </div>
        </header>

        {/* 主视觉区 */}
        <div className="space-y-8">
          {analysis ? (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {activeLayer === 0 && (
                  <EmbeddingVisualizer
                    tokens={analysis.tokens}
                    embeddingData={analysis.embeddingData}
                  />
                )}
                {activeLayer === 1 && (
                  <AttentionHeadView
                    tokens={analysis.tokens}
                    transformerStates={analysis.transformerStates}
                    activeLayer={activeTransformerLayer}
                    onLayerChange={setActiveTransformerLayer}
                  />
                )}
                {activeLayer === 2 && (
                  <OutputVisualizer
                    probabilities={analysis.probabilities}
                    logits={analysis.logits}
                    lossStats={analysis.lossStats}
                  />
                )}
              </div>

              {/* 右侧信息面板 */}
              <div className="space-y-6">
                {/* Tokenization 卡片 */}
                <div className="glass rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-emerald-400 rounded-full" />
                    分词 (Tokenization)
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {analysis.tokens.map((t, i) => (
                      <div
                        key={i}
                        className="group relative bg-slate-800/70 border border-slate-700/60 px-3.5 py-2 rounded-xl flex flex-col items-center hover:border-indigo-500/30 transition-all hover:-translate-y-0.5 shadow-md"
                      >
                        <span className="text-[9px] font-mono text-emerald-400/70 mb-1">
                          {i}
                        </span>
                        <span className="text-sm font-bold text-white font-mono">
                          &quot;{t}&quot;
                        </span>
                      </div>
                    ))}
                  </div>
                  {encodedIds.length > 0 && (
                    <div className="mt-6 space-y-2 bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
                      <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-bold">
                        嵌入 Token 词表 ID
                      </div>
                      <div className="flex flex-wrap gap-2.5 text-[10px] font-mono text-emerald-400/90">
                        {encodedIds.map((id, idx) => (
                          <span key={`${idx}-${id}`} className="bg-slate-800/50 px-2 py-1 rounded">
                            {idx}: {formatEncodedId(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tokenLosses.length > 0 && (
                    <div className="mt-6 space-y-3 bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
                      <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-bold">
                        Token 损失值 (NLL)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tokenLosses.map((loss, idx) => (
                          <div
                            key={`loss-${idx}`}
                            className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[10px] font-mono text-slate-200 shadow-sm"
                          >
                            <div className="text-[9px] uppercase tracking-widest text-slate-500">
                              #{idx}
                            </div>
                            <div className="font-semibold text-emerald-300">
                              {loss.toFixed(4)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        每个位置的负对数似然，反映模型对下个 token 的信心程度。
                      </p>
                    </div>
                  )}
                </div>

                {/* 层解析信息 */}
                <div className="group glass-darker p-6 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all duration-500">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-indigo-500/20">
                      <ShieldCheck className="text-indigo-400 w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        层逻辑解析
                      </h4>
                      <p className="text-slate-200 text-sm leading-relaxed">
                        &quot;{analysis.explanation}&quot;
                      </p>
                      {mode === "local" && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                              主模型
                            </p>
                            <p className="font-semibold text-white text-sm mt-1 font-mono">
                              {currentModel}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                              自回归 GPT-2 生成器
                            </p>
                          </div>
                          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                              特征提取
                            </p>
                            <p className="font-semibold text-white text-sm mt-1 font-mono truncate">
                              MiniLM-L6-v2
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                              提供真实 embedding
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 状态卡片 */}
                <div className="glass bg-linear-to-br from-indigo-900/40 to-indigo-950/60 p-6 rounded-2xl shadow-lg ring-1 ring-indigo-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.15em]">
                      推理引擎状态
                    </h3>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-2 tracking-tight">
                    {mode === "cloud" ? "Gemini 2.5 Flash" : "WASM 引擎"}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">运行模式</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {mode === "cloud" ? "云端实时" : "本地推理"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center py-40 relative overflow-hidden group">
              {/* 装饰性动态背景 */}
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/[0.02] to-cyan-400/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10 text-center px-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
                  <Box className="w-12 h-12 text-slate-700 group-hover:text-indigo-500/50 transition-colors duration-700 relative" />
                </div>
                <h3 className="text-xl font-light text-slate-300 mb-2 tracking-tight">
                  准备开始探索
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed text-sm">
                  输入任意文本，实时观察 Transformer 内部运作机制，可视化每个神经元的决策过程。
                </p>
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full text-xs text-slate-400 border border-slate-700/50">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  模型就绪，等待输入
                </div>
              </div>
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

      {/* Tweaks 面板 (浮动) */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ${tweaksOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="glass p-5 rounded-2xl shadow-2xl ring-1 ring-white/5 w-72">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/30">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              Tweaks
            </h3>
            <button onClick={() => setTweaksOpen(false)} className="text-slate-500 hover:text-slate-200">
              ✕
            </button>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-2">主题色</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setThemeColor("indigo")}
                  className={`flex-1 h-8 rounded-lg transition-all ${themeColor === "indigo" ? "bg-indigo-600 ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500 shadow-lg" : "bg-indigo-600/50 ring-1 ring-slate-700 hover:ring-indigo-400"}`}
                  title="Indigo"
                />
                <button
                  onClick={() => setThemeColor("cyan")}
                  className={`flex-1 h-8 rounded-lg transition-all ${themeColor === "cyan" ? "bg-cyan-600 ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-500 shadow-lg" : "bg-cyan-600/50 ring-1 ring-slate-700 hover:ring-cyan-400"}`}
                  title="Cyan"
                />
                <button
                  onClick={() => setThemeColor("emerald")}
                  className={`flex-1 h-8 rounded-lg transition-all ${themeColor === "emerald" ? "bg-emerald-600 ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-500 shadow-lg" : "bg-emerald-600/50 ring-1 ring-slate-700 hover:ring-emerald-400"}`}
                  title="Emerald"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-2">动画速度</label>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500/50 outline-none"
              >
                <option value={0.5}>缓慢 (0.5x)</option>
                <option value={1}>正常 (1x)</option>
                <option value={1.5}>快速 (1.5x)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">粒子背景</span>
              <button
                onClick={() => setParticlesEnabled(!particlesEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${particlesEnabled ? "bg-indigo-600" : "bg-slate-700"}`}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${particlesEnabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tweaks 开关按钮 */}
      <button
        onClick={() => setTweaksOpen(!tweaksOpen)}
        className="fixed bottom-8 right-8 z-40 w-12 h-12 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all group"
      >
        <Palette className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default App;
