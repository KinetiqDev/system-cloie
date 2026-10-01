import { readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(join(root, "assets/cloie-logo.svg"), "utf8");
const openingTag = source.match(/<svg\b[^>]*>/)?.[0];
const viewBox = openingTag?.match(/\bviewBox\s*=\s*(["'])(.*?)\1/)?.[2];
if (!openingTag || viewBox?.trim().split(/\s+/).join(" ") !== "0 0 442 500") {
  throw new Error(
    "Expected the System CLOIE source SVG viewBox to be 0 0 442 500. Update logo dimensions in consumers before generating a differently sized mark."
  );
}
const rootAttributes = openingTag
  .slice(4, -1)
  .replace(/\s+(?:width|height|x|y)\s*=\s*(["']).*?\1/g, "");
const temporary = mkdtempSync(join(tmpdir(), "system-cloie-icons-"));
const outputs = [
  "public/logos/cloie-logo.svg",
  "src/app/icon.svg",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "src/app/apple-icon.png",
  "public/icons/icon-512-maskable.png",
  "src/app/favicon.ico",
];
const staged = (path) => join(temporary, path.replaceAll("/", "-"));

// The mark rides a white coin — a circular plate, matching the in-app logo
// treatment — never a rectangular frame.
function iconSvg(markHeight) {
  const markWidth = (markHeight * 442) / 500;
  const artwork = source.replace(
    openingTag,
    `<svg x="${(512 - markWidth) / 2}" y="${(512 - markHeight) / 2}" width="${markWidth}" height="${markHeight}"${rootAttributes}>`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#FFFFFF"/>${artwork}</svg>\n`;
}

function rasterize(input, size, output, background = "none") {
  execFileSync("magick", [
    "-background",
    background,
    "-density",
    "384",
    input,
    "-resize",
    `${size}x${size}`,
    "-strip",
    output,
  ]);
}

try {
  writeFileSync(staged("public/logos/cloie-logo.svg"), source);
  const regular = staged("src/app/icon.svg");
  writeFileSync(regular, iconSvg(400));
  // Transparent corners let the coin read as a circle in dark tab strips and
  // OS chrome; Apple touch icons and the maskable tile must stay opaque.
  for (const size of [192, 512]) {
    rasterize(regular, size, staged(`public/icons/icon-${size}.png`));
  }
  rasterize(regular, 180, staged("src/app/apple-icon.png"), "white");

  // The full rectangular artwork fits inside the maskable icon's 80% safe circle.
  const maskable = join(temporary, "maskable.svg");
  writeFileSync(maskable, iconSvg(300));
  rasterize(maskable, 512, staged("public/icons/icon-512-maskable.png"), "white");

  const favicon = join(temporary, "favicon.png");
  rasterize(regular, 256, favicon);
  execFileSync("magick", [
    favicon,
    "-define",
    "icon:auto-resize=48,32,16",
    staged("src/app/favicon.ico"),
  ]);
  for (const output of outputs) copyFileSync(staged(output), join(root, output));
  console.log("Generated System CLOIE logos, favicon, Apple touch icon, and PWA icons.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
