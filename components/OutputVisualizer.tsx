"use client";

import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import { Eye, EyeOff, BarChart3 } from "lucide-react";
import type { LossStats } from "@/types";

type TokenData = { token: string; prob: number };
type LogitData = { token: string; logit: number };

interface Props {
  probabilities: TokenData[];
  logits?: LogitData[];
  lossStats?: LossStats | null;
}

const OutputVisualizer: React.FC<Props> = ({
  probabilities,
  logits,
  lossStats,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [showLogits, setShowLogits] = useState(false);

  const displayData = showLogits && logits ? logits : probabilities;
  const isLogitsMode = showLogits && logits;

  const chartData = [...displayData]
    .sort((a, b) => {
      if (isLogitsMode) {
        return (a as LogitData).logit - (b as LogitData).logit;
      } else {
        return (a as TokenData).prob - (b as TokenData).prob;
      }
    })
    .map((p) => ({
      name: p.token,
      value: isLogitsMode
        ? (p as LogitData).logit.toFixed(2)
        : ((p as TokenData).prob * 100).toFixed(2),
    }));

  const bestToken = [...displayData].sort((a, b) => {
    if (isLogitsMode) {
      return (b as LogitData).logit - (a as LogitData).logit;
    } else {
      return (b as TokenData).prob - (a as TokenData).prob;
    }
  })[0];

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const colors = isLogitsMode
      ? ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"]
      : ["#06b6d4", "#0891b2", "#0e7490", "#155e75"];

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 19, 26, 0.95)",
        borderColor: "#334155",
        borderWidth: 1,
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        padding: [8, 12],
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return "";
          const color = p.color;
          const name = p.name;
          const value = p.value;
          return (
            '<div class="flex items-center gap-2 mb-1">' +
              `<div class="w-2 h-2 rounded-full" style="background:${color}"></div>` +
              `<span class="font-bold text-slate-100">"${name}"</span>` +
            '</div>' +
            '<div class="flex items-center gap-2">' +
              `<span class="text-slate-400">${isLogitsMode ? "Logit" : "概率"}:</span>` +
              `<span class="font-mono font-bold" style="color:${color}">${value}${isLogitsMode ? "" : "%"}</span>` +
            '</div>'
          );
        },
      },
      grid: {
        left: "3%",
        right: "12%",
        bottom: "3%",
        top: "5%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        show: false,
      },
      yAxis: {
        type: "category",
        data: chartData.map((d) => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 12,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          margin: 8,
          formatter: (value: string) => `"${value}"`,
        },
      },
      series: [
        {
          name: isLogitsMode ? "Logits" : "Probability",
          type: "bar",
          data: chartData.map((d, idx) => {
            const isBest = idx === chartData.length - 1;
            return {
              value: d.value,
              itemStyle: {
                color: isBest ? "#10b981" : colors[idx % colors.length],
                borderRadius: [0, 8, 8, 0],
                shadowColor: isBest ? "rgba(16, 185, 129, 0.4)" : "transparent",
                shadowBlur: isBest ? 12 : 0,
              },
            };
          }),
          barWidth: "50%",
          label: {
            show: true,
            position: "right",
            color: "#94a3b8",
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            formatter: isLogitsMode ? "{c}" : "{c}%",
            distance: 8,
          },
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLogitsMode, chartData]);

  if (!probabilities.length) {
    return (
      <div className="glass rounded-2xl p-8 shadow-lg ring-1 ring-white/5 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            输出层 (Softmax 归一化)
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 italic">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-dashed border-slate-700 rounded-full mx-auto mb-3 animate-pulse" />
            <p>等待分析数据...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg ring-1 ring-white/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center ring-1 ring-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400">
              {isLogitsMode ? "输出层 (Logits)" : "输出层 (Softmax)"}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {isLogitsMode ? "Softmax 前" : "归一化概率"}
            </p>
          </div>
        </div>
        {logits && logits.length > 0 && (
          <button
            onClick={() => setShowLogits(!showLogits)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-lg text-xs font-medium text-slate-300 transition-all"
          >
            <div className={`transition-transform ${showLogits ? 'rotate-180' : ''}`}>
              {showLogits ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </div>
            <span>{showLogits ? "显示概率" : "显示 Logits"}</span>
          </button>
        )}
      </div>

      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        {isLogitsMode
          ? "显示 Softmax 之前的原始 logits 值。Logits 是模型输出的未归一化分数，数值越大表示该 token 越可能被选择。"
          : "根据 Transformer 最后一层的输出，映射回词表空间，并计算每个词作为后续生成的概率。"}
      </p>

      <div className="h-[320px] w-full relative" ref={chartRef}>
        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 rounded-lg">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin mb-2" />
              <p className="text-slate-500 text-sm">加载图表...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">
            最佳候选 Token
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {bestToken?.token || "..."}
            </span>
            {bestToken && (
              <span className="text-sm text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                {isLogitsMode
                  ? `${(bestToken as LogitData).logit.toFixed(2)}`
                  : `${((bestToken as TokenData).prob * 100).toFixed(1)}%`}
              </span>
            )}
          </div>
        </div>

        {lossStats && (
          <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">平均损失</span>
              <span className="text-slate-400">困惑度</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-emerald-300 font-mono">
                {lossStats.avgLoss.toFixed(4)}
              </span>
              <span className="text-xl font-bold text-emerald-300 font-mono">
                {lossStats.perplexity.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputVisualizer;
