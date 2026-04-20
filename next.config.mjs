/**
 * GitHub Pages 使用仓库子路径 `/pureairweb`；Vercel 使用站点根路径 `/`。
 * - 未设置 `NEXT_PUBLIC_BASE_PATH` 时：在 Vercel 构建（`VERCEL`）下用 `""`，否则用 `/pureairweb`。
 * - 可通过环境变量覆盖任意部署目标。
 */
function resolveBasePath() {
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  return process.env.VERCEL ? "" : "/pureairweb";
}

const basePath = resolveBasePath();

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  ...(basePath ? { assetPrefix: basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("@napi-rs/canvas");
      }
    }
    return config;
  },
};

export default nextConfig;
