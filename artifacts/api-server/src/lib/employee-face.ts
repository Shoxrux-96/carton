import { extractDescriptor } from "./face.js";

// notes ichidagi faceError qo'shimchasini olib tashlaydi (qayta yuklashda tozalash).
export function stripFaceError(notes?: string | null): string {
  return (notes || "").replace(/\s*faceError:[^\n]*/g, "").trim();
}

// Mavjud notes + faceError xatosini xavfsiz birlashtiradi (notes bosib yuborilmaydi).
export function withFaceError(notes: string | null | undefined, error: string): string {
  const base = stripFaceError(notes);
  return base ? `${base} faceError:${error}` : `faceError:${error}`;
}

export async function processEmployeePhoto(photo?: string | null): Promise<{
  faceImage?: string | null;
  faceDescriptor?: string | null;
  faceError?: string;
}> {
  if (!photo) return {};

  if (!photo.startsWith("data:")) {
    // Data-URL emas — face-api qayta ishlay olmaydi. Uni yillar davomida
    // qayta-qayta urinish hisoblashga sarflamaslik uchun xato sifatida yozamiz.
    return { faceError: "Rasm formati noto'g'ri (data-URL kutilgan)" };
  }

  const base64 = photo.split(",")[1];
  if (!base64) {
    return { faceError: "Rasm formati noto'g'ri" };
  }

  const buffer = Buffer.from(base64, "base64");
  try {
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
  } catch (err: any) {
    // If face-api or tfjs fails (version mismatch or runtime error), don't block the update.
    // Save the image so the user can still upload photos; leave descriptor absent.
    return {
      faceImage: photo,
      faceError: typeof err === 'string' ? err : err?.message ?? 'Face processing failed',
    };
  }
}
