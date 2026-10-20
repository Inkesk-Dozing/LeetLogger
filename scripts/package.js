import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'manifest.json'))) {
  console.log('[LeetLogger Packager] dist/ missing or incomplete. Building production assets...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

const outDir = path.join(rootDir, 'release');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const zipPath = path.join(outDir, `${pkg.name}-v${pkg.version}.zip`);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`[LeetLogger Packager] Zipping extension bundle to ${zipPath}...`);
execSync(`python -m zipfile -c "${zipPath}" dist`, { cwd: rootDir, stdio: 'inherit' });

const stats = fs.statSync(zipPath);
console.log(`[LeetLogger Packager] Successfully generated release package: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`[LeetLogger Packager] Artifact path: ${zipPath}`);
