/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: "https://promptloop-api.onrender.com",
  },
};

module.exports = nextConfig;
