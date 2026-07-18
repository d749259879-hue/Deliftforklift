import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const target = process.argv[2] || "public";
const root = resolve(process.cwd(), target);
const requiredFiles = [
  "assets/delift-logo.png",
  "assets/showroom-background-3d-v1.png",
  "assets/forklift-3d/delift-forklift.glb",
  "assets/company/warehouse-01.png",
];

function countImages(directory) {
  if (!existsSync(directory)) return 0;
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) count += countImages(path);
    else if (/\.(?:avif|jpe?g|png|webp)$/i.test(entry.name) && statSync(path).size > 0) count += 1;
  }
  return count;
}

const missing = requiredFiles.filter((path) => !existsSync(resolve(root, path)));
const catalogImageCount = countImages(resolve(root, "assets/catalog-cells"));

if (missing.length || catalogImageCount < 3900) {
  console.error(JSON.stringify({
    status: "FAIL",
    target,
    missing,
    catalogImageCount,
    minimumCatalogImageCount: 3900,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "PASS",
  target,
  catalogImageCount,
}, null, 2));
