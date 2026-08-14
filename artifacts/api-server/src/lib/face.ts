import * as faceapi from "@vladmandic/face-api";
import canvas from "canvas";
import path from "path";
import fs from "fs";

const { Canvas, Image, ImageData, loadImage } = canvas;
const MODEL_PATH = path.join(process.cwd(), "models");

let initialized = false;

export async function initFaceApi() {
  if (initialized) return;

  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

  initialized = true;
  console.log("[FaceAPI] Models loaded");
}

export interface EyeAnalysis {
  faceDetected: boolean;
  leftEyeOpen: number;
  rightEyeOpen: number;
  boundsX: number;
  boundsY: number;
  boundsW: number;
  boundsH: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(points: { x: number; y: number }[]) {
  const vertical1 = dist(points[1], points[5]);
  const vertical2 = dist(points[2], points[4]);
  const horizontal = dist(points[0], points[3]);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

function earToOpenProbability(ear: number) {
  const closed = 0.16;
  const open = 0.28;
  return Math.max(0, Math.min(1, (ear - closed) / (open - closed)));
}

export async function analyzeEyeState(imageBuffer: Buffer): Promise<EyeAnalysis | null> {
  await initFaceApi();

  const img = await loadImage(imageBuffer);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();
  if (!detection) return null;

  const leftEye = detection.landmarks.getLeftEye();
  const rightEye = detection.landmarks.getRightEye();
  const box = detection.detection.box;

  return {
    faceDetected: true,
    leftEyeOpen: earToOpenProbability(eyeAspectRatio(leftEye)),
    rightEyeOpen: earToOpenProbability(eyeAspectRatio(rightEye)),
    boundsX: box.x,
    boundsY: box.y,
    boundsW: box.width,
    boundsH: box.height,
  };
}

export async function extractDescriptor(imageBuffer: Buffer): Promise<number[] | null> {
  await initFaceApi();

  const img = await loadImage(imageBuffer);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

export async function findBestMatch(
  imageBuffer: Buffer,
  knownDescriptors: { employeeId: number; descriptor: number[]; name: string }[]
): Promise<{ employeeId: number; name: string; distance: number } | null> {
  await initFaceApi();

  const img = await loadImage(imageBuffer);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  const queryDescriptor = Float32Array.from(detection.descriptor);
  const labeledDescriptors = knownDescriptors.map((kd) => {
    const d = kd.descriptor instanceof Float32Array
      ? kd.descriptor
      : Float32Array.from(kd.descriptor);
    return new faceapi.LabeledFaceDescriptors(kd.name, [d]);
  });

  if (labeledDescriptors.length === 0) return null;

  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  const bestMatch = faceMatcher.findBestMatch(queryDescriptor);

  if (bestMatch.label === "unknown") return null;

  const matched = knownDescriptors.find((kd) => kd.name === bestMatch.label);
  if (!matched) return null;

  return {
    employeeId: matched.employeeId,
    name: matched.name,
    distance: bestMatch.distance,
  };
}

export async function downloadModels() {
  const modelsUrl = "https://github.com/vladmandic/face-api/raw/master/model";
  const modelFiles = [
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model.bin",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model.bin",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model.bin",
  ];

  fs.mkdirSync(MODEL_PATH, { recursive: true });

  for (const file of modelFiles) {
    const dest = path.join(MODEL_PATH, file);
    if (fs.existsSync(dest)) continue;
    console.log(`Downloading ${file}...`);
    const res = await fetch(`${modelsUrl}/${file}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
  }
  console.log("[FaceAPI] All models downloaded");
}

if (process.argv[2] === "download-models") {
  downloadModels().then(() => process.exit(0));
}
