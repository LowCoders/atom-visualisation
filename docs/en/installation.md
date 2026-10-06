# Installation & Deployment Guide

<div class="disclaimer-box">
  <h4>⚠️ Important Scientific & Methodological Disclaimer</h4>
  <p>
    This project is solely a <strong>thought-provoking, schematic visualization</strong> serving as the preliminary first step for preparing a more advanced project.<br/>
    <strong>Neither the descriptions presented here nor the animation can be considered a correct, physically accepted model.</strong><br/>
    The visualizations and related theoretical descriptions are thought experiments and didactic tools; they do not represent an experimentally validated or canonical scientific theory.
  </p>
</div>

This document details the installation, local execution, containerization, and continuous integration/deployment (CI/CD) procedures for the **Universal Modular Quantum & Atomic Visualisation System**.

---

## 1. System Requirements

### A) Development & Build Environment
- **Operating System:** Linux (Ubuntu 20.04+, Debian 11+, RHEL/CentOS 8+), macOS (12+), or Windows 10/11 (WSL2 recommended).
- **Node.js:** Version $\ge$ `18.0.0` (LTS 20.x recommended). Check: `node -v`
- **Package Manager:** `npm` $\ge$ `9.0.0`. Check: `npm -v`
- **Git:** Version $\ge$ `2.30.0`.

### B) Client Browser Requirements
- **WebGL 2.0 Support:** Any standard modern browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+).
- **Hardware Acceleration:** Discrete or integrated GPU recommended for 60 FPS Three.js rendering.
- **ES Modules (ESM):** Native support for modern JavaScript module loading.

---

## 2. Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/LowCoders/atom-visualisation.git
cd atom-visualisation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local Development Server
Powered by [Vite](https://vitejs.dev/) with instantaneous Hot Module Replacement (HMR):
```bash
npm run dev
```
Navigate to `http://localhost:3000` (or the URL printed in the terminal).

---

## 3. Production Build

Generate optimized, minified production assets into the `dist/` directory:
```bash
npm run build
```

Verify build output locally using the built-in preview server:
```bash
npm run preview
```

---

## 4. Automated Deployment Script (`scripts/deploy.sh`)

An automated bash deployment script is located in `scripts/deploy.sh`:

```bash
# Build production bundle only
./scripts/deploy.sh --build-only

# Build and start local preview
./scripts/deploy.sh --preview

# Copy dist files to a local web server directory
sudo ./scripts/deploy.sh --dest /var/www/html/visualisation

# Deploy to GitHub Pages (gh-pages git branch)
./scripts/deploy.sh --gh-pages
```

---

## 5. Web Server Configuration

### Nginx SPA Configuration
```nginx
server {
    listen 80;
    server_name quantum.example.com;

    root /var/www/html/visualisation;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Containerization
```bash
docker build -t quantum-visualisation:latest .
docker run -d -p 8080:80 --name quantum-app quantum-visualisation:latest
```

---

## 6. Continuous Integration & Deployment (CI/CD)

The repository includes a GitHub Actions workflow in [`.github/workflows/deploy.yml`](https://github.com/LowCoders/atom-visualisation/blob/main/.github/workflows/deploy.yml):
- **Triggers:** Push to `main`, Pull Requests, and manual dispatch.
- **Build Step:** Installs dependencies via `npm ci` and `pip install -r requirements.txt`, then builds the unified site bundle via `npm run build`.
- **Deployment:** Automatically uploads artifacts and deploys to GitHub Pages upon push to `main`.

---

## Navigation & Related Docs

- 🚀 [Documentation Home](index.md)
- 📖 [User Guide](guide.md)
- 📐 [Theoretical Model Hub](physics.md)
- ⚛️ [Unified Model](unified.md)
