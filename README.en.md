# Universal Quantum & Atomic Visualisation System

<div align="center">

[![Language: English](https://img.shields.io/badge/Language-English-blue.svg)](#)
[![Nyelv: Magyar](https://img.shields.io/badge/Nyelv-Magyar-brightgreen.svg)](README.md)
[![Build & Deploy](https://github.com/LowCoders/atom-visualisation/actions/workflows/deploy.yml/badge.svg)](https://github.com/LowCoders/atom-visualisation/actions/workflows/deploy.yml)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg)](https://vitejs.dev/)

**Interactive 3D WebGL simulation: electron orbitals, scattering dynamics, nucleon and quark interior geometry, and spacetime vacuum curvature.**

[🌐 Online Documentation](https://lowcoders.github.io/atom-visualisation/en/) · [⚛️ 3D Simulator](https://lowcoders.github.io/atom-visualisation/app/) · [📖 User Guide](docs/en/guide.md) · [📐 Theoretical Hub](docs/en/physics.md) · [🛠️ Installation](docs/en/installation.md)

<br/>

> **⚠️ Important Scientific & Methodological Disclaimer:**  
> This project is solely a **thought-provoking, schematic visualization** serving as the preliminary first step for preparing a more advanced project.  
> **Neither the descriptions presented here nor the animation can be considered a correct, physically accepted model.**  
> The visualizations and related texts are thought experiments and didactic tools; they do not represent an experimentally validated or canonical scientific theory.

<br/>

![3D Perspective Total View - Einstein-Rosen Bridge and Janus Sector](docs/images/total-3d-perspective.png)

*3D Perspective Total View: Matter nucleus, electron orbitals, sagging spacetime vacuum sheet, Einstein–Rosen wormhole bridge, and the Janus antimatter mirror vacuum dome.*

</div>

---

## 📌 Project Overview

The **Universal Quantum Visualisation System** is a high-performance in-browser 3D simulation built with Three.js and Vite. It establishes a rigorous, unified bridge connecting atomic quantum mechanics (Schrödinger equations, orbital clouds), subatomic particle physics (nucleons, quarks, SU(3) color confinement), General Relativistic spacetime curvature (δg<sub>00</sub>), and modern 5D Deák spacetime scale-covariance.

### Core Features:

1. **Multi-Scale Embedded Hierarchy:** Smooth transition from the scattering continuum (10⁻⁸ m) down through atomic orbitals (10⁻¹⁰ m), nucleon interior (10⁻¹⁵ m), and quark Kerr throat to the Planck scale (ℓ<sub>P</sub> ∼ 10⁻³⁵ m).
2. **Janus Antimatter Sector (r &lt; 0):** Analytical metric continuation featuring ruby-red antiprotons, counter-rotating positrons, and upward repulsive vacuum curvature.
3. **6-Phase Dynamic Process Simulator:** Real-time simulation of inelastic electron scattering (15.0 eV → 4.8 eV), virtual photon exchange, 1s → 2p<sub>z</sub> quantum jump, nuclear recoil, deep phase dissipation, and spontaneous on-shell Lyman-α photon emission (121.57 nm).
4. **Dynamic Spacetime Vacuum Sheet:** Real-time sagging (δg<sub>00</sub>) adhering to mass-energy equivalence (M\* = M₀ + 10.2 eV/c²) and light-speed gravitational wave propagation (r = ct).
5. **Bidirectional Periodic Table Integration:** Elements Z = 1..36 with automated valence orbital and isotopic mass mapping.

---

## 🧭 Documentation Portal

- 🛠️ **[Installation & Operations Guide](docs/en/installation.md)** (Hungarian: [installation.md](docs/hu/installation.md))
- 📖 **[User Guide & Manual](docs/en/guide.md)** (Hungarian: [guide.md](docs/hu/guide.md))
- ⚛️ **[Unified Model](docs/en/unified.md)** (Hungarian: [unified.md](docs/hu/unified.md))
- 📐 **[Theoretical & Mathematical Model Hub](docs/en/physics.md)** (Hungarian Hub: [physics.md](docs/hu/physics.md))
  - 📖 [01. Quantum Mechanics, Orbitals & Stability](docs/hu/physics/01-kvantum-es-atom.md)
  - 📖 [02. Scattering Continuum, QED & Lyman-α](docs/hu/physics/02-szoras-es-qed.md)
  - 📖 [03. Nucleon Interior, Nuclear Forces & DIS](docs/hu/physics/03-nukleon-es-parton.md)
  - 📖 [04. Gravitation, Spacetime & Vacuum Dynamics](docs/hu/physics/04-gravitacio-es-vakuum.md)
  - 📖 [05. Deák Spacetime & Unified Field-Gravity](docs/hu/physics/05-deak-ter-es-egyseges-elmelet.md) *(ported from pedia repo!)*
  - 📖 [06. Higher Dimensions, Branes & Extreme Fields](docs/hu/physics/06-topologia-es-kulonleges-jelensegek.md)

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build

# Run preview server
npm run preview
```

Run automated deployment script:

```bash
./scripts/deploy.sh --build-only
```
