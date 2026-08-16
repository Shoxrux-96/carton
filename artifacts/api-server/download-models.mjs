import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, "models");
fs.mkdirSync(modelsDir, { recursive: true });

const baseUrl = "https://github.com/vladmandic/face-api/raw/master/model";
const files = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
];

for (const file of files) {
  const dest = path.join(modelsDir, file);
  if (fs.existsSync(dest)) { console.log(`Already exists: ${file}`); continue; }
  console.log(`Downloading ${file}...`);
  const res = await fetch(`${baseUrl}/${file}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`  Done (${buf.length} bytes)`);
}
console.log("All models downloaded!");
