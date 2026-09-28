import { readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(join(root, "assets/cloie-logo.svg"), "utf8");
const temporary = mkdtempSync(join(tmpdir(), "system-cloie-icons-"));

function iconSvg(markHeight) {
  const markWidth = (markHeight * 442) / 500;
  const artwork = source.replace(
    /<svg\s+width="442"\s+height="500"/,
    `<svg x="${(512 - markWidth) / 2}" y="${(512 - markHeight) / 2}" width="${markWidth}" height="${markHeight}"`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#FFFFFF"/>${artwork}</svg>\n`;
}

function rasterize(input, size, output) {
  execFileSync("magick", [
    "-background",
    "white",
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
  copyFileSync(join(root, "assets/cloie-logo.svg"), join(root, "public/logos/cloie-logo.svg"));
  const regular = join(root, "src/app/icon.svg");
  writeFileSync(regular, iconSvg(416));
  for (const size of [192, 512]) {
    rasterize(regular, size, join(root, `public/icons/icon-${size}.png`));
  }
  rasterize(regular, 180, join(root, "src/app/apple-icon.png"));

  // The full rectangular artwork fits inside the maskable icon's 80% safe circle.
  const maskable = join(temporary, "maskable.svg");
  writeFileSync(maskable, iconSvg(300));
  rasterize(maskable, 512, join(root, "public/icons/icon-512-maskable.png"));

  const favicon = join(temporary, "favicon.png");
  rasterize(regular, 256, favicon);
  execFileSync("magick", [
    favicon,
    "-define",
    "icon:auto-resize=48,32,16",
    join(root, "src/app/favicon.ico"),
  ]);
  console.log("Generated System CLOIE logos, favicon, Apple touch icon, and PWA icons.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
