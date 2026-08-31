import { createRequire } from "module";
import path from "path";
import type { NextConfig } from "next";

// Resolve the real on-disk path of tailwindcss using Node's native module
// resolution anchored to this file's location.  This follows pnpm's virtual-
// store symlinks and returns the actual package directory, bypassing any CWD-
// based resolution that Turbopack's enhanced-resolve may use (which can point
// to a parent pnpm workspace root instead of the project root).
const configRequire = createRequire(import.meta.url);

function resolveTailwindcssPackagePath(): string {
  try {
    // configRequire follows pnpm symlinks from next.config.ts's own location.
    return path.dirname(configRequire.resolve("tailwindcss/package.json"));
  } catch {
    // Fallback: use the directory where pnpm was invoked (set by pnpm as
    // INIT_CWD) or the nearest package root (npm_config_local_prefix).
    const root = process.env.INIT_CWD ?? process.env.npm_config_local_prefix ?? process.cwd();
    return path.join(root, "node_modules", "tailwindcss");
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1:*", "*.trycloudflare.com"],
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@base-ui/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1"],
  turbopack: {
    resolveAlias: {
      // Absolute alias so Turbopack's CSS @import resolver finds tailwindcss
      // regardless of which directory enhanced-resolve uses as its context.
      tailwindcss: resolveTailwindcssPackagePath(),
    },
  },
};

export default nextConfig;
