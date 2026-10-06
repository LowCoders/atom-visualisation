/**
 * QuantumPhysics: Quantum mechanical calculations, Aufbau electron configurations,
 * radial wavefunctions, spherical harmonics, and Bessel drum modes.
 */

import { SUBSHELL_ORDER, ORBITAL_NAMES, ELEMENTS, getElement } from '../data/elements.js';

export { SUBSHELL_ORDER, ORBITAL_NAMES, ELEMENTS, getElement };

export const BOHR_RADIUS = 0.529177; // in Angstroms (Å)
export const RYDBERG_EV = 13.6057;   // eV
export const HC_EV_NM = 1239.841984; // Planck constant * c in eV*nm (photon: lambda = HC/E)

/**
 * Calculates electron configuration list according to the Aufbau principle.
 * Distributes Z electrons into individual orbitals with quantum numbers (n, l, ml, ms).
 * @param {number} Z - Atomic number (number of electrons)
 * @returns {Array<Object>} List of electrons with their quantum state
 */
export function buildElectronConfiguration(Z) {
  let remaining = Z;
  const electrons = [];
  const subshells = [];

  for (const sub of SUBSHELL_ORDER) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, sub.capacity);
    remaining -= count;

    subshells.push({
      ...sub,
      count
    });

    // Populate quantum states (Hund's rule: fill positive spin first)
    const orbitalCount = 2 * sub.l + 1; // number of ml states: -l .. +l
    const mlList = [];
    for (let m = -sub.l; m <= sub.l; m++) {
      mlList.push(m);
    }

    // First pass: ms = +1/2
    for (let i = 0; i < Math.min(count, orbitalCount); i++) {
      electrons.push({
        n: sub.n,
        l: sub.l,
        ml: mlList[i],
        ms: +0.5,
        subshell: sub.label,
        subshellIndex: subshells.length - 1,
        electronIndex: electrons.length
      });
    }

    // Second pass: ms = -1/2 (pairing up)
    if (count > orbitalCount) {
      for (let i = 0; i < count - orbitalCount; i++) {
        electrons.push({
          n: sub.n,
          l: sub.l,
          ml: mlList[i],
          ms: -0.5,
          subshell: sub.label,
          subshellIndex: subshells.length - 1,
          electronIndex: electrons.length
        });
      }
    }
  }

  return {
    electrons,
    subshells,
    notation: formatConfigurationNotation(subshells)
  };
}

/**
 * Formats subshells into standard spectroscopic notation (e.g. 1s² 2s² 2p⁴)
 */
export function formatConfigurationNotation(subshells) {
  const superDigits = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return subshells.map(s => {
    const sup = String(s.count).split('').map(d => superDigits[d] || d).join('');
    return `${s.label}${sup}`;
  }).join(' ');
}

/**
 * Factorial helper
 */
export function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Generalized Laguerre Polynomial L_k^\alpha(x)
 */
export function laguerre(k, alpha, x) {
  if (k === 0) return 1.0;
  if (k === 1) return 1.0 + alpha - x;

  let Lprev2 = 1.0;
  let Lprev1 = 1.0 + alpha - x;
  let Lcurr = 0;

  for (let i = 2; i <= k; i++) {
    Lcurr = ((2 * i - 1 + alpha - x) * Lprev1 - (i - 1 + alpha) * Lprev2) / i;
    Lprev2 = Lprev1;
    Lprev1 = Lcurr;
  }
  return Lcurr;
}

/**
 * Associated Legendre Polynomial P_l^m(x)
 */
export function legendre(l, m, x) {
  m = Math.abs(m);
  if (m > l) return 0.0;

  // Compute P_m^m(x)
  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1.0 - x) * (1.0 + x)));
    let fact = 1.0;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }

  if (l === m) return pmm;

  // Compute P_{m+1}^m(x)
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;

  // Recurse up to P_l^m(x)
  let pll = 0.0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/**
 * Normalized Radial Wavefunction R_{nl}(r) for hydrogenic atoms
 * @param {number} n - Principal quantum number >= 1
 * @param {number} l - Orbital quantum number 0 <= l < n
 * @param {number} r - Distance from nucleus in Bohr radii (a0 = 1 units)
 * @param {number} [Z=1] - Effective nuclear charge
 */
export function radialWavefunction(n, l, r, Z = 1) {
  const rho = (2.0 * Z * r) / n;
  const k = n - l - 1;
  const alpha = 2 * l + 1;

  // Normalization factor
  // N = sqrt( (2Z/n)^3 * (n-l-1)! / (2n * ((n+l)!)^3) )
  const num = factorial(k);
  const den = 2 * n * Math.pow(factorial(n + l), 3);
  const norm = Math.sqrt(Math.pow((2 * Z) / n, 3) * (num / den));

  const lagVal = laguerre(k, alpha, rho);
  return norm * Math.exp(-rho / 2.0) * Math.pow(rho, l) * lagVal;
}

/**
 * Evaluates real spherical harmonics Y_{lm}(theta, phi) for shape rendering
 * @param {number} l - Angular momentum
 * @param {number} m - Magnetic quantum number (-l .. +l)
 * @param {number} theta - Polar angle [0 .. PI]
 * @param {number} phi - Azimuthal angle [0 .. 2PI]
 */
export function realSphericalHarmonic(l, m, theta, phi) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // s-orbital (l = 0)
  if (l === 0) {
    return 0.5 * Math.SQRT1_2 * Math.SQRT2; // 1 / sqrt(4 * PI)
  }

  // p-orbitals (l = 1)
  if (l === 1) {
    if (m === 0) {
      // p_z = sqrt(3 / 4PI) * cos(theta)
      return Math.sqrt(3 / (4 * Math.PI)) * cosT;
    } else if (m === 1) {
      // p_x = sqrt(3 / 4PI) * sin(theta) * cos(phi)
      return Math.sqrt(3 / (4 * Math.PI)) * sinT * Math.cos(phi);
    } else if (m === -1) {
      // p_y = sqrt(3 / 4PI) * sin(theta) * sin(phi)
      return Math.sqrt(3 / (4 * Math.PI)) * sinT * Math.sin(phi);
    }
  }

  // d-orbitals (l = 2)
  if (l === 2) {
    if (m === 0) {
      // d_z2 = sqrt(5 / 16PI) * (3 * cos^2(theta) - 1)
      return Math.sqrt(5 / (16 * Math.PI)) * (3 * cosT * cosT - 1);
    } else if (m === 1) {
      // d_xz = sqrt(15 / 4PI) * sin(theta) * cos(theta) * cos(phi)
      return Math.sqrt(15 / (4 * Math.PI)) * sinT * cosT * Math.cos(phi);
    } else if (m === -1) {
      // d_yz = sqrt(15 / 4PI) * sin(theta) * cos(theta) * sin(phi)
      return Math.sqrt(15 / (4 * Math.PI)) * sinT * cosT * Math.sin(phi);
    } else if (m === 2) {
      // d_x2-y2 = sqrt(15 / 16PI) * sin^2(theta) * cos(2*phi)
      return Math.sqrt(15 / (16 * Math.PI)) * sinT * sinT * Math.cos(2 * phi);
    } else if (m === -2) {
      // d_xy = sqrt(15 / 16PI) * sin^2(theta) * sin(2*phi)
      return Math.sqrt(15 / (16 * Math.PI)) * sinT * sinT * Math.sin(2 * phi);
    }
  }

  // f-orbitals (l = 3, canonical shapes)
  if (l === 3) {
    if (m === 0) {
      // f_z3
      return Math.sqrt(7 / (16 * Math.PI)) * (5 * Math.pow(cosT, 3) - 3 * cosT);
    } else if (Math.abs(m) === 1) {
      const factor = Math.sqrt(21 / (32 * Math.PI)) * sinT * (5 * cosT * cosT - 1);
      return m > 0 ? factor * Math.cos(phi) : factor * Math.sin(phi);
    } else if (Math.abs(m) === 2) {
      const factor = Math.sqrt(105 / (16 * Math.PI)) * sinT * sinT * cosT;
      return m > 0 ? factor * Math.cos(2 * phi) : factor * Math.sin(2 * phi);
    } else {
      const factor = Math.sqrt(35 / (32 * Math.PI)) * Math.pow(sinT, 3);
      return m > 0 ? factor * Math.cos(3 * phi) : factor * Math.sin(3 * phi);
    }
  }

  return 0.0;
}

/**
 * Complex spherical harmonic magnitude and phase angle: Y_{lm}(theta, phi) e^{i m phi - i omega t}
 * @returns {{ magnitude: number, phase: number }}
 */
export function complexSphericalHarmonic(l, m, theta, phi, phaseOffset = 0) {
  const cosT = Math.cos(theta);
  const leg = legendre(l, m, cosT);
  const factor = Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * (factorial(l - Math.abs(m)) / factorial(l + Math.abs(m))));
  const magnitude = Math.abs(factor * leg);
  const phase = (m * phi - phaseOffset) % (Math.PI * 2);
  return { magnitude, phase };
}

/**
 * Zero-order Bessel function J_0(x) for circular drum mode calculations
 */
export function besselJ0(x) {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    const y = (x / 3.75) * (x / 3.75);
    return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492 + y * (0.2659732 + y * (0.360768e-1 + y * 0.45813e-2)))));
  } else {
    const y = 3.75 / ax;
    const f0 = 0.79788456 + y * (-0.00000077 + y * (-0.00552740 + y * (0.00009512 + y * (0.00137237 + y * (-0.00072805 + y * 0.00014476)))));
    const theta0 = ax - 0.78539816 + y * (-0.04166397 + y * (-0.00003954 + y * (0.00262573 + y * (-0.00054125 + y * (-0.00029333 + y * 0.00013558)))));
    return (1.0 / Math.sqrt(ax)) * f0 * Math.cos(theta0);
  }
}

// Zeros of J_0(x) for n-th harmonic node
export const BESSEL_J0_ZEROS = [2.4048255577, 5.5200781103, 8.6537279129, 11.791534439, 14.930917708];

/**
 * First-order Bessel function J_1(x) for p-type and m=1 drum modes
 */
export function besselJ1(x) {
  const ax = Math.abs(x);
  if (ax < 1e-12) return 0.0;
  if (ax < 3.75) {
    const y = (x / 3.75) * (x / 3.75);
    const ans = x * (0.5 + y * (-0.56249985 + y * (0.21093573 + y * (-0.03954289 + y * (0.00443319 + y * (-0.00031761 + y * 0.00001109))))));
    return ans;
  } else {
    const y = 3.75 / ax;
    const f1 = 0.79788456 + y * (0.00000156 + y * (0.01659667 + y * (0.00017105 + y * (-0.00249511 + y * (0.00113653 - y * 0.00020033)))));
    const theta1 = ax - 2.35619449 + y * (0.04166392 + y * (-0.00003954 + y * (-0.00262573 + y * (-0.00054125 + y * (-0.00029333 + y * 0.00013558)))));
    const ans = (1.0 / Math.sqrt(ax)) * f1 * Math.cos(theta1);
    return x < 0 ? -ans : ans;
  }
}

export const BESSEL_J1_ZEROS = [3.8317059702, 7.0155866698, 10.173468135, 13.323691936, 16.470630050];

/**
 * Second-order Bessel function J_2(x) = (2/x)*J_1(x) - J_0(x) for d-type / m=2 drum modes
 */
export function besselJ2(x) {
  const ax = Math.abs(x);
  if (ax < 1e-6) return 0.0;
  return (2.0 / x) * besselJ1(x) - besselJ0(x);
}

export const BESSEL_J2_ZEROS = [5.1356223018, 8.4172441404, 11.619841172, 14.795951782, 17.959819495];

/**
 * Calculates nodal surfaces for quantum state (n, l, m)
 */
export function getNodalStructure(n, l) {
  const radialNodes = n - l - 1;
  const angularNodes = l;
  const totalNodes = n - 1;
  return {
    radialNodes,
    angularNodes,
    totalNodes
  };
}

/**
 * Calculates radial shell structure, radial nodes (zeros of R_{nl}),
 * and peak positions of |R_{nl}(r)| for quantum numbers (n, l).
 * For example: n=4, l=2 -> 1 radial node at r = 12 a0, dividing the orbital
 * into an inner shell (core lobe, 0 < r < 12) and an outer shell (tilted horned lobes, r > 12).
 * @param {number} n
 * @param {number} l
 * @param {number} [Z=1]
 * @returns {{ radialNodes: number[], shells: Array<{ index: number, rMin: number, rMax: number, rPeak: number, sign: number, isInner: boolean }>, hasSubshells: boolean }}
 */
export function getRadialShellInfo(n, l, Z = 1) {
  const k = Math.max(0, n - l - 1);
  const alpha = 2 * l + 1;
  const radialNodes = [];

  if (k > 0) {
    // Find roots of L_k^\alpha(rho) in range rho in (0, 4.5 * n)
    // using root bracketing and bisection
    const steps = 300;
    const maxRho = Math.max(30, 4.5 * n);
    const dRho = maxRho / steps;
    let prevVal = laguerre(k, alpha, 0.0001);

    for (let i = 1; i <= steps && radialNodes.length < k; i++) {
      const rho = i * dRho;
      const val = laguerre(k, alpha, rho);
      if (prevVal * val <= 0) {
        // Bisection refinement
        let rA = (i - 1) * dRho;
        let rB = rho;
        for (let it = 0; it < 24; it++) {
          const mid = 0.5 * (rA + rB);
          const vMid = laguerre(k, alpha, mid);
          if (prevVal * vMid <= 0) {
            rB = mid;
          } else {
            rA = mid;
          }
        }
        const rootRho = 0.5 * (rA + rB);
        const rNode = (n * rootRho) / (2.0 * Z);
        radialNodes.push(rNode);
      }
      prevVal = val;
    }
  }

  // Build shell boundaries
  const boundaries = [0, ...radialNodes, Math.max(25, (6.0 * n) / Z)];
  const shells = [];

  for (let s = 0; s < boundaries.length - 1; s++) {
    const rMin = boundaries[s];
    const rMax = boundaries[s + 1];

    // Find peak radius within [rMin, rMax]
    let peakR = rMin + 0.5 * (rMax - rMin);
    let maxVal = -1;
    const searchSteps = 60;
    const dr = (rMax - rMin) / searchSteps;
    for (let step = 1; step < searchSteps; step++) {
      const testR = rMin + step * dr;
      const absRnl = Math.abs(radialWavefunction(n, l, testR, Z));
      if (absRnl > maxVal) {
        maxVal = absRnl;
        peakR = testR;
      }
    }

    const testMid = rMin + 0.5 * (rMax - rMin);
    const rawRnl = radialWavefunction(n, l, testMid, Z);
    const sign = rawRnl >= 0 ? 1 : -1;

    shells.push({
      index: s,
      rMin,
      rMax,
      rPeak: peakR,
      sign,
      isInner: s < boundaries.length - 2
    });
  }

  return {
    radialNodes,
    shells,
    hasSubshells: radialNodes.length > 0
  };
}

/**
 * Calculates the geometry and positions of probability current vortex rings
 * j_phi = (hbar * m / (m_e * r * sin(theta))) * |psi|^2.
 * Appears as bright, floating current rings when m != 0 (e.g. in psi_{4,2,1}).
 * @param {number} n
 * @param {number} l
 * @param {number} m
 * @param {number} [scale=4.2] - Visual geometry scale
 * @returns {Array<{ y: number, radius: number, speed: number, direction: number, hue: number }>}
 */
export function getOrbitalCurrentRings(n, l, m, scale = 4.2) {
  if (m === 0 || l === 0) return [];

  // For azimuthal magnetic quantum numbers m != 0,
  // find polar angle theta where current density j_phi is maximal.
  // j_phi ~ (m / sin(theta)) * |Theta_{lm}(theta)|^2
  let maxCurrent = 0;
  let bestTheta = Math.PI / 4;
  const numSteps = 100;
  for (let i = 1; i < numSteps; i++) {
    const theta = (i / numSteps) * (Math.PI / 2); // Search upper quadrant
    const sinT = Math.sin(theta);
    if (sinT < 1e-4) continue;
    const cosT = Math.cos(theta);
    const leg = legendre(l, Math.abs(m), cosT);
    const jVal = (Math.abs(m) / sinT) * (leg * leg * Math.pow(sinT, 2 * Math.abs(m)));
    if (jVal > maxCurrent) {
      maxCurrent = jVal;
      bestTheta = theta;
    }
  }

  const sinBest = Math.sin(bestTheta);
  const cosBest = Math.cos(bestTheta);

  // Geometric radius and height scaled to orbital shape
  const ringRadius = scale * 0.58 * sinBest * Math.sqrt(Math.max(1, n / 2));
  const ringY = scale * 0.65 * cosBest * Math.sqrt(Math.max(1, n / 2));
  const direction = m > 0 ? 1 : -1;
  const speed = 1.8 * Math.abs(m);

  return [
    {
      y: ringY,
      radius: ringRadius,
      speed,
      direction,
      hue: 0.12 // Amber/warm gold (upper ring in psi_{421})
    },
    {
      y: -ringY,
      radius: ringRadius,
      speed: -speed,
      direction: -direction,
      hue: 0.58 // Cyan/blue (lower ring in psi_{421})
    }
  ];
}

/**
 * Calculates expectation value <r> and orbital energy
 */
export function getOrbitalPhysicals(n, l, Z = 1) {
  // <r> = (a0 / 2Z) * [3n^2 - l(l+1)]
  const meanRadius = (BOHR_RADIUS / (2 * Z)) * (3 * n * n - l * (l + 1));
  const energy = -RYDBERG_EV * ((Z * Z) / (n * n));
  return {
    meanRadiusAngstrom: meanRadius,
    meanRadiusPm: meanRadius * 100,
    energyEV: energy
  };
}

/**
 * Image 1 ("Hydrogen Wave Function") color gradient palette.
 * Maps normalized probability density [0..1] to deep purple -> magenta -> orange -> yellow -> white hot.
 * @param {number} t - Normalized density in [0..1]
 * @param {THREE.Color} [outColor] - Optional target color object to prevent allocations
 * @returns {{ r: number, g: number, b: number }}
 */
export function getWavefunctionColorRGB(t) {
  t = Math.max(0.0, Math.min(1.0, t));

  // Color stops matching Image 1:
  // 0.00: [0.03, 0.01, 0.08] (deep space purple / near black)
  // 0.18: [0.32, 0.04, 0.38] (rich violet)
  // 0.42: [0.72, 0.12, 0.42] (glowing magenta)
  // 0.68: [0.98, 0.42, 0.08] (hot burning orange)
  // 0.88: [1.00, 0.82, 0.22] (warm electric yellow-gold)
  // 1.00: [1.00, 1.00, 1.00] (blinding white core)
  let r, g, b;

  if (t < 0.18) {
    const f = t / 0.18;
    r = 0.03 + f * (0.32 - 0.03);
    g = 0.01 + f * (0.04 - 0.01);
    b = 0.08 + f * (0.38 - 0.08);
  } else if (t < 0.42) {
    const f = (t - 0.18) / 0.24;
    r = 0.32 + f * (0.72 - 0.32);
    g = 0.04 + f * (0.12 - 0.04);
    b = 0.38 + f * (0.42 - 0.38);
  } else if (t < 0.68) {
    const f = (t - 0.42) / 0.26;
    r = 0.72 + f * (0.98 - 0.72);
    g = 0.12 + f * (0.42 - 0.12);
    b = 0.42 * (1.0 - f) + 0.06 * f;
  } else if (t < 0.88) {
    const f = (t - 0.68) / 0.20;
    r = 0.98 + f * (1.00 - 0.98);
    g = 0.42 + f * (0.72 - 0.42);
    b = 0.06 * (1.0 - f) + 0.02 * f;
  } else {
    const f = (t - 0.88) / 0.12;
    r = 1.00;
    g = 0.72 + f * (0.86 - 0.72);
    b = 0.02 * (1.0 - f);
  }

  return { r, g, b };
}

/**
 * Full 3D evaluation of Hydrogen wave function psi_{nlm}(x, y, z) and probability density |psi|^2.
 * @param {number} n - Principal quantum number (1..4)
 * @param {number} l - Angular momentum (0..n-1)
 * @param {number} m - Magnetic quantum number (-l..+l)
 * @param {number} x - Coordinate in Bohr radii a0
 * @param {number} y - Coordinate in Bohr radii a0
 * @param {number} z - Coordinate in Bohr radii a0
 * @param {number} [Z=1] - Nuclear charge
 * @param {boolean} [isComplex=false] - Whether to evaluate complex eigenstate
 */
export function evaluateWavefunctionCartesian(n, l, m, x, y, z, Z = 1, isComplex = false) {
  // Spherical coordinate conversion (z is vertical polar axis matching standard physics conventions)
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r < 1e-7) {
    // Center evaluation
    const R0 = radialWavefunction(n, l, 0.001, Z);
    const Y0 = isComplex ? complexSphericalHarmonic(l, m, 0, 0).magnitude : Math.abs(realSphericalHarmonic(l, m, 0, 0));
    const psiVal = R0 * Y0;
    return {
      r: 0,
      theta: 0,
      phi: 0,
      amplitude: psiVal,
      probDensity: psiVal * psiVal
    };
  }

  // Polar angle theta in [0, PI] measured from +Y (or +Z; in Three.js visual space Y is up)
  // Let Y be polar axis (z-convention in physics -> y in 3D Three.js)
  const cosTheta = Math.max(-1.0, Math.min(1.0, y / r));
  const theta = Math.acos(cosTheta);
  const phi = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);

  const Rnl = radialWavefunction(n, l, r, Z);

  let angularVal = 0;
  if (!isComplex) {
    angularVal = realSphericalHarmonic(l, m, theta, phi);
  } else {
    angularVal = complexSphericalHarmonic(l, m, theta, phi).magnitude;
  }

  const psi = Rnl * angularVal;
  const probDensity = psi * psi;

  return {
    r,
    theta,
    phi,
    amplitude: psi,
    probDensity
  };
}

/**
 * Bidirectional Mapping: Get valence orbital for a given chemical element Z
 * @param {number} Z - Atomic number (1..36)
 */
export function getElementValenceOrbital(Z) {
  const config = buildElectronConfiguration(Z);
  const subshells = config.subshells;
  const valence = subshells[subshells.length - 1] || { n: 1, l: 0, label: '1s', count: 1 };
  // Default m chosen to be characteristic (e.g. 0 or 1)
  const m = valence.l === 0 ? 0 : 1;
  return {
    n: valence.n,
    l: valence.l,
    m,
    label: valence.label,
    allSubshells: subshells.map(s => ({ n: s.n, l: s.l, label: s.label, count: s.count }))
  };
}

/**
 * Bidirectional Mapping: Get representative chemical element for given orbital (n, l)
 * @param {number} n
 * @param {number} l
 */
export function getRepresentativeElementForOrbital(n, l) {
  // Mapping based on the Aufbau filling order
  // 1s -> He (2)
  // 2s -> Be (4)
  // 2p -> C (6)
  // 3s -> Mg (12)
  // 3p -> Si (14)
  // 4s -> Ca (20)
  // 3d -> Fe (26)
  // 4p -> Kr (36)
  // fallback for other states
  if (n === 1 && l === 0) return 2;  // Helium
  if (n === 2 && l === 0) return 4;  // Beryllium
  if (n === 2 && l === 1) return 6;  // Carbon
  if (n === 3 && l === 0) return 12; // Magnesium
  if (n === 3 && l === 1) return 14; // Silicon
  if (n === 4 && l === 0) return 20; // Calcium
  if (n === 3 && l === 2) return 26; // Iron
  if (n === 4 && l === 1) return 36; // Krypton
  if (n === 4 && l === 2) return 42; // Molybdenum
  if (n === 4 && l === 3) return 60; // Neodymium (4f)
  if (n === 5 && l === 4) return 126; // Unbihexium (5g)

  // General search through SUBSHELL_ORDER
  let accumZ = 0;
  for (const sub of SUBSHELL_ORDER) {
    accumZ += sub.capacity;
    if (sub.n === n && sub.l === l) {
      return Math.min(ELEMENTS.length, Math.max(1, accumZ - Math.floor(sub.capacity / 2)));
    }
  }

  return 2;
}

/**
 * Determines the Slater screening group key for a subshell.
 * Groups: [1s], [2s2p], [3s3p], [3d], [4s4p], [4d], [4f], [5s5p], ...
 * s and p of the same n share a group; d and f are their own groups.
 * @param {number} n
 * @param {number} l
 * @returns {string}
 */
export function slaterGroupKey(n, l) {
  if (l <= 1) return `${n}sp`;
  return `${n}${ORBITAL_NAMES[l]}`;
}

/**
 * Calculates Slater's-rules effective nuclear charge Z_eff for every occupied subshell.
 * Standard Slater screening constants:
 *  - Same (ns,np) group: 0.35 each (1s: 0.30)
 *  - For an (ns,np) electron: n-1 shell -> 0.85, n-2 and lower -> 1.00
 *  - For an (nd/nf) electron: every electron in a lower group -> 1.00, same group -> 0.35
 * @param {Array<{n:number,l:number,count:number}>} subshells - occupied subshells
 * @returns {Array<{n:number,l:number,label:string,count:number,S:number,Zeff:number}>}
 */
export function calculateSlaterZeff(Z, subshells) {
  // Aggregate electron counts per group and remember principal quantum number
  const groups = {};
  subshells.forEach((s) => {
    const key = slaterGroupKey(s.n, s.l);
    if (!groups[key]) groups[key] = { key, n: s.n, isSP: s.l <= 1, count: 0 };
    groups[key].count += s.count;
  });

  return subshells.map((s) => {
    const selfKey = slaterGroupKey(s.n, s.l);
    const isSP = s.l <= 1;
    let S = 0;

    Object.values(groups).forEach((g) => {
      if (g.key === selfKey) {
        // Same group: all but the electron itself contribute
        const sameGroupOthers = Math.max(0, g.count - 1);
        const perElectron = (s.n === 1 && isSP) ? 0.30 : 0.35;
        S += sameGroupOthers * perElectron;
      } else if (isSP) {
        // Screening felt by an (ns,np) electron
        if (g.n === s.n && g.isSP === false) {
          // Same n but d/f group counts as "inner" contributing fully (rare in Z<=36 ground states)
          S += g.count * 1.00;
        } else if (g.n === s.n - 1) {
          S += g.count * 0.85;
        } else if (g.n < s.n - 1) {
          S += g.count * 1.00;
        } else if (g.n < s.n) {
          S += g.count * 0.85;
        }
        // groups with g.n > s.n (outer) contribute 0
      } else {
        // Screening felt by an (nd,nf) electron: everything in a lower-energy group shields fully
        if (g.n < s.n) {
          S += g.count * 1.00;
        } else if (g.n === s.n && g.isSP) {
          // ns,np of the same n are "inner" to nd -> full shielding
          S += g.count * 1.00;
        }
      }
    });

    const Zeff = Math.max(0.3, Z - S);
    return {
      n: s.n,
      l: s.l,
      label: s.label,
      count: s.count,
      S,
      Zeff
    };
  });
}

/**
 * Maps a photon wavelength (nm) to a display RGB color.
 * Visible band 380-750 nm uses a physically-inspired spectrum; UV -> violet-white, IR -> deep red.
 * @param {number} lambdaNm
 * @returns {{ r:number, g:number, b:number, hex:number, band:string }}
 */
export function wavelengthToRGB(lambdaNm) {
  let r = 0, g = 0, b = 0;
  let band = 'látható';

  if (lambdaNm < 380) {
    // Ultraviolet: render as bright violet-white
    band = 'UV';
    r = 0.62; g = 0.40; b = 1.0;
  } else if (lambdaNm > 750) {
    // Infrared: deep red glow
    band = 'IR';
    r = 0.65; g = 0.05; b = 0.05;
  } else {
    const w = lambdaNm;
    if (w < 440)      { r = -(w - 440) / (440 - 380); g = 0.0; b = 1.0; }
    else if (w < 490) { r = 0.0; g = (w - 440) / (490 - 440); b = 1.0; }
    else if (w < 510) { r = 0.0; g = 1.0; b = -(w - 510) / (510 - 490); }
    else if (w < 580) { r = (w - 510) / (580 - 510); g = 1.0; b = 0.0; }
    else if (w < 645) { r = 1.0; g = -(w - 645) / (645 - 580); b = 0.0; }
    else              { r = 1.0; g = 0.0; b = 0.0; }
    // Intensity falloff near vision limits
    let factor = 1.0;
    if (w < 420)      factor = 0.3 + 0.7 * (w - 380) / (420 - 380);
    else if (w > 700) factor = 0.3 + 0.7 * (750 - w) / (750 - 700);
    r *= factor; g *= factor; b *= factor;
  }

  const clamp = (v) => Math.max(0, Math.min(1, v));
  r = clamp(r); g = clamp(g); b = clamp(b);
  const hex = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  return { r, g, b, hex, band };
}

/**
 * Determines the dipole-allowed excitation channel for a given element.
 * Selects the absorbing electron (default: outermost/valence subshell), the Pauli-allowed
 * target subshell with Delta l = +/-1, the transition energy Delta E, emitted photon wavelength,
 * and the Slater orbital-relaxation shifts on all spectator subshells.
 *
 * @param {number} Z - atomic number (1..126)
 * @param {number} [beamEnergyEV=15.0] - incoming electron kinetic energy (eV)
 * @param {Object} [preferred] - optional { n, l } of the subshell to excite instead of valence
 * @returns {Object} excitation channel description
 */
export function getExcitationChannel(Z, beamEnergyEV = 15.0, preferred = null) {
  Z = Math.max(1, Math.min(ELEMENTS.length, Math.floor(Z)));
  const config = buildElectronConfiguration(Z);
  const subshells = config.subshells;

  // Ground-state Slater Zeff per subshell
  const groundZeff = calculateSlaterZeff(Z, subshells);
  const zeffOf = (list, n, l) => {
    const hit = list.find((s) => s.n === n && s.l === l);
    return hit ? hit.Zeff : Math.max(0.3, Z - 0.35 * (Z - 1));
  };

  // 1. Choose the absorbing electron's source subshell
  let source = null;
  if (preferred) {
    source = subshells.find((s) => s.n === preferred.n && s.l === preferred.l) || null;
  }
  if (!source) {
    // Default: valence subshell = last populated in Aufbau order
    source = subshells[subshells.length - 1] || { n: 1, l: 0, label: '1s', count: 1 };
  }

  const ni = source.n;
  const li = source.l;

  // 2. Choose dipole-allowed target (Delta l = +/-1), Pauli-allowed (not full)
  const isFullInGround = (n, l) => {
    const hit = subshells.find((s) => s.n === n && s.l === l);
    const cap = 2 * (2 * l + 1);
    return hit ? hit.count >= cap : false;
  };

  const candidates = [];
  // Prefer l+1 promotions (typical absorption), then l-1
  [li + 1, li - 1].forEach((lf) => {
    if (lf < 0) return;
    // Lowest principal number that supports this l and is >= source n
    for (let nf = Math.max(ni, lf + 1); nf <= 6; nf++) {
      if (isFullInGround(nf, lf)) continue;
      candidates.push({ nf, lf });
      break; // take the lowest available nf for this lf
    }
  });

  // Choose the candidate with the smallest transition energy (most easily excited)
  let best = null;
  candidates.forEach((c) => {
    const zeffI = zeffOf(groundZeff, ni, li);
    // Excited electron in the outer shell is strongly screened -> approximate Zeff ~ 1..2
    const zeffF = Math.max(1.0, Z - (Z - c.lf - 1));
    const Ei = -RYDBERG_EV * (zeffI * zeffI) / (ni * ni);
    const Ef = -RYDBERG_EV * (zeffF * zeffF) / (c.nf * c.nf);
    const dE = Ef - Ei; // positive absorption energy
    if (!best || dE < best.deltaE) {
      best = { ...c, deltaE: dE, zeffI, zeffF };
    }
  });

  if (!best) {
    // Fallback: promote to next shell as s->p
    best = { nf: ni + 1, lf: 1, deltaE: 10.2, zeffI: 1, zeffF: 1 };
  }

  const deltaE = Math.max(0.05, best.deltaE);
  const lambdaNm = HC_EV_NM / deltaE;
  const color = wavelengthToRGB(lambdaNm);

  // 3. Slater orbital relaxation: recompute Zeff with the active electron promoted
  const excitedSubshells = subshells
    .map((s) => ({ ...s }))
    .filter((s) => s.count > 0);
  // Remove one electron from the source subshell
  const src = excitedSubshells.find((s) => s.n === ni && s.l === li);
  if (src) src.count -= 1;
  // Add the promoted electron to the target subshell (create if needed)
  let tgt = excitedSubshells.find((s) => s.n === best.nf && s.l === best.lf);
  if (!tgt) {
    tgt = {
      n: best.nf,
      l: best.lf,
      label: `${best.nf}${ORBITAL_NAMES[best.lf]}`,
      count: 0,
      capacity: 2 * (2 * best.lf + 1)
    };
    excitedSubshells.push(tgt);
  }
  tgt.count += 1;
  const cleanExcited = excitedSubshells.filter((s) => s.count > 0);
  const excitedZeff = calculateSlaterZeff(Z, cleanExcited);

  // 4. Per-subshell radius shift for spectators: Delta r / r ~ -(Delta Zeff / Zeff)
  const spectatorShifts = groundZeff.map((g) => {
    const ex = excitedZeff.find((s) => s.n === g.n && s.l === g.l);
    const zeffAfter = ex ? ex.Zeff : g.Zeff;
    const dZ = zeffAfter - g.Zeff;
    const relShift = g.Zeff > 0 ? -(dZ / g.Zeff) : 0;
    return {
      n: g.n,
      l: g.l,
      label: g.label,
      isSource: g.n === ni && g.l === li,
      zeffBefore: g.Zeff,
      zeffAfter,
      deltaZeff: dZ,
      // clamp to a visually sane range (max +/- 12% radius change)
      relShift: Math.max(-0.12, Math.min(0.12, relShift))
    };
  });

  const canAbsorb = beamEnergyEV >= deltaE;

  return {
    Z,
    element: getElement(Z),
    source: { n: ni, l: li, label: source.label },
    target: { n: best.nf, l: best.lf, label: `${best.nf}${ORBITAL_NAMES[best.lf]}` },
    deltaL: best.lf - li,
    deltaE,
    lambdaNm,
    photonColor: color,
    beamEnergyEV,
    canAbsorb,
    residualEnergyEV: Math.max(0, beamEnergyEV - deltaE),
    zeffInitial: best.zeffI,
    zeffFinal: best.zeffF,
    spectatorShifts,
    groundZeff,
    excitedZeff,
    notation: config.notation
  };
}

/**
 * Calculates quantum mechanical space quantization and orbital inclination angle theta:
 * |L| = sqrt(l * (l + 1)) * hbar
 * L_z = m_l * hbar
 * cos(theta) = m_l / sqrt(l * (l + 1))
 * @param {number} l - Angular momentum quantum number
 * @param {number} ml - Magnetic quantum number (-l .. +l)
 * @returns {Object}
 */
export function calculateSpaceQuantization(l, ml) {
  if (l === 0) {
    return {
      l: 0,
      ml: 0,
      totalL: 0,
      totalLNorm: '0 ħ',
      lz: 0,
      lzNorm: '0 ħ',
      cosTheta: 1.0,
      thetaRad: 0,
      thetaDeg: 0,
      label: 's-pálya (Izotróp gömbszimmetria, nincs kitüntetett dőlés)'
    };
  }

  const lNorm = Math.sqrt(l * (l + 1));
  const cosTheta = Math.max(-1, Math.min(1, ml / lNorm));
  const thetaRad = Math.acos(cosTheta);
  const thetaDeg = (thetaRad * 180 / Math.PI);

  return {
    l,
    ml,
    totalL: lNorm,
    totalLNorm: `√${l * (l + 1)} ħ ≈ ${lNorm.toFixed(3)} ħ`,
    lz: ml,
    lzNorm: `${ml >= 0 ? '+' : ''}${ml} ħ`,
    cosTheta,
    thetaRad,
    thetaDeg,
    label: `θ = ${thetaDeg.toFixed(1)}° (cos θ = ${cosTheta.toFixed(3)})`
  };
}

// ============================================================================
// COSMOLOGICAL & GENERAL RELATIVISTIC CONSTANTS & MODELS
// ============================================================================
export const G_NEWTON = 6.67430e-11;      // m^3 kg^-1 s^-2
export const C_LIGHT = 299792458;         // m/s
export const H_BAR = 1.054571817e-34;     // J s
export const K_BOLTZMANN = 1.380649e-23;  // J/K
export const PROTON_MASS_KG = 1.67262192e-27; // kg
export const EV_TO_JOULE = 1.602176634e-19; // J / eV

// Cosmological and Quantum Gravity Parameters
export const HUBBLE_CONSTANT_KM_S_MPC = 70.0; // km/s/Mpc
export const H0_SI = 2.27e-18;                 // 1/s (Hubble expansion rate)
export const PLANCK_DENSITY = 5.155e96;        // kg/m^3
export const CRITICAL_BOUNCE_DENSITY = 2.1e96; // kg/m^3 (LQC/Poplawski rho_c approx 0.41 rho_P)
export const PLANCK_FREQUENCY = 1.85e43;       // Hz (omega_P = 1 / t_P)
export const PLANCK_TIME = 5.39e-44;          // s

/**
 * Calculates modified Friedmann expansion rate with LQC / Popławski spin-torsion bounce.
 * Equation: H^2 = (8 * pi * G / 3) * rho * (1 - rho / rho_c) + Lambda * c^2 / 3
 * @param {number} rho - Mass/energy density in kg/m^3
 * @param {number} [lambdaCosmo=1.1e-52] - Cosmological constant in 1/m^2
 * @returns {Object}
 */
export function calculateLQCModifiedHubble(rho, lambdaCosmo = 1.1e-52) {
  const rhoClamped = Math.max(0, rho);
  const bounceFactor = 1.0 - (rhoClamped / CRITICAL_BOUNCE_DENSITY);
  const matterTerm = ((8 * Math.PI * G_NEWTON) / 3) * rhoClamped * bounceFactor;
  const lambdaTerm = (lambdaCosmo * (C_LIGHT * C_LIGHT)) / 3;
  const H_squared = matterTerm + lambdaTerm;
  const isBouncing = rhoClamped >= CRITICAL_BOUNCE_DENSITY;
  const H = H_squared >= 0 ? Math.sqrt(H_squared) : 0;

  return {
    rho: rhoClamped,
    rho_c: CRITICAL_BOUNCE_DENSITY,
    bounceFactor,
    H_squared,
    H, // in 1/s
    H_km_s_mpc: H * 3.085677581e19,
    isBouncing
  };
}

/**
 * Calculates Gaussian and mean curvature for a Morris-Thorne / Kerr wormhole throat:
 * Hyperboloid: r(y) = sqrt(r0^2 + flare * y^2)
 * Gaussian curvature: K(y) = -flare * r0^2 / (r0^2 + flare * y^2)^2 (strictly negative saddle!)
 * @param {number} y - Coordinate along throat axis
 * @param {number} [r0=1.1] - Throat minimum radius
 * @param {number} [flare=0.35] - Throat flaring coefficient
 */
export function calculateThroatCurvature(y, r0 = 1.1, flare = 0.35) {
  const rSq = r0 * r0 + flare * y * y;
  const radius = Math.sqrt(rSq);
  // Negative Gaussian curvature (hyperbolic saddle)
  const gaussK = -(flare * r0 * r0) / (rSq * rSq);
  return {
    y,
    radius,
    gaussK,
    throatRadius: r0,
    flare
  };
}

/**
 * Calculates General Relativistic and Spacetime curvature metrics:
 * delta g_00, Kretschmann scalar, Ricci curvature, and visualization sag depth.
 * @param {number} r - Distance from center (in simulation units or meters)
 * @param {number} massKg - Mass of the nucleus/atom in kg
 * @param {number} [Z=1] - Atomic number
 * @param {boolean} [isJanus=false] - If true, antiproton/antimatter inverted curvature (delta g_00 > 0)
 */
export function calculateCurvatureMetrics(r, massKg, Z = 1, isJanus = false) {
  const rSafe = Math.max(0.1, Math.abs(r));
  const effectiveMass = isJanus ? -massKg : massKg;

  // Schwarzschild radius: r_s = 2 G M / c^2
  const rSchwarzschild = (2 * G_NEWTON * Math.abs(massKg)) / (C_LIGHT * C_LIGHT);

  // Spacetime metric perturbation: delta g_00 = -2 G M / (c^2 r)
  // For normal matter: negative well (delta g_00 < 0)
  // For Janus antimatter (r < 0): positive hill (delta g_00 > 0, repulsive gravity)
  const deltaG00Physical = -(2 * G_NEWTON * effectiveMass) / ((C_LIGHT * C_LIGHT) * rSafe * 1e-15);

  // Scaled visual representation for 3D canvas
  const visualBaseSag = isJanus ? 2.4 : -2.8;
  const visualSag = visualBaseSag * (Z / 2) * (1.0 / (1.0 + 0.35 * rSafe * rSafe));

  // Kretschmann scalar: K = 48 G^2 M^2 / (c^4 r^6)
  const kretschmann = (48 * (G_NEWTON * G_NEWTON) * (massKg * massKg)) /
                      (Math.pow(C_LIGHT, 4) * Math.pow(rSafe * 1e-15, 6));

  return {
    r: rSafe,
    massKg,
    Z,
    isJanus,
    rSchwarzschild,
    deltaG00Physical,
    visualSag,
    kretschmann
  };
}

/**
 * Computes momentum and kinetic energy of nuclear recoil upon photon absorption or emission:
 * p_recoil = E_gamma / c
 * E_recoil = p^2 / (2 * M_nucleus) * (1 - f_DW)
 * @param {number} photonEnergyEV - Photon energy in eV (e.g. 10.2 eV for Lyman-alpha)
 * @param {number} nuclearMassKg - Mass of the nucleus in kg
 * @param {number} [fDebyeWaller=0.0] - Recoil-free fraction (0.0 for free atom, ~0.8 for crystal lattice)
 */
export function calculateRecoilDynamics(photonEnergyEV, nuclearMassKg, fDebyeWaller = 0.0) {
  const ePhotonJ = photonEnergyEV * EV_TO_JOULE;
  const pPhoton = ePhotonJ / C_LIGHT; // kg * m/s
  const fDW = Math.max(0.0, Math.min(1.0, fDebyeWaller));
  const freeFraction = 1.0 - fDW;

  // Recoil velocity and kinetic energy
  const vRecoil = (freeFraction * pPhoton) / nuclearMassKg; // m/s
  const eRecoilJoules = freeFraction * (pPhoton * pPhoton) / (2 * nuclearMassKg);
  const eRecoilEV = eRecoilJoules / EV_TO_JOULE;

  return {
    photonEnergyEV,
    pPhoton,
    fDW,
    freeFraction,
    vRecoil,
    eRecoilJoules,
    eRecoilEV
  };
}

/**
 * Calculates instantaneous entropy production rate dS/dt and entropic time speed v_tau = dtau/dt.
 * Incorporates Rovelli thermal time, Barontini two-well model, and the 6-phase process dynamics:
 * Phase 2: QED vertex entropy
 * Phase 3: Wavefunction dephasing & orbital jump entropy
 * Phase 4: Nuclear recoil phononic excitation (MAXIMUM spike)
 * Phase 5: Deep wormhole throat dissipation (Bekenstein horizon flux)
 * Phase 6: Spontaneous radiative emission relaxation
 * @param {string} phaseKey - Active phase key ('idle', 'incoming', 'scattering', 'orbital_jump', 'nuclear_recoil', 'deep_dissipation', 'relaxation')
 * @param {Object} [params={}]
 * @param {number} [params.recoilEV=8.86e-9] - Nuclear recoil energy in eV
 * @param {number} [params.fDebyeWaller=0.0] - Debye-Waller lattice factor (0 = free, 1 = locked)
 * @param {number} [params.phaseProgress=0.5] - Current progress in phase (0..1)
 */
export function calculateEntropyFlux(phaseKey, params = {}) {
  const recoilEV = params.recoilEV !== undefined ? params.recoilEV : 8.86e-9;
  const fDW = params.fDebyeWaller !== undefined ? params.fDebyeWaller : 0.0;
  const progress = params.phaseProgress !== undefined ? params.phaseProgress : 0.5;

  // Baseline vacuum zero-point thermal fluctuation (minimum clock rate)
  const S_vacuum = 0.08;

  let S_recoil = 0.0;
  let S_qed = 0.0;
  let S_decoh = 0.0;
  let S_throat = 0.0;
  let S_relax = 0.0;

  const sinBell = Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));

  switch (phaseKey) {
    case 'idle':
      break;

    case 'incoming':
      // Slight approach entropy due to Coulomb interaction
      S_qed = 0.15 * sinBell;
      break;

    case 'scattering':
      // QED vertex exchange: virtual photon momentum transfer
      S_qed = 1.45 * Math.pow(sinBell, 0.7);
      break;

    case 'orbital_jump':
      // Conformal scale fiber deformation & dephasing of superposition
      S_decoh = 2.10 * Math.pow(sinBell, 0.8);
      break;

    case 'nuclear_recoil': {
      // Primary entropic clock engine: recoil kinetic transfer attenuated by Debye-Waller factor
      // Recoil shock scales with (1 - f_DW)
      const freeFraction = Math.max(0.0, 1.0 - fDW);
      const recoilScale = (recoilEV / 8.86e-9); // normalized to hydrogen recoil
      S_recoil = 4.80 * freeFraction * recoilScale * Math.pow(sinBell, 0.6);
      S_decoh = 0.80 * sinBell;
      break;
    }

    case 'deep_dissipation':
      // Coupling to extra-dimensional throat and Calabi-Yau geometry
      S_throat = 2.40 * Math.pow(sinBell, 0.85);
      break;

    case 'relaxation':
      // Spontaneous Lyman-alpha emission carrying off entropy
      S_relax = 1.30 * (1.0 - progress * 0.7);
      break;
  }

  const dotS_total = S_vacuum + S_recoil + S_qed + S_decoh + S_throat + S_relax;
  // Entropic time flow rate: v_tau = dtau / dt = kappa * |dS/dt|
  const KAPPA = 1.25;
  const vTau = KAPPA * dotS_total;

  return {
    phaseKey,
    dotS_total,
    vTau,
    components: {
      vacuum: S_vacuum,
      recoil: S_recoil,
      qed: S_qed,
      decoh: S_decoh,
      throat: S_throat,
      relax: S_relax
    },
    fDebyeWaller: fDW
  };
}

/**
 * Calculates increment in entropic time tau for time step dt:
 * dtau = v_tau * dt
 * @param {number} dt - Real elapsed time in seconds
 * @param {number} vTau - Rate of entropic time flow
 */
export function calculateEntropicTimeStep(dt, vTau) {
  return Math.max(0, dt * vTau);
}


