#!/usr/bin/env node
/**
 * assemble-site.mjs
 * Builds the complete GitHub Pages distribution for Quantum Visualisation 3D:
 *  1. Builds the searchable bilingual MkDocs Material documentation into site/
 *  2. Builds the 3D WebGL application bundle into site/app/
 *  3. Validates output artifacts
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const log = (msg) => console.log(`\x1b[36m[assemble-site]\x1b[0m ${msg}`);
const logSuccess = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const logError = (msg) => console.error(`\x1b[31m✗\x1b[0m ${msg}`);

function runCommand(command, description) {
  log(`Executing: ${description}...`);
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env
    });
    logSuccess(`${description} finished successfully.`);
  } catch (error) {
    logError(`Command failed: ${command}`);
    throw error;
  }
}

function resolveMkdocsCommand() {
  const candidates = [
    'mkdocs',
    '/home/user/.local/bin/mkdocs',
    'python3 -m mkdocs',
    'python -m mkdocs'
  ];

  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' });
      return cmd;
    } catch {
      // try next candidate
    }
  }
  throw new Error('mkdocs executable could not be found in PATH or standard python environments.');
}

async function main() {
  console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[34m⚛️ Quantum Visualisation 3D - Site Assembly Pipeline\x1b[0m');
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m\n');

  // Step 1: Build Documentation (MkDocs Material)
  const mkdocsCmd = resolveMkdocsCommand();
  runCommand(`${mkdocsCmd} build --strict`, 'Build MkDocs Documentation');

  const siteDir = path.join(ROOT_DIR, 'site');
  if (!fs.existsSync(siteDir) || !fs.existsSync(path.join(siteDir, 'index.html'))) {
    throw new Error('MkDocs build completed without generating site/index.html');
  }
  logSuccess(`Documentation generated in ${path.relative(ROOT_DIR, siteDir)}`);

  // Step 2: Build 3D Application Bundle into temporary dist-app
  const distAppDir = path.join(ROOT_DIR, 'dist-app');
  if (fs.existsSync(distAppDir)) {
    fs.rmSync(distAppDir, { recursive: true, force: true });
  }

  runCommand('npx vite build --outDir dist-app --base ./', 'Build 3D WebGL Application');

  if (!fs.existsSync(distAppDir) || !fs.existsSync(path.join(distAppDir, 'index.html'))) {
    throw new Error('Vite build completed without generating dist-app/index.html');
  }

  // Step 3: Integrate Application into site/app/
  const targetAppDir = path.join(siteDir, 'app');
  if (fs.existsSync(targetAppDir)) {
    fs.rmSync(targetAppDir, { recursive: true, force: true });
  }

  log(`Copying 3D application into ${path.relative(ROOT_DIR, targetAppDir)}...`);
  fs.cpSync(distAppDir, targetAppDir, { recursive: true });
  fs.rmSync(distAppDir, { recursive: true, force: true });
  logSuccess(`3D application successfully placed at site/app/`);

  // Step 4: Verify Critical Artifacts
  const expectedArtifacts = [
    'site/index.html',
    'site/hu/index.html',
    'site/en/index.html',
    'site/physics/index.html',
    'site/en/physics/index.html',
    'site/guide/index.html',
    'site/en/guide/index.html',
    'site/unified/index.html',
    'site/en/unified/index.html',
    'site/installation/index.html',
    'site/en/installation/index.html',
    'site/app/index.html',
    'site/search/search_index.json'
  ];

  let missing = 0;
  for (const relPath of expectedArtifacts) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      logError(`Missing expected file: ${relPath}`);
      missing++;
    }
  }

  if (missing > 0) {
    throw new Error(`Assembly verification failed: ${missing} required artifacts are missing.`);
  }

  console.log('\n\x1b[32m\x1b[1m✓ Site assembly successfully finished!\x1b[0m');
  console.log('Site root: site/');
  console.log('  - Hungarian Docs: site/ (index.html) and site/hu/ (index.html)');
  console.log('  - English Docs:   site/en/ (index.html)');
  console.log('  - 3D App:         site/app/ (index.html)\n');
}

main().catch((err) => {
  logError(`Build assembly failed: ${err.message}`);
  process.exit(1);
});
