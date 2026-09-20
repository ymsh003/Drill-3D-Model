import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(here, "..", "tmp", "pdfs");
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

for (const file of files) {
  const input = path.join(sourceDir, file);
  const output = path.join(sourceDir, file.replace(/\.png$/i, "-hires.png"));
  const metadata = await sharp(input).metadata();
  await sharp(input)
    .resize({
      width: metadata.width * 3,
      height: metadata.height * 3,
      kernel: sharp.kernel.lanczos3
    })
    .sharpen({ sigma: 0.8, m1: 0.7, m2: 1.2 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  console.log(`${path.basename(output)}: ${metadata.width * 3}x${metadata.height * 3}`);
}
