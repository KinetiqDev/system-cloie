import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repository = resolve(__dirname, "../../..");
const fixtures: string[] = [];
const outputs = [
  "public/logos/cloie-logo.svg",
  "src/app/icon.svg",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "src/app/apple-icon.png",
  "public/icons/icon-512-maskable.png",
  "src/app/favicon.ico",
];

function fixture(source: string, failConversion = false) {
  const root = mkdtempSync(join(tmpdir(), "system-cloie-brand-test-"));
  fixtures.push(root);
  for (const directory of ["scripts", "assets", "public/logos", "public/icons", "src/app", "bin"]) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  copyFileSync(
    join(repository, "scripts/generate-brand-icons.mjs"),
    join(root, "scripts/generate-brand-icons.mjs")
  );
  writeFileSync(join(root, "assets/cloie-logo.svg"), source);
  for (const output of outputs) writeFileSync(join(root, output), "previous asset");
  writeFileSync(
    join(root, "bin/magick"),
    failConversion
      ? "#!/bin/sh\nexit 1\n"
      : '#!/bin/sh\nfor output; do :; done\nprintf "converted" > "$output"\n',
    { mode: 0o755 }
  );
  return root;
}

function generate(root: string) {
  return execFileSync(process.execPath, [join(root, "scripts/generate-brand-icons.mjs")], {
    env: { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}` },
    stdio: "pipe",
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("brand icon generation", () => {
  it("positions the supplied mark regardless of root attribute ordering and formatting", () => {
    const source =
      "<svg xmlns='http://www.w3.org/2000/svg' height='500' viewBox='0 0 442 500' width='442'><path fill='#212160' d='M0 0h442v500H0z'/></svg>";
    const root = fixture(source);
    generate(root);
    const icon = readFileSync(join(root, "src/app/icon.svg"), "utf8");
    const placement = icon.match(/<svg x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
    expect(placement).not.toBeNull();
    expect(Number(placement![1])).toBeCloseTo(72.128);
    expect(placement!.slice(2)).toEqual(["48", "367.744", "416"]);
    expect(icon).not.toContain("height='500'");
    expect(readFileSync(join(root, "public/logos/cloie-logo.svg"), "utf8")).toBe(source);
  });

  it("leaves all published assets unchanged if a conversion fails", () => {
    const root = fixture(readFileSync(join(repository, "assets/cloie-logo.svg"), "utf8"), true);
    expect(() => generate(root)).toThrow();
    for (const output of outputs)
      expect(readFileSync(join(root, output), "utf8")).toBe("previous asset");
  });

  it("rejects changed source dimensions before publishing instead of silently misplacing the mark", () => {
    const root = fixture("<svg width='100' height='100' viewBox='0 0 100 100'></svg>");
    expect(() => generate(root)).toThrow(/442.*500/);
    for (const output of outputs)
      expect(readFileSync(join(root, output), "utf8")).toBe("previous asset");
  });
});
