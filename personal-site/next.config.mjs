/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  distDir: isProduction ? ".next" : ".next-dev",
  ...(isProduction && { output: "export" }),
};

export default nextConfig;
