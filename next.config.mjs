/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node:sqlite is newer than webpack's builtin-module list — leave it to Node.
      config.externals.push({ 'node:sqlite': 'commonjs node:sqlite' });
    }
    return config;
  },
};

export default nextConfig;
