import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // officeparser exposes a browser ESM build through its package exports.
  agentRules: false,
};

export default nextConfig;
