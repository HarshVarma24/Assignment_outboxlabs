/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repositoryName = '/Assignment_outboxlabs';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isProd ? repositoryName : '',
  assetPrefix: isProd ? `${repositoryName}/` : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
