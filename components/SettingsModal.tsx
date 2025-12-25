"use client";

import React from "react";
import { X, Sliders } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topK: number;
  topP: number;
  onTopKChange: (value: number) => void;
  onTopPChange: (value: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  topK,
  topP,
  onTopKChange,
  onTopPChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">推理参数设置</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* TopK 设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-300">Top-K</label>
              <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
                {topK}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              选择概率最高的 K 个 token
              进行采样。较小的值会产生更确定性的输出，较大的值会增加多样性。
            </p>
            <input
              type="range"
              min="1"
              max="50"
              value={topK}
              onChange={(e) => onTopKChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>1</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>50</span>
            </div>
            <input
              type="number"
              min="1"
              max="50"
              value={topK}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 50) {
                  onTopKChange(val);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* TopP 设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-300">
                Top-P (Nucleus Sampling)
              </label>
              <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
                {topP.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              累积概率阈值。只考虑累积概率达到此值的 token。0.9
              表示只考虑累积概率前 90% 的 token。
            </p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={topP}
              onChange={(e) => onTopPChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>0.0</span>
              <span>0.5</span>
              <span>0.9</span>
              <span>0.95</span>
              <span>1.0</span>
            </div>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={topP}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 1) {
                  onTopPChange(val);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* 说明 */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">提示：</strong>
              Top-K 和 Top-P 可以同时使用。模型会先应用 Top-K
              筛选，然后对结果应用 Top-P 筛选。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
