import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path));

function sourceFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe("System CLOIE brand assets", () => {
  it("serves the supplied vector artwork without changing it", () => {
    expect(read("public/logos/cloie-logo.svg")).toEqual(read("assets/cloie-logo.svg"));
    expect(read("public/logos/cloie-logo.svg").toString()).toContain('viewBox="0 0 442 500"');
    expect(existsSync(resolve(root, "public/logos/cloie-logo.png"))).toBe(false);
  });

  it("uses the SVG and its native dimensions everywhere the product mark is rendered", () => {
    const consumers = ["src/app", "src/components", "src/features"]
      .flatMap(sourceFiles)
      .filter((path) => read(path).toString().includes("/logos/cloie-logo."));
    expect(consumers.length).toBeGreaterThan(0);
    for (const path of consumers) {
      const source = read(path).toString();
      expect(source, path).not.toContain("/logos/cloie-logo.png");
      for (const image of source.matchAll(/<Image\s[\s\S]*?\/>/g)) {
        if (!image[0].includes("/logos/cloie-logo.svg")) continue;
        expect(image[0], path).toContain("width={442}");
        expect(image[0], path).toContain("height={500}");
        expect(image[0], path).toContain('alt="System CLOIE"');
      }
    }
  });

  it("provides square install icons and an Apple touch icon at the declared sizes", () => {
    const appManifest = manifest();
    expect(appManifest.short_name).toBe("System CLOIE");
    for (const icon of appManifest.icons ?? []) {
      const image = read(`public${icon.src}`);
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect(`${image.readUInt32BE(16)}x${image.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    const apple = read("src/app/apple-icon.png");
    expect([apple.readUInt32BE(16), apple.readUInt32BE(20)]).toEqual([180, 180]);
  });

  it("provides a scalable tab icon and 16, 32, and 48 pixel favicon fallbacks", () => {
    expect(read("src/app/icon.svg").toString()).toContain('viewBox="0 0 512 512"');
    expect(existsSync(resolve(root, "src/app/icon.png"))).toBe(false);
    const ico = read("src/app/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1);
    const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
      const offset = 6 + index * 16;
      return [ico[offset], ico[offset + 1]];
    });
    expect(sizes).toEqual(
      expect.arrayContaining([
        [16, 16],
        [32, 32],
        [48, 48],
      ])
    );
  });
});
