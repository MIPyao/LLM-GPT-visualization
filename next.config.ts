import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 某些情况下需要禁用这个来避免 WASM 报错
  serverExternalPackages: ["@xenova/transformers", "sharp", "onnxruntime-node"],

  // Turbopack 配置（Next.js 16 默认使用）
  // 注意：@xenova/transformers 在 Turbopack 下可能有问题，建议使用 webpack
  turbopack: {
    resolveAlias: {
      // 确保客户端正确解析
    },
  },

  // Webpack 配置（当使用 --webpack 标志时）
  // 推荐使用 webpack 模式，因为 @xenova/transformers 对 webpack 支持更好
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        sharp: false,
        "onnxruntime-node": false,
      };

      // 确保 @xenova/transformers 在客户端正确加载
      config.resolve.alias = {
        ...config.resolve.alias,
      };

      // 优化模块解析
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
      };

      // 忽略 source map 警告和常见的 404 错误
      config.ignoreWarnings = [
        { module: /node_modules\/@xenova\/transformers/ },
        /Failed to parse source map/,
        /installHook\.js\.map/,
        /react_devtools_backend/,
        /\.map$/,
        /can't access property "sources"/,
      ];
    }
    return config;
  },
};

export default nextConfig;
