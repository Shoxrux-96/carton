import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, getUser, setUser } from "../api";

const FACE_IMAGE_KEY = "employeeFaceImage";

export function normalizePhone(phone?: string | null) {
  return (phone || "").replace(/[\s+\-()]/g, "");
}

export async function getCachedFaceImage(): Promise<string | null> {
  return AsyncStorage.getItem(FACE_IMAGE_KEY);
}

export async function clearCachedFaceImage(): Promise<void> {
  await AsyncStorage.removeItem(FACE_IMAGE_KEY);
}

export async function syncUserProfile(): Promise<any | null> {
  const current = await getUser();
  if (!current) return null;

  try {
    const profile = await apiFetch("/auth/profile");
    const merged = {
      ...current,
      id: profile.id ?? current.id,
      phone: profile.phone ?? current.phone,
      role: profile.role ?? current.role,
      name: profile.name ?? current.name ?? null,
      position: profile.position ?? current.position ?? null,
      employeeId: profile.employeeId ?? null,
      faceImage: profile.faceImage ?? null,
    };

    const { faceImage, ...userToStore } = merged;
    await setUser(userToStore);

    if (faceImage) {
      await AsyncStorage.setItem(FACE_IMAGE_KEY, faceImage);
    } else {
      await AsyncStorage.removeItem(FACE_IMAGE_KEY);
    }

    return merged;
  } catch {
    const faceImage = await getCachedFaceImage();
    return faceImage ? { ...current, faceImage } : current;
  }
}

export function faceImageKey(faceImage?: string | null) {
  if (!faceImage) return "no-face";
  return String(faceImage.length) + faceImage.slice(-24);
}
