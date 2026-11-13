import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ART = join(ROOT, "public", "art");

const DEFS = `
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#0B1626"/>
  <stop offset="0.52" stop-color="#132745"/>
  <stop offset="1" stop-color="#091528"/>
</linearGradient>
<radialGradient id="halo" cx="50%" cy="42%" r="58%">
  <stop offset="0" stop-color="#3F8DFF" stop-opacity="0.34"/>
  <stop offset="0.55" stop-color="#2E6BFF" stop-opacity="0.10"/>
  <stop offset="1" stop-color="#2E6BFF" stop-opacity="0"/>
</radialGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/>
  <stop offset="0.45" stop-color="#BFD9FF" stop-opacity="0.11"/>
  <stop offset="1" stop-color="#2E6BFF" stop-opacity="0.10"/>
</linearGradient>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#F4F8FF"/>
  <stop offset="0.35" stop-color="#A9BDD9"/>
  <stop offset="0.62" stop-color="#DCE8F8"/>
  <stop offset="1" stop-color="#7C93B4"/>
</linearGradient>
<linearGradient id="blue" x1="0" y1="1" x2="1" y2="0">
  <stop offset="0" stop-color="#2E6BFF"/>
  <stop offset="0.55" stop-color="#57A8FF"/>
  <stop offset="1" stop-color="#9BE7FF"/>
</linearGradient>
<linearGradient id="violet" x1="0" y1="1" x2="1" y2="0">
  <stop offset="0" stop-color="#6D5BE8"/>
  <stop offset="1" stop-color="#C4B5FD"/>
</linearGradient>
<linearGradient id="copper" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFD9A8"/>
  <stop offset="0.5" stop-color="#E39A52"/>
  <stop offset="1" stop-color="#B8682B"/>
</linearGradient>
<linearGradient id="green" x1="0" y1="1" x2="1" y2="0">
  <stop offset="0" stop-color="#1FA97A"/>
  <stop offset="1" stop-color="#7DF0C0"/>
</linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
  <stop offset="0.5" stop-color="#9CC4FF" stop-opacity="0.18"/>
  <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.32"/>
</linearGradient>
<linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#0E2B4E"/>
  <stop offset="1" stop-color="#123B67"/>
</linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.10"/>
  <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>
<radialGradient id="iridescent" cx="35%" cy="28%" r="80%">
  <stop offset="0" stop-color="#BFE3FF" stop-opacity="0.85"/>
  <stop offset="0.35" stop-color="#6E9BE0" stop-opacity="0.55"/>
  <stop offset="0.62" stop-color="#9C86F0" stop-opacity="0.42"/>
  <stop offset="0.82" stop-color="#6FD9D2" stop-opacity="0.30"/>
  <stop offset="1" stop-color="#2E6BFF" stop-opacity="0.22"/>
</radialGradient>
<linearGradient id="waferBase" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#2A5A8F"/>
  <stop offset="0.45" stop-color="#1B3E66"/>
  <stop offset="1" stop-color="#122C4C"/>
</linearGradient>
<radialGradient id="waferLight" cx="32%" cy="24%" r="62%">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/>
  <stop offset="0.45" stop-color="#B9E6FF" stop-opacity="0.28"/>
  <stop offset="1" stop-color="#B9E6FF" stop-opacity="0"/>
</radialGradient>
<linearGradient id="waferTint" x1="0" y1="1" x2="1" y2="0">
  <stop offset="0" stop-color="#6D5BE8" stop-opacity="0.5"/>
  <stop offset="0.5" stop-color="#57A8FF" stop-opacity="0.25"/>
  <stop offset="1" stop-color="#6FD9D2" stop-opacity="0.55"/>
</linearGradient>
<pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
  <path d="M0 36H26M46 36H72M36 0V26M36 46V72" stroke="#8FB6E8" stroke-opacity="0.10" stroke-width="1"/>
  <circle cx="36" cy="36" r="2" fill="#8FB6E8" fill-opacity="0.14"/>
</pattern>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="10" result="b"/>
  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
  <feGaussianBlur stdDeviation="20"/>
</filter>
<clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath>
`;

const panel = (x, y, w, h, r = 18, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#glass)" stroke="url(#edge)" stroke-width="2" ${extra}/>`;

const platform = () => `
  <ellipse cx="256" cy="394" rx="74" ry="12" fill="#57A8FF" opacity="0.10" filter="url(#soft)"/>
  <ellipse cx="256" cy="394" rx="112" ry="17" fill="none" stroke="#7FB2FF" stroke-opacity="0.16"/>`;

const dot = (cx, cy, r, fill = "url(#blue)", extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;

const glowDot = (cx, cy, r, fill = "#9BE7FF") =>
  `<circle cx="${cx}" cy="${cy}" r="${r * 2.6}" fill="${fill}" opacity="0.18" filter="url(#soft)"/>${dot(cx, cy, r, fill)}`;

const trace = (d, color = "#57A8FF", width = 3, opacity = 0.8) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;

const orbit = (cx, cy, rx, ry, rot, color = "#7FB2FF", opacity = 0.35) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2" transform="rotate(${rot} ${cx} ${cy})"/>`;

function gearPath(cx, cy, rRoot, rTip, teeth) {
  const step = (Math.PI * 2) / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    pts.push([a, rRoot], [a + step * 0.16, rRoot], [a + step * 0.26, rTip], [a + step * 0.46, rTip], [a + step * 0.56, rRoot]);
  }
  pts.push([Math.PI * 2, rRoot]);
  return (
    "M" +
    pts.map(([a, r]) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`).join("L") +
    "Z"
  );
}

function fan(cx, cy, r) {
  let blades = "";
  for (let i = 0; i < 7; i += 1) {
    const a = (360 / 7) * i;
    blades += `<path d="M${cx} ${cy} Q${cx + r * 0.92} ${cy - r * 0.2} ${cx + r * 0.78} ${cy - r * 0.62} Q${cx + r * 0.3} ${cy - r * 0.58} ${cx} ${cy}Z" fill="#9CC4FF" fill-opacity="0.16" stroke="#BFD9FF" stroke-opacity="0.30" stroke-width="1.5" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  return `${blades}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#metal)" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="url(#metal)"/>`;
}

function chipRow(x, y, w, h, count, gap, fill = "#0B1B30") {
  let out = "";
  const cw = (w - gap * (count - 1)) / count;
  for (let i = 0; i < count; i += 1) {
    out += `<rect x="${(x + i * (cw + gap)).toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="${h}" rx="4" fill="${fill}" stroke="#7FB2FF" stroke-opacity="0.35" stroke-width="1.5"/>`;
  }
  return out;
}

const BODIES = {
  dashboard: () => `
    ${orbit(256, 250, 172, 64, -16, "#57A8FF", 0.22)}
    ${platform()}
    ${panel(146, 286, 52, 86, 14)}
    ${panel(230, 236, 52, 136, 14)}
    ${panel(314, 176, 52, 196, 14)}
    <rect x="152" y="292" width="40" height="6" rx="3" fill="#9BE7FF" opacity="0.75"/>
    <rect x="236" y="242" width="40" height="6" rx="3" fill="#9BE7FF" opacity="0.75"/>
    <rect x="320" y="182" width="40" height="6" rx="3" fill="#9BE7FF" opacity="0.75"/>
    ${trace("M138 306L214 246L292 270L384 162", "url(#blue)", 6, 0.95)}
    ${glowDot(384, 162, 10)}
    <circle cx="214" cy="246" r="5" fill="#BFD9FF"/>
    <circle cx="292" cy="270" r="5" fill="#BFD9FF"/>
    ${trace("M128 374H388", "#FFFFFF", 2, 0.16)}`,

  company: () => `
    ${platform()}
    ${panel(146, 214, 66, 152, 12)}
    ${panel(224, 142, 82, 224, 14)}
    ${panel(318, 252, 58, 114, 12)}
    ${Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 2 }, (_, col) =>
        `<rect x="${160 + col * 26}" y="${232 + row * 28}" width="14" height="12" rx="3" fill="#57A8FF" opacity="${0.75 - row * 0.12}"/>`,
      ).join(""),
    ).join("")}
    ${Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 3 }, (_, col) =>
        `<rect x="${238 + col * 20}" y="${160 + row * 30}" width="12" height="14" rx="3" fill="#9BE7FF" opacity="${0.85 - row * 0.1}"/>`,
      ).join(""),
    ).join("")}
    ${Array.from({ length: 3 }, (_, row) =>
      Array.from({ length: 2 }, (_, col) =>
        `<rect x="${330 + col * 22}" y="${268 + row * 26}" width="12" height="12" rx="3" fill="#57A8FF" opacity="${0.6 - row * 0.14}"/>`,
      ).join(""),
    ).join("")}
    <rect x="236" y="128" width="58" height="8" rx="4" fill="url(#copper)" opacity="0.9"/>
    ${trace("M264 128V104", "#9BE7FF", 4, 0.9)}
    ${glowDot(264, 100, 8)}
    ${orbit(256, 254, 168, 54, -14, "#57A8FF", 0.18)}`,

  research: () => `
    ${orbit(256, 262, 150, 58, -20, "#7FB2FF", 0.28)}
    ${platform()}
    <path d="M236 218V156q0-12 12-12h16q12 0 12 12v62l54 116q14 30-18 38H200q-32-8-18-38Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    <path d="M207 318h98q14 26-8 32H215q-22-6-8-32Z" fill="url(#blue)" opacity="0.75"/>
    <path d="M215 330h82" stroke="#D9F4FF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <circle cx="242" cy="300" r="7" fill="#BFE9FF" opacity="0.85"/>
    <circle cx="272" cy="286" r="4.5" fill="#BFE9FF" opacity="0.7"/>
    <circle cx="258" cy="314" r="3.5" fill="#BFE9FF" opacity="0.6"/>
    <rect x="240" y="132" width="32" height="8" rx="4" fill="url(#metal)" opacity="0.7"/>
    ${trace("M182 206l-26-26M330 206l26-26M176 264H134", "#9BE7FF", 2.5, 0.5)}
    ${glowDot(134, 264, 5, "#6FD9D2")}
    ${glowDot(356, 180, 4, "#C4B5FD")}`,

  hardware: () => `
    ${platform()}
    <rect x="136" y="158" width="240" height="210" rx="18" fill="#0C2038" stroke="url(#edge)" stroke-width="2.5"/>
    ${trace("M158 336V282l28-28h44M158 198h34l20 20v58M342 180v54l-22 22h-46M342 330h-50l-24-24", "#57A8FF", 2.5, 0.45)}
    <rect x="196" y="204" width="88" height="88" rx="12" fill="url(#glass)" stroke="url(#metal)" stroke-width="3"/>
    <rect x="216" y="224" width="48" height="48" rx="6" fill="#0A1830" stroke="#9BE7FF" stroke-opacity="0.5" stroke-width="1.5"/>
    ${trace("M228 248h24M240 236v24", "#9BE7FF", 2, 0.6)}
    <rect x="300" y="214" width="16" height="74" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="322" y="214" width="16" height="74" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="168" y="320" width="96" height="14" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.35" stroke-width="1.5"/>
    <circle cx="330" cy="332" r="10" fill="url(#copper)" opacity="0.9"/>
    <circle cx="168" cy="196" r="6" fill="url(#copper)" opacity="0.85"/>
    ${glowDot(240, 248, 5)}`,

  cpu: () => {
    let pins = "";
    for (let i = 0; i < 5; i += 1) {
      const p = 176 + i * 40;
      pins += `<path d="M${p} 138v18M${p} 356v18M138 ${p}h18M356 ${p}h18" stroke="url(#metal)" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
    }
    return `
    ${platform()}
    <rect x="156" y="156" width="200" height="200" rx="30" fill="url(#glass)" stroke="url(#metal)" stroke-width="4"/>
    ${pins}
    <rect x="196" y="196" width="120" height="120" rx="14" fill="#0A1830" stroke="#57A8FF" stroke-opacity="0.55" stroke-width="2"/>
    ${trace("M216 256h30l14-18h18M256 216v26l18 14v20M296 236v36l-16 16M216 276h26l16 16h20", "#9BE7FF", 2.5, 0.7)}
    ${glowDot(256, 256, 9)}
    <path d="M170 168l34-0" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round"/>
    <circle cx="326" cy="186" r="4" fill="#9BE7FF" opacity="0.8"/>`;
  },

  gpu: () => {
    let edge = "";
    for (let i = 0; i < 9; i += 1) {
      edge += `<rect x="${152 + i * 24}" y="338" width="12" height="18" rx="2" fill="url(#copper)" opacity="0.85"/>`;
    }
    return `
    ${platform()}
    <rect x="112" y="178" width="288" height="164" rx="22" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    ${fan(198, 262, 54)}
    ${fan(316, 262, 54)}
    <rect x="238" y="196" width="52" height="34" rx="8" fill="#0A1830" stroke="#9BE7FF" stroke-opacity="0.45" stroke-width="1.5"/>
    ${trace("M248 213h8M264 213h8", "#9BE7FF", 2, 0.7)}
    ${edge}
    ${glowDot(342, 198, 5, "#7DF0C0")}
    <path d="M126 194h26" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="3" stroke-linecap="round"/>`;
  },

  components: () => `
    ${platform()}
    <g transform="rotate(-10 256 256)">
      ${panel(120, 196, 272, 58, 10)}
      ${chipRow(134, 210, 244, 30, 4, 8)}
      ${panel(120, 274, 272, 58, 10)}
      ${chipRow(134, 288, 244, 30, 4, 8)}
      <rect x="120" y="354" width="272" height="8" rx="4" fill="url(#copper)" opacity="0.55"/>
    </g>
    <circle cx="168" cy="150" r="18" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    <circle cx="168" cy="150" r="6" fill="url(#copper)"/>
    <circle cx="214" cy="150" r="12" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    ${trace("M350 150h34v30", "#57A8FF", 2.5, 0.5)}
    ${glowDot(384, 180, 5)}`,

  os: () => `
    ${platform()}
    ${panel(196, 142, 190, 122, 16, 'opacity="0.35"')}
    ${panel(176, 172, 190, 126, 16, 'opacity="0.6"')}
    ${panel(146, 204, 220, 152, 18)}
    <path d="M146 240h220" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"/>
    ${dot(168, 222, 5, "#FF8A8A")}
    ${dot(186, 222, 5, "#FFD37A")}
    ${dot(204, 222, 5, "#7DF0C0")}
    ${trace("M172 272h84M172 296h58M172 320h100", "#9BE7FF", 3, 0.35)}
    <path d="M292 286l34 22-15 4 9 17-10 5-9-17-10 10Z" fill="#EAF4FF" stroke="#0B1626" stroke-width="2.5" stroke-linejoin="round"/>
    ${panel(350, 300, 46, 46, 12)}
    <rect x="362" y="312" width="22" height="22" rx="5" fill="url(#blue)" opacity="0.8"/>
    ${glowDot(374, 220, 6, "#C4B5FD")}`,

  ai: () => {
    const nodes = [
      [256, 128], [333, 160], [374, 232], [356, 310], [292, 364], [210, 362], [146, 308], [132, 226], [168, 158],
      [256, 206], [318, 256], [256, 312], [198, 262],
    ];
    const edges = [
      [0, 9], [1, 9], [2, 10], [3, 10], [4, 11], [5, 11], [6, 12], [7, 12], [8, 9],
      [9, 10], [10, 11], [11, 12], [12, 9], [0, 1], [2, 3], [4, 5], [6, 7], [8, 0],
    ];
    return `
    ${orbit(256, 250, 158, 158, 0, "#57A8FF", 0.18)}
    ${orbit(256, 250, 190, 62, -22, "#9BE7FF", 0.16)}
    ${platform()}
    ${edges.map(([a, b]) => `<path d="M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}" stroke="#57A8FF" stroke-opacity="0.32" stroke-width="2"/>`).join("")}
    <path d="${gearPath(256, 262, 26, 40, 6)}" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    ${nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i < 9 ? 7 : 5}" fill="${i % 3 === 0 ? "#9BE7FF" : "#7FB2FF"}" opacity="${i < 9 ? 0.9 : 0.65}"/>`).join("")}
    ${glowDot(256, 262, 9, "#C4B5FD")}
    ${trace("M256 128v-18M132 226h-20M374 232h18", "#9BE7FF", 2.5, 0.4)}`;
  },

  devices: () => `
    ${platform()}
    <rect x="238" y="168" width="168" height="118" rx="10" fill="#0B1B30" stroke="url(#metal)" stroke-width="3"/>
    <rect x="250" y="180" width="144" height="94" rx="5" fill="url(#screen)"/>
    ${trace("M264 198h50M264 214h90M264 230h70M264 246h40", "#9BE7FF", 3, 0.35)}
    <path d="M222 292h200l16 34q4 12-10 12H216q-14 0-10-12Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    <path d="M240 330h164" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round"/>
    <rect x="122" y="182" width="100" height="196" rx="22" fill="#0B1B30" stroke="url(#metal)" stroke-width="3"/>
    <rect x="134" y="196" width="76" height="156" rx="10" fill="url(#screen)"/>
    <path d="M158 186h28" stroke="#0B1B30" stroke-width="6" stroke-linecap="round"/>
    <rect x="146" y="210" width="52" height="10" rx="5" fill="#57A8FF" opacity="0.8"/>
    ${trace("M146 238h52M146 256h38M146 274h46", "#9BE7FF", 3, 0.3)}
    <circle cx="172" cy="362" r="5" fill="#9BE7FF" opacity="0.7"/>
    ${glowDot(330, 206, 6, "#C4B5FD")}`,

  cloud: () => `
    ${platform()}
    <path d="M180 214c0-22 18-40 40-40 6 0 12 1 17 4 8-20 28-34 51-34 30 0 55 24 56 54 18 3 32 18 32 36 0 20-17 36-37 36H196c-22 0-40-18-40-40Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    ${trace("M216 196h44M204 214h72", "#9BE7FF", 3, 0.35)}
    ${trace("M226 256v22M286 256v22", "#57A8FF", 2.5, 0.55)}
    <rect x="168" y="276" width="176" height="112" rx="16" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    ${[0, 1, 2].map((i) => `
      <rect x="184" y="${290 + i * 32}" width="144" height="22" rx="6" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.3" stroke-width="1.5"/>
      ${trace(`M196 ${301 + i * 32}h44`, "#9BE7FF", 3, 0.35)}
      <circle cx="306" cy="${301 + i * 32}" r="4" fill="${i === 0 ? "#7DF0C0" : "#57A8FF"}" opacity="0.9"/>
    `).join("")}
    ${glowDot(256, 160, 6, "#9BE7FF")}`,

  manufacturing: () => `
    ${platform()}
    <circle cx="236" cy="286" r="116" fill="url(#iridescent)" stroke="url(#metal)" stroke-width="3"/>
    <g clip-path="url(#waferClip)">
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${236 - 116 + i * 29} 170v232" stroke="#0B1626" stroke-opacity="0.28" stroke-width="2"/>`).join("")}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M120 ${286 - 116 + i * 29}h232" stroke="#0B1626" stroke-opacity="0.28" stroke-width="2"/>`).join("")}
    </g>
    <path d="M236 402l-14-20h28Z" fill="#0B1626"/>
    <path d="M138 208a116 116 0 0 1 58-56" stroke="#EAF7FF" stroke-opacity="0.5" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${trace("M330 118v54l-38 38", "url(#metal)", 14, 0.95)}
    <circle cx="330" cy="118" r="14" fill="url(#glass)" stroke="url(#metal)" stroke-width="3"/>
    <circle cx="292" cy="210" r="10" fill="url(#metal)"/>
    ${trace("M292 210v26", "#9BE7FF", 4, 0.9)}
    ${glowDot(292, 244, 6)}
    <defs><clipPath id="waferClip"><circle cx="236" cy="286" r="113"/></clipPath></defs>
    ${orbit(236, 286, 146, 40, -16, "#9BE7FF", 0.2)}`,

  market: () => {
    const candles = [
      [176, 296, 58, "up"], [214, 268, 74, "down"], [252, 236, 86, "up"], [290, 254, 62, "up"], [328, 198, 98, "down"],
    ];
    return `
    ${platform()}
    ${panel(132, 146, 248, 216, 20)}
    ${trace("M156 196h200M156 246h200M156 296h200", "#7FB2FF", 1.5, 0.12)}
    ${candles.map(([x, y, h, dir], i) => {
      const color = dir === "up" ? "url(#green)" : "url(#copper)";
      return `<path d="M${x + 12} ${y - 22}v${h + 44}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
        <rect x="${x}" y="${y}" width="24" height="${h}" rx="6" fill="${color}" opacity="${0.9 - i * 0.04}"/>`;
    }).join("")}
    ${trace("M150 320L208 286L262 300L330 210L382 178", "url(#blue)", 5, 0.95)}
    <path d="M368 176h18v18" fill="none" stroke="#9BE7FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${glowDot(382, 178, 6)}`;
  },

  finance: () => `
    ${platform()}
    ${[0, 1, 2].map((i) => {
      const cy = 350 - i * 34;
      return `
      <path d="M146 ${cy}v12a60 16 0 0 0 120 0v-12Z" fill="url(#copper)" opacity="${0.8 - i * 0.05}"/>
      <ellipse cx="206" cy="${cy}" rx="60" ry="16" fill="url(#copper)" opacity="${0.98 - i * 0.05}"/>
      <ellipse cx="206" cy="${cy}" rx="44" ry="11" fill="none" stroke="#5A2E10" stroke-opacity="0.35" stroke-width="2"/>
      <path d="M206 ${cy - 8}l9 8-9 8-9-8Z" fill="#5A2E10" opacity="0.45"/>
      ${i === 2 ? `<path d="M206 ${cy + 12}l9 8-9 8-9-8Z" fill="#5A2E10" opacity="0.3"/>` : ""}`;
    }).join("")}
    ${trace("M292 330L332 282L364 298L404 214", "url(#blue)", 6, 0.95)}
    <path d="M390 212h18v18" fill="none" stroke="#9BE7FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${glowDot(404, 214, 6)}
    ${panel(150, 148, 104, 60, 14)}
    ${trace("M164 188h26M164 172h44", "#9BE7FF", 3, 0.45)}
    ${glowDot(238, 168, 5, "#7DF0C0")}`,

  analytics: () => {
    const pts = [
      [256, 132], [360, 210], [320, 344], [192, 344], [152, 210],
    ];
    const inner = [
      [256, 196], [326, 224], [300, 322], [206, 310], [190, 226],
    ];
    return `
    ${platform()}
    <path d="${pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("")}Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    ${[0.33, 0.66].map((k) => `<path d="${pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${256 + (x - 256) * k} ${238 + (y - 238) * k}`).join("")}Z" fill="none" stroke="#7FB2FF" stroke-opacity="0.22" stroke-width="1.5"/>`).join("")}
    ${pts.map(([x]) => `<path d="M256 238L${x} ${238}" stroke="#7FB2FF" stroke-opacity="0.2" stroke-width="1.5"/>`).join("")}
    <path d="${inner.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("")}Z" fill="url(#blue)" fill-opacity="0.55" stroke="#9BE7FF" stroke-width="3.5" stroke-linejoin="round"/>
    ${inner.map(([x, y]) => dot(x, y, 6, "#EAF7FF")).join("")}
    ${glowDot(256, 238, 8)}
    ${orbit(256, 238, 162, 162, 0, "#57A8FF", 0.14)}`;
  },

  ecosystem: () => {
    const cx = 256;
    const cy = 252;
    const satellites = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      return [cx + Math.cos(a) * 128, cy + Math.sin(a) * 128];
    });
    return `
    ${orbit(cx, cy, 128, 128, 0, "#57A8FF", 0.22)}
    ${satellites.map(([x, y]) => `<path d="M${cx} ${cy}L${x} ${y}" stroke="#57A8FF" stroke-opacity="0.3" stroke-width="2"/>`).join("")}
    ${orbit(cx, cy, 168, 56, -24, "#9BE7FF", 0.16)}
    ${platform()}
    <path d="${gearPath(cx, cy, 34, 52, 6)}" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    ${glowDot(cx, cy, 11, "#9BE7FF")}
    ${satellites.map(([x, y], i) => `
      <circle cx="${x}" cy="${y}" r="16" fill="#0B1B30" stroke="url(#metal)" stroke-width="2.5"/>
      <circle cx="${x}" cy="${y}" r="5" fill="${i % 2 === 0 ? "#57A8FF" : "#C4B5FD"}"/>
    `).join("")}
    <path d="M256 100V80M128 252H108M384 252h20" stroke="#9BE7FF" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round"/>`;
  },

  software: () => `
    ${platform()}
    ${panel(132, 158, 248, 182, 20)}
    <path d="M132 200h248" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2"/>
    ${dot(156, 180, 5, "#FF8A8A")}
    ${dot(174, 180, 5, "#FFD37A")}
    ${dot(192, 180, 5, "#7DF0C0")}
    ${trace("M204 236l-26 26 26 26M308 236l26 26-26 26M272 224l-32 76", "url(#blue)", 6, 0.95)}
    ${panel(330, 296, 42, 42, 10)}
    <rect x="340" y="306" width="22" height="22" rx="5" fill="url(#violet)" opacity="0.85"/>
    ${panel(216, 300, 42, 42, 10)}
    <rect x="226" y="310" width="22" height="22" rx="5" fill="url(#green)" opacity="0.85"/>
    ${glowDot(384, 222, 5, "#9BE7FF")}`,

  settings: () => {
    const cx = 256;
    const cy = 250;
    return `
    ${orbit(cx, cy, 164, 56, -22, "#9BE7FF", 0.18)}
    ${platform()}
    <path d="${gearPath(cx, cy, 96, 124, 8)}" fill="url(#glass)" stroke="url(#metal)" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="58" fill="#0B1B30" stroke="url(#edge)" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="36" fill="url(#glass)" stroke="#57A8FF" stroke-opacity="0.45" stroke-width="2"/>
    ${glowDot(cx, cy, 12)}
    ${trace("M256 176v-28M256 324v28M182 250h-28M330 250h28", "#9BE7FF", 2.5, 0.35)}
    <circle cx="330" cy="166" r="6" fill="#C4B5FD"/>`;
  },
};

const RESOURCES = {
  silicon: () => `
    ${platform()}
    <path d="M170 330l-14-62 44-52 60 10 22 56-32 62Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    <path d="M156 268l58-14 22 56-52 20Z" fill="#7FB2FF" opacity="0.16"/>
    <path d="M214 254l60 10 22 56-60-10Z" fill="#9BE7FF" opacity="0.12"/>
    <path d="M282 300l-2-70 46-44 56 20 14 62-44 54Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    <path d="M280 230l48 8 54-32" stroke="#9BE7FF" stroke-opacity="0.4" stroke-width="2.5" fill="none"/>
    ${trace("M326 330l-2-58 52-44", "#57A8FF", 2.5, 0.5)}
    ${glowDot(376, 292, 6, "#6FD9D2")}
    ${trace("M196 360h120", "#FFFFFF", 2, 0.12)}`,

  ingot: () => `
    ${platform()}
    <path d="M180 176q0-18 76-18t76 18v148q0 20-76 20t-76-20Z" fill="url(#metal)" opacity="0.9"/>
    <ellipse cx="256" cy="176" rx="76" ry="20" fill="#EAF4FF" opacity="0.85"/>
    <ellipse cx="256" cy="176" rx="76" ry="20" fill="url(#iridescent)" opacity="0.5"/>
    <path d="M180 210h152M180 250h152M180 290h152" stroke="#7C93B4" stroke-opacity="0.45" stroke-width="2"/>
    ${trace("M198 180v148M314 180v148", "#FFFFFF", 3, 0.25)}
    <path d="M180 176q0-18 76-18t76 18" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3"/>
    ${glowDot(256, 340, 7, "#9BE7FF")}
    ${orbit(256, 246, 112, 42, -18, "#9BE7FF", 0.18)}`,

  wafer: () => `
    ${platform()}
    <circle cx="256" cy="262" r="134" fill="url(#waferBase)"/>
    <circle cx="256" cy="262" r="134" fill="url(#waferTint)"/>
    <g clip-path="url(#waferResClip)">
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${256 - 138 + i * 25} 124v276" stroke="#BFE3FF" stroke-opacity="0.14" stroke-width="1.5"/>`).join("")}
      ${Array.from({ length: 12 }, (_, i) => `<path d="M118 ${262 - 138 + i * 25}h276" stroke="#BFE3FF" stroke-opacity="0.14" stroke-width="1.5"/>`).join("")}
      <ellipse cx="186" cy="176" rx="140" ry="112" fill="url(#waferLight)"/>
      <path d="M142 262a114 114 0 0 1 92-112" stroke="#F4FCFF" stroke-opacity="0.6" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M370 262a114 114 0 0 1-34 86" stroke="#6FD9D2" stroke-opacity="0.4" stroke-width="8" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="256" cy="262" r="134" fill="none" stroke="url(#metal)" stroke-width="4"/>
    <circle cx="256" cy="262" r="128" fill="none" stroke="#9BE7FF" stroke-opacity="0.26" stroke-width="1.5"/>
    <path d="M242 396h28l-14-24Z" fill="#0B1626"/>
    <defs><clipPath id="waferResClip"><circle cx="256" cy="262" r="131"/></clipPath></defs>
    ${glowDot(256, 262, 6, "#C4B5FD")}`,

  "cpu-die": () => `
    ${platform()}
    <rect x="160" y="160" width="192" height="192" rx="16" fill="url(#metal)" opacity="0.9"/>
    <rect x="178" y="178" width="156" height="156" rx="10" fill="#0A1830" stroke="#9BE7FF" stroke-opacity="0.4" stroke-width="2"/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${190 + i * 22} 190v132" stroke="#57A8FF" stroke-opacity="0.3" stroke-width="2"/>`).join("")}
    ${Array.from({ length: 6 }, (_, i) => `<path d="M190 ${190 + i * 22}h132" stroke="#57A8FF" stroke-opacity="0.3" stroke-width="2"/>`).join("")}
    <rect x="228" y="228" width="56" height="56" rx="8" fill="url(#glass)" stroke="#9BE7FF" stroke-width="2"/>
    ${glowDot(256, 256, 8)}
    <path d="M160 160h40" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
    <circle cx="340" cy="340" r="5" fill="url(#copper)"/>
    ${trace("M160 352h-22M352 160v-22", "url(#copper)", 4, 0.7)}`,

  "gpu-die": () => `
    ${platform()}
    <rect x="118" y="172" width="276" height="168" rx="14" fill="url(#metal)" opacity="0.92"/>
    <rect x="140" y="192" width="232" height="128" rx="6" fill="#0A1830" stroke="#9BE7FF" stroke-opacity="0.4" stroke-width="2"/>
    <g clip-path="url(#gpuDieClip)">
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${146 + i * 26} 192v128" stroke="#57A8FF" stroke-opacity="0.16" stroke-width="1.5"/>`).join("")}
      ${Array.from({ length: 5 }, (_, i) => `<path d="M140 ${202 + i * 24}h232" stroke="#57A8FF" stroke-opacity="0.16" stroke-width="1.5"/>`).join("")}
      <rect x="160" y="204" width="72" height="44" rx="4" fill="url(#violet)" opacity="0.28"/>
      <rect x="280" y="204" width="72" height="44" rx="4" fill="url(#blue)" opacity="0.26"/>
      <rect x="160" y="264" width="72" height="44" rx="4" fill="url(#blue)" opacity="0.26"/>
      <rect x="280" y="264" width="72" height="44" rx="4" fill="url(#violet)" opacity="0.28"/>
      <rect x="238" y="228" width="36" height="56" rx="4" fill="url(#blue)" opacity="0.5"/>
    </g>
    <rect x="140" y="192" width="232" height="128" rx="6" fill="none" stroke="#9BE7FF" stroke-opacity="0.2" stroke-width="1.5"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${150 + i * 22}" y="326" width="12" height="8" rx="2" fill="url(#copper)" opacity="0.85"/>`).join("")}
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${150 + i * 22}" y="178" width="12" height="8" rx="2" fill="url(#copper)" opacity="0.6"/>`).join("")}
    <defs><clipPath id="gpuDieClip"><rect x="140" y="192" width="232" height="128" rx="6"/></clipPath></defs>
    ${glowDot(256, 256, 5, "#EAF7FF")}`,

  dram: () => `
    ${platform()}
    <g transform="rotate(-12 256 256)">
      ${panel(96, 204, 320, 88, 12)}
      ${chipRow(112, 220, 288, 56, 4, 10)}
      <rect x="96" y="278" width="320" height="10" rx="4" fill="url(#copper)" opacity="0.75"/>
      ${Array.from({ length: 16 }, (_, i) => `<path d="M${104 + i * 20} 288v16" stroke="url(#copper)" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`).join("")}
    </g>
    ${glowDot(330, 170, 6, "#7DF0C0")}
    ${orbit(256, 256, 176, 50, -12, "#9BE7FF", 0.16)}`,

  motherboard: () => `
    ${platform()}
    <rect x="126" y="150" width="260" height="220" rx="18" fill="#0C2038" stroke="url(#edge)" stroke-width="2.5"/>
    ${trace("M148 338V274l30-30h52M148 186h40l24 24v62M352 172v62l-26 26h-42M352 338h-58l-28-28", "#57A8FF", 2.5, 0.45)}
    <rect x="188" y="196" width="80" height="80" rx="10" fill="url(#glass)" stroke="url(#metal)" stroke-width="3"/>
    <rect x="206" y="214" width="44" height="44" rx="5" fill="#0A1830" stroke="#9BE7FF" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="292" y="206" width="14" height="66" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="314" y="206" width="14" height="66" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="158" y="316" width="88" height="12" rx="4" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.35" stroke-width="1.5"/>
    <circle cx="324" cy="326" r="9" fill="url(#copper)" opacity="0.9"/>
    ${glowDot(228, 236, 5)}`,

  server: () => `
    ${platform()}
    <rect x="158" y="150" width="196" height="230" rx="18" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/>
    ${[0, 1, 2, 3].map((i) => `
      <rect x="174" y="${166 + i * 52}" width="164" height="40" rx="8" fill="#0B1B30" stroke="#7FB2FF" stroke-opacity="0.3" stroke-width="1.5"/>
      ${Array.from({ length: 5 }, (_, j) => `<path d="M${190 + j * 14} ${180 + i * 52}v12" stroke="#9BE7FF" stroke-opacity="0.28" stroke-width="3" stroke-linecap="round"/>`).join("")}
      <circle cx="318" cy="${186 + i * 52}" r="4" fill="${i === 0 ? "#7DF0C0" : "#57A8FF"}"/>
    `).join("")}
    ${trace("M256 150v-22", "#9BE7FF", 3, 0.6)}
    <path d="M214 106c0-14 11-25 25-25 4 0 8 1 11 3 5-13 18-22 32-22 19 0 34 15 35 34 11 2 20 11 20 22 0 13-10 23-23 23h-77c-14 0-25-11-25-25Z" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/>
    ${glowDot(256, 106, 5, "#9BE7FF")}`,
};

const SECTION_META = [
  ["dashboard", "Dashboard", "Дашборд"],
  ["company", "Company", "Компания"],
  ["research", "Research", "Исследования"],
  ["hardware", "Hardware", "Оборудование"],
  ["cpu", "CPU Designer", "Процессоры"],
  ["gpu", "GPU Designer", "Графика"],
  ["components", "Components", "Компоненты"],
  ["os", "OS Lab", "Операционные системы"],
  ["ai", "AI Lab", "Искусственный интеллект"],
  ["software", "Software Studio", "Софт"],
  ["devices", "Devices", "Устройства"],
  ["cloud", "Cloud", "Облако"],
  ["manufacturing", "Manufacturing", "Производство"],
  ["market", "Market", "Рынок"],
  ["finance", "Finance", "Финансы"],
  ["analytics", "Analytics", "Аналитика"],
  ["ecosystem", "Ecosystem", "Экосистема"],
  ["settings", "Settings", "Настройки"],
];

const RESOURCE_META = [
  ["silicon", "Silicon", "Поликремний"],
  ["ingot", "Ingot", "Монокристалл"],
  ["wafer", "Wafer", "Кремниевая пластина"],
  ["cpu-die", "CPU Die", "Кристалл CPU"],
  ["gpu-die", "GPU Die", "Кристалл GPU"],
  ["dram", "DRAM", "Память"],
  ["motherboard", "Motherboard", "Материнская плата"],
  ["server", "Server", "Сервер"],
];

function svg(label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${label}">
  <title>${label} — Silicon Dynasty</title>
  <defs>${DEFS}</defs>
  <g clip-path="url(#tile)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <rect width="512" height="512" fill="url(#halo)"/>
    <rect width="512" height="512" fill="url(#grid)"/>
    <path d="M0 0h512v210L0 396Z" fill="url(#sheen)" opacity="0.5"/>
    <ellipse cx="256" cy="452" rx="196" ry="62" fill="#020812" opacity="0.5" filter="url(#soft)"/>
    ${body}
    <rect x="9" y="9" width="494" height="494" rx="103" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="2"/>
  </g>
</svg>
`;
}

const APP_ICON_BODY = `
  <defs>
    <clipPath id="waferAppClip"><ellipse cx="256" cy="250" rx="152" ry="144"/></clipPath>
  </defs>
  <ellipse cx="256" cy="410" rx="150" ry="28" fill="#020812" opacity="0.62" filter="url(#soft)"/>
  <g transform="rotate(-13 256 246)">
    <ellipse cx="256" cy="270" rx="156" ry="116" fill="#0A1A30"/>
    <ellipse cx="256" cy="267" rx="156" ry="116" fill="#1B3557" stroke="url(#metal)" stroke-width="4"/>
    <ellipse cx="256" cy="252" rx="156" ry="116" fill="url(#waferBase)"/>
    <ellipse cx="256" cy="252" rx="156" ry="116" fill="url(#waferTint)"/>
    <g clip-path="url(#waferAppClip)">
      ${Array.from({ length: 13 }, (_, i) => `<path d="M${256 - 156 + i * 26} 130v244" stroke="#BFE3FF" stroke-opacity="0.15" stroke-width="1.5"/>`).join("")}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M100 ${252 - 116 + i * 29}h312" stroke="#BFE3FF" stroke-opacity="0.15" stroke-width="1.5"/>`).join("")}
      <ellipse cx="176" cy="176" rx="150" ry="96" fill="url(#waferLight)"/>
      <path d="M126 246a130 96 0 0 1 96-92" stroke="#F4FCFF" stroke-opacity="0.6" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M386 246a130 96 0 0 1-30 76" stroke="#6FD9D2" stroke-opacity="0.4" stroke-width="8" fill="none" stroke-linecap="round"/>
    </g>
    <ellipse cx="256" cy="252" rx="156" ry="116" fill="none" stroke="url(#metal)" stroke-width="5"/>
    <ellipse cx="256" cy="252" rx="149" ry="109" fill="none" stroke="#9BE7FF" stroke-opacity="0.3" stroke-width="1.5"/>
  </g>
  <path d="M232 374h48l-24-22Z" fill="#0B1626"/>
  <path d="M238 372l18-16 18 16" fill="none" stroke="#9BB4D4" stroke-opacity="0.45" stroke-width="2" stroke-linejoin="round"/>
`;

const appIcon = svg("Silicon Dynasty", APP_ICON_BODY);

const FOREGROUND_BODY = `
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">
    ${APP_ICON_BODY}
  </g>
`;

const adaptiveForeground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Silicon Dynasty">
  <defs>${DEFS}</defs>
  ${FOREGROUND_BODY}
</svg>
`;

function showcase() {
  const card = (folder, id, en, ru, i) => `
    <article class="card" style="--d:${i * 18}ms">
      <div class="art"><img src="${folder}/${id}.svg" alt="${ru}" width="160" height="160"/></div>
      <div class="meta">
        <strong>${ru}</strong>
        <span>${en}</span>
        <code>${folder}/${id}.svg</code>
      </div>
    </article>`;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Silicon Dynasty — Art Pack</title>
<style>
  :root {
    --bg:#f4f7fb; --surface:#ffffff; --ink:#152338; --muted:#52627a; --line:#e5eaf1;
    --accent:#2563eb; --navy:#0c1728;
    font-family: "Segoe UI", Roboto, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); }
  header { padding:72px 32px 40px; text-align:center; background:
    radial-gradient(900px 420px at 50% -20%, #dbe8ff 0%, transparent 70%), var(--bg); }
  .brand { width:96px; height:96px; border-radius:24px; box-shadow:0 24px 60px rgb(12 23 40 / 22%); }
  h1 { margin:24px 0 8px; font-size:clamp(30px,5vw,46px); letter-spacing:-0.02em; }
  header p { margin:0 auto; max-width:640px; color:var(--muted); font-size:16px; line-height:1.6; }
  .wrap { max-width:1180px; margin:0 auto; padding:0 24px 80px; }
  h2 { font-size:20px; margin:56px 0 6px; letter-spacing:-0.01em; }
  .hint { color:var(--muted); font-size:14px; margin:0 0 22px; }
  .grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:14px;
    box-shadow:0 14px 40px rgb(23 43 77 / 5%); }
  .art { border-radius:14px; overflow:hidden; background:var(--navy); }
  .art img { display:block; width:100%; height:auto; }
  .meta { padding:12px 4px 2px; display:flex; flex-direction:column; gap:2px; }
  .meta strong { font-size:14px; }
  .meta span { font-size:12px; color:var(--muted); }
  .meta code { margin-top:6px; font-size:10px; color:#8794a8; word-break:break-all; }
  .sizes { display:flex; align-items:center; gap:24px; background:var(--surface); border:1px solid var(--line);
    border-radius:20px; padding:24px; margin-top:18px; flex-wrap:wrap; }
  .sizes img { border-radius:22%; box-shadow:0 10px 26px rgb(12 23 40 / 18%); }
  .sizes .big { margin-left:auto; color:var(--muted); font-size:13px; max-width:360px; line-height:1.6; }
  .dark { background:var(--navy); border-radius:24px; padding:26px; margin-top:18px; }
  .dark h2 { color:#eaf2ff; margin-top:0; }
  .dark .hint { color:#8ba2c1; }
  .dark .card { background:#122036; border-color:#22344f; box-shadow:none; }
  .dark .meta strong { color:#eff4fc; }
  .dark .meta span { color:#93a7c2; }
  .dark .meta code { color:#5d7c9c; }
  .palette { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
  .swatch { border-radius:12px; padding:14px 16px; min-width:130px; color:#fff; font-size:12px; font-weight:600; }
  footer { text-align:center; color:var(--muted); font-size:13px; padding:0 24px 60px; }
  @keyframes rise { from { opacity:0; transform:translateY(10px); } }
  @media (prefers-reduced-motion: reduce) { .card { animation:none; } }
</style>
</head>
<body>
<header>
  <img class="brand" src="brand/app-icon.svg" alt="Silicon Dynasty"/>
  <h1>Silicon Dynasty — Art Pack</h1>
  <p>Единая система эмблем: глубокий нави, стекло, титан и электрический синий. 18 разделов, 8 ресурсов, бренд-иконка и сплэш. Вектор, 512×512, прозрачность не требуется.</p>
</header>
<div class="wrap">
  <div class="sizes">
    <img src="brand/app-icon.svg" width="88" height="88" alt=""/>
    <img src="brand/app-icon.svg" width="56" height="56" alt=""/>
    <img src="brand/app-icon.svg" width="36" height="36" alt=""/>
    <div class="big">Иконки читаются и в 36 px: силуэт, контраст и свечение сохраняются. Для UI используйте Lucide по спецификации, эмблемы — для карточек, меню и витрин.</div>
  </div>

  <h2>Разделы</h2>
  <p class="hint">18 эмблем для экранов и карточек навигации.</p>
  <div class="grid">
    ${SECTION_META.map(([id, en, ru], i) => card("sections", id, en, ru, i)).join("")}
  </div>

  <h2>Ресурсы и товары</h2>
  <p class="hint">8 иконок производственной цепочки: от поликремния до сервера.</p>
  <div class="grid">
    ${RESOURCE_META.map(([id, en, ru], i) => card("resources", id, en, ru, i + 18)).join("")}
  </div>

  <div class="dark">
    <h2>Тёмная тема</h2>
    <p class="hint">Эмблемы самодостаточны и не зависят от темы интерфейса.</p>
    <div class="grid">
      ${SECTION_META.slice(0, 4).map(([id, en, ru], i) => card("sections", id, en, ru, i)).join("")}
      ${RESOURCE_META.slice(0, 4).map(([id, en, ru], i) => card("resources", id, en, ru, i + 2)).join("")}
    </div>
  </div>

  <h2>Палитра</h2>
  <div class="palette">
    <div class="swatch" style="background:#0c1728">#0C1728 · база</div>
    <div class="swatch" style="background:#1b3050">#1B3050 · нави</div>
    <div class="swatch" style="background:#2563eb">#2563EB · акцент</div>
    <div class="swatch" style="background:#57a8ff">#57A8FF · свет</div>
    <div class="swatch" style="background:#9be7ff;color:#0c1728">#9BE7FF · блик</div>
    <div class="swatch" style="background:#e39a52">#E39A52 · медь</div>
    <div class="swatch" style="background:#7df0c0;color:#0c1728">#7DF0C0 · сигнал</div>
  </div>
</div>
<footer>Silicon Dynasty · art pack · SVG 512×512 · сгенерировано локально</footer>
</body>
</html>`;
}

mkdirSync(join(ART, "sections"), { recursive: true });
mkdirSync(join(ART, "resources"), { recursive: true });
mkdirSync(join(ART, "brand"), { recursive: true });

for (const [id, en, ru] of SECTION_META) {
  writeFileSync(join(ART, "sections", `${id}.svg`), svg(`${ru} — ${en}`, BODIES[id]()));
}
for (const [id, en, ru] of RESOURCE_META) {
  writeFileSync(join(ART, "resources", `${id}.svg`), svg(`${ru} — ${en}`, RESOURCES[id]()));
}
writeFileSync(join(ART, "brand", "app-icon.svg"), appIcon);
writeFileSync(join(ART, "brand", "adaptive-foreground.svg"), adaptiveForeground);
writeFileSync(join(ART, "index.html"), showcase());

console.log(`Wrote ${SECTION_META.length} sections, ${RESOURCE_META.length} resources, brand icon and showcase.`);
