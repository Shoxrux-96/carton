import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, getUser, setUser } from "../api";

const FACE_IMAGE_KEY = "employeeFaceImage";
const FACE_IMAGE_HASH_KEY = "employeeFaceImageHash";

export function normalizePhone(phone?: string | null) {
  return (phone || "").replace(/[\s+\-()]/g, "");
}

export async function getCachedFaceImage(): Promise<string | null> {
  return AsyncStorage.getItem(FACE_IMAGE_KEY);
}

export async function clearCachedFaceImage(): Promise<void> {
  await AsyncStorage.removeItem(FACE_IMAGE_KEY);
  await AsyncStorage.removeItem(FACE_IMAGE_HASH_KEY);
}

function findMyEmployee(employees: any[], userPhone?: string | null) {
  const phone = normalizePhone(userPhone);
  if (!phone || !Array.isArray(employees)) return null;
  return employees.find((e) =>
    normalizePhone(e.loginPhone) === phone || normalizePhone(e.phone) === phone
  ) ?? null;
}

export function faceImageKey(faceImage?: string | null) {
  if (!faceImage) return "no-face";
  const start = faceImage.slice(0, 48);
  const end = faceImage.slice(-48);
  return `${faceImage.length}:${start}:${end}`;
}

export async function syncUserProfile(): Promise<any | null> {
  const current = await getUser();
  if (!current) return null;

  try {
    const profile = await apiFetch("/auth/profile");
    let faceImage = profile.faceImage ?? null;
    let name = profile.name ?? current.name ?? null;
    let position = profile.position ?? current.position ?? null;
    let employeeId = profile.employeeId ?? null;

    try {
      const employees = await apiFetch("/employees");
      const me = findMyEmployee(employees, profile.phone || current.phone);
      if (me) {
        faceImage = me.faceImage ?? faceImage;
        name = me.name ?? name;
        position = me.position ?? position;
        employeeId = me.id ?? employeeId;
      }
    } catch {}

    const merged = {
      ...current,
      id: profile.id ?? current.id,
      phone: profile.phone ?? current.phone,
      role: profile.role ?? current.role,
      name,
      position,
      employeeId,
      faceImage,
    };

    const { faceImage: photo, ...userToStore } = merged;
    await setUser(userToStore);

    const nextHash = faceImageKey(photo);
    const prevHash = await AsyncStorage.getItem(FACE_IMAGE_HASH_KEY);
    if (photo) {
      if (prevHash !== nextHash) {
        await AsyncStorage.setItem(FACE_IMAGE_KEY, photo);
        await AsyncStorage.setItem(FACE_IMAGE_HASH_KEY, nextHash);
      }
    } else {
      await AsyncStorage.removeItem(FACE_IMAGE_KEY);
      await AsyncStorage.removeItem(FACE_IMAGE_HASH_KEY);
    }

    return merged;
  } catch {
    const faceImage = await getCachedFaceImage();
    return faceImage ? { ...current, faceImage } : current;
  }
}
