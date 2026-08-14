import { extractDescriptor } from "./face.js";

export async function processEmployeePhoto(photo?: string | null): Promise<{
  faceImage?: string | null;
  faceDescriptor?: string | null;
  faceError?: string;
}> {
  if (!photo) return {};

  if (!photo.startsWith("data:")) {
    return { faceImage: photo };
  }

  const base64 = photo.split(",")[1];
  if (!base64) {
    return { faceError: "Rasm formati noto'g'ri" };
  }

  const buffer = Buffer.from(base64, "base64");
  const descriptor = await extractDescriptor(buffer);

  if (!descriptor) {
    return {
      faceImage: photo,
      faceError: "Yuz aniqlanmadi. Aniq yuz ko'rinadigan 3×4 rasm yuklang",
    };
  }

  return {
    faceImage: photo,
    faceDescriptor: JSON.stringify(descriptor),
  };
}
