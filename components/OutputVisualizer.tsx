"use client";
import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  probabilities: { token: string; prob: number }[];
  logits?: { token: string; logit: number }[];
}

const OutputVisualizer: React.FC<Props> = ({ probabilities, logits }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [showLogits, setShowLogits] = useState(false);

  // 根据模式选择数据源
  const displayData = showLogits && logits ? logits : probabilities;
  const isLogitsMode = showLogits && logits;

  const chartData = [...displayData]
    .sort((a, b) => {
      if (isLogitsMode) {
        return (
          (a as { token: string; logit: number }).logit -
          (b as { token: string; logit: number }).logit
        );
      } else {
        return (
          (a as { token: string; prob: number }).prob -
          (b as { token: string; prob: number }).prob
        );
      }
    }) // ECharts yAxis category needs reverse order for visual top-down
    .map((p) => ({
      name: p.token,
      value: isLogitsMode
        ? (p as { token: string; logit: number }).logit.toFixed(2)
        : ((p as { token: string; prob: number }).prob * 100).toFixed(2),
    }));

  const bestToken = [...displayData].sort((a, b) => {
    if (isLogitsMode) {
      return (
        (b as { token: string; logit: number }).logit -
        (a as { token: string; logit: number }).logit
      );
    } else {
      return (
        (b as { token: string; prob: number }).prob -
        (a as { token: string; prob: number }).prob
      );
    }
  })[0];

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f8fafc" },
        formatter: (params: any) => {
          const p = params[0];
          return `<div class="px-2 py-1">
            <span class="text-slate-400">Token:</span> <span class="font-bold">"${
              p.name
            }"</span><br/>
            <span class="text-emerald-400">${
              isLogitsMode ? "Logit" : "概率"
            }:</span> <span class="font-bold">${p.value}${
            isLogitsMode ? "" : "%"
          }</span>
          </div>`;
        },
      },
      grid: {
        left: "3%",
        right: "10%",
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
          formatter: (value: string) => `"${value}"`,
        },
      },
      series: [
        {
          name: isLogitsMode ? "Logits (Softmax 前)" : "预测概率",
          type: "bar",
          data: chartData.map((d, idx) => ({
            value: d.value,
            itemStyle: {
              color: idx === chartData.length - 1 ? "#10b981" : "#334155",
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: "60%",
          label: {
            show: true,
            position: "right",
            color: "#94a3b8",
            fontSize: 10,
            formatter: isLogitsMode ? "{c}" : "{c}%",
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // We don't dispose here to prevent flickering on re-renders,
      // instead we update the option above.
    };
  }, [displayData, isLogitsMode]);

  return (
    <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-emerald-400">
          {isLogitsMode
            ? "输出层 (Logits - Softmax 前)"
            : "输出层 (Softmax 归一化)"}
        </h3>
        {logits && logits.length > 0 && (
          <button
            onClick={() => setShowLogits(!showLogits)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
          >
            {showLogits ? (
              <>
                <EyeOff className="w-4 h-4" />
                显示概率
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                显示 Logits
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        {isLogitsMode
          ? "显示 Softmax 之前的原始 logits 值。Logits 是模型输出的未归一化分数，数值越大表示该 token 越可能被选择。"
          : "根据 Transformer 最后一层的输出，映射回词表空间，并计算每个词作为后续生成的概率。"}
      </p>

      <div className="h-[320px] w-full" ref={chartRef}>
        {!probabilities.length && (
          <div className="flex items-center justify-center h-full text-slate-500 italic">
            等待分析数据...
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest block mb-1">
          最佳候选 Token
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            {bestToken?.token || "..."}
          </span>
          {bestToken && (
            <span className="text-xs text-emerald-400 font-mono">
              {isLogitsMode
                ? `logit: ${(
                    bestToken as { token: string; logit: number }
                  ).logit.toFixed(2)}`
                : `prob: ${(
                    (bestToken as { token: string; prob: number }).prob * 100
                  ).toFixed(2)}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputVisualizer;
