import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDir = path.join(projectRoot, "tmp", "pdfs");
const files = [
  "model-overview-45-35-45.png",
  "model-drill-20.png",
  "model-drill-80.png",
  "model-pin-15.png",
  "model-pin-35.png",
  "model-pin-55.png",
  "model-val-20.png",
  "model-val-70.png"
];

// The export-only browser mode places the pure canvas preview in the left viewer.
// Crop that viewer so each artifact is a self-contained model image with no UI.
const crop = { x: 10, y: 0, width: 858, height: 610 };

for (const file of files) {
  const filePath = path.join(imageDir, file);
  const image = await loadImage(filePath);
  if (image.width < crop.x + crop.width || image.height < crop.y + crop.height) {
    throw new Error(`${file}: source image is too small (${image.width}x${image.height})`);
  }
  const canvas = createCanvas(crop.width, crop.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#06161a";
  ctx.fillRect(0, 0, crop.width, crop.height);
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
}

console.log(`cropped ${files.length} model images to ${crop.width}x${crop.height}`);
