import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envVars = {};
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          envVars[key] = val;
        }
      }
    }
  }
  return envVars;
}

const loadedEnv = loadEnv();
const githubClientId = process.env.LEETLOGGER_CLIENT_ID || process.env.GITHUB_CLIENT_ID || loadedEnv.LEETLOGGER_CLIENT_ID || loadedEnv.GITHUB_CLIENT_ID || '0114dd35b156d4729fac';
const githubClientSecret = process.env.LEETLOGGER_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || loadedEnv.LEETLOGGER_CLIENT_SECRET || loadedEnv.GITHUB_CLIENT_SECRET || 'cfc3301d9745530bf1b31e92528ad9c31fd3f995';

export default {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map',
  entry: {
    background: './src/background/serviceWorker.ts',
    leetcodeContent: './src/content/leetcodeContent.ts',
    gfgContent: './src/content/gfgContent.ts',
    githubAuthorize: './src/content/githubAuthorize.ts',
    popup: './src/ui/popup/index.tsx',
    welcome: './src/ui/welcome/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@platform': path.resolve(__dirname, 'src/platform'),
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({}),
      'process.env.LEETLOGGER_CLIENT_ID': JSON.stringify(githubClientId),
      'process.env.LEETLOGGER_CLIENT_SECRET': JSON.stringify(githubClientSecret),
      'process.env.GITHUB_CLIENT_ID': JSON.stringify(githubClientId),
      'process.env.GITHUB_CLIENT_SECRET': JSON.stringify(githubClientSecret),
      '__CLIENT_ID__': JSON.stringify(githubClientId),
      '__CLIENT_SECRET__': JSON.stringify(githubClientSecret),
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/ui/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './src/ui/welcome/welcome.html',
      filename: 'welcome.html',
      chunks: ['welcome'],
    }),
  ],
  performance: {
    hints: false,
  },
};
