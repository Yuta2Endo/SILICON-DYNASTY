/* global console, process, document */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ART = join(ROOT, "public", "art");
const RES = join(ROOT, "android", "app", "src", "main", "res");
const ICONS = join(ROOT, "public", "icons");

const appIconSvg = readFileSync(join(ART, "brand", "app-icon.svg"), "utf8");
const roundIconSvg = readFileSync(join(ART, "brand", "app-icon-round.svg"), "utf8");
const foregroundSvg = readFileSync(join(ART, "brand", "adaptive-foreground.svg"), "utf8");
const fontBase64 = readFileSync(
  join(ROOT, "node_modules", "@fontsource-variable", "manrope", "files", "manrope-latin-wght-normal.woff2"),
).toString("base64");

const ICON_PAGE = `<!doctype html><html><head><meta charset="utf-8"/><style>
  html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}
  svg{display:block;width:100%;height:100%}
</style></head><body>__SVG__</body></html>`;

const LAUNCHERS = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];

const FOREGROUNDS = [
  ["mipmap-mdpi", 108],
  ["mipmap-hdpi", 162],
  ["mipmap-xhdpi", 216],
  ["mipmap-xxhdpi", 324],
  ["mipmap-xxxhdpi", 432],
];

const SPLASHES = [
  ["drawable/splash.png", 480, 320],
  ["drawable-land-mdpi/splash.png", 480, 320],
  ["drawable-land-hdpi/splash.png", 800, 480],
  ["drawable-land-xhdpi/splash.png", 1280, 720],
  ["drawable-land-xxhdpi/splash.png", 1600, 960],
  ["drawable-land-xxxhdpi/splash.png", 1920, 1280],
  ["drawable-port-mdpi/splash.png", 320, 480],
  ["drawable-port-hdpi/splash.png", 480, 800],
  ["drawable-port-xhdpi/splash.png", 720, 1280],
  ["drawable-port-xxhdpi/splash.png", 960, 1600],
  ["drawable-port-xxxhdpi/splash.png", 1280, 1920],
];

function splashHtml(width, height) {
  const min = Math.min(width, height);
  const icon = Math.round(min * 0.24);
  const title = Math.max(15, Math.min(64, Math.round(min * 0.048)));
  const tagline = Math.max(8, Math.min(20, Math.round(title * 0.36)));
  const gap = Math.round(icon * 0.22);
  const divider = Math.round(icon * 0.6);

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
  @font-face {
    font-family: Manrope;
    src: url(data:font/woff2;base64,${fontBase64}) format("woff2");
    font-weight: 200 800;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
  body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(120% 80% at 50% 38%, #ffffff 0%, #f2f7ff 42%, #e7effb 100%);
    font-family: Manrope, "Segoe UI", Roboto, sans-serif;
    color: #152338;
  }
  .glow {
    position: absolute;
    width: ${icon * 2.2}px;
    height: ${icon * 2.2}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.16) 0%, rgba(37, 99, 235, 0.05) 45%, transparent 70%);
  }
  .stack { position: relative; display: flex; flex-direction: column; align-items: center; }
  .icon {
    width: ${icon}px;
    height: ${icon}px;
    filter: drop-shadow(0 ${Math.round(icon * 0.14)}px ${Math.round(icon * 0.3)}px rgba(12, 23, 40, 0.24));
  }
  .icon svg { display: block; width: 100%; height: 100%; }
  h1 {
    margin: ${gap}px 0 0;
    font-size: ${title}px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: 0.16em;
    text-indent: 0.16em;
    white-space: nowrap;
  }
  .rule {
    width: ${divider}px;
    height: 1px;
    margin: ${Math.round(gap * 0.42)}px 0 ${Math.round(gap * 0.3)}px;
    background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.45), transparent);
  }
  p {
    margin: 0;
    font-size: ${tagline}px;
    font-weight: 600;
    letter-spacing: 0.34em;
    text-indent: 0.34em;
    color: #52627a;
    white-space: nowrap;
  }
</style></head><body>
  <div class="glow"></div>
  <div class="stack">
    <div class="icon">${appIconSvg}</div>
    <h1>SILICON DYNASTY</h1>
    <div class="rule"></div>
    <p>TECHNOLOGY TYCOON</p>
  </div>
</body></html>`;
}

const maskableHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0c1728}
  .wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  .mark{width:100%;height:100%}
  .mark svg{display:block;width:100%;height:100%}
</style></head><body><div class="wrap"><div class="mark">${foregroundSvg}</div></div></body></html>`;

async function main() {
  mkdirSync(ICONS, { recursive: true });
  for (const [folder] of LAUNCHERS) mkdirSync(join(RES, folder), { recursive: true });
  for (const [folder] of FOREGROUNDS) mkdirSync(join(RES, folder), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  async function renderSvg(svg, size, out, transparent = true) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(ICON_PAGE.replace("__SVG__", svg), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, omitBackground: transparent });
  }

  async function renderHtml(html, width, height, out) {
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out });
  }

  for (const [folder, size] of LAUNCHERS) {
    await renderSvg(appIconSvg, size, join(RES, folder, "ic_launcher.png"));
    await renderSvg(roundIconSvg, size, join(RES, folder, "ic_launcher_round.png"));
    console.log(`launcher ${folder} ${size}px`);
  }

  for (const [folder, size] of FOREGROUNDS) {
    await renderSvg(foregroundSvg, size, join(RES, folder, "ic_launcher_foreground.png"));
    console.log(`foreground ${folder} ${size}px`);
  }

  for (const [rel, width, height] of SPLASHES) {
    const out = join(RES, rel);
    mkdirSync(dirname(out), { recursive: true });
    await renderHtml(splashHtml(width, height), width, height, out);
    console.log(`splash ${rel} ${width}x${height}`);
  }

  await renderSvg(appIconSvg, 512, join(ICONS, "icon-512.png"));
  await renderSvg(appIconSvg, 192, join(ICONS, "icon-192.png"));
  await renderHtml(maskableHtml, 180, 180, join(ICONS, "apple-touch-icon.png"));
  await renderHtml(maskableHtml, 512, 512, join(ICONS, "icon-maskable-512.png"));
  writeFileSync(join(ROOT, "public", "favicon.svg"), appIconSvg);

  await browser.close();
  console.log("Art assets rendered.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
