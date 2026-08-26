import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Standalone (APK) builds pin the backend to EXPO_PUBLIC_API_URL.
// In dev (Expo Go / Metro) we fall back to the packager host so LAN and
// physical devices work without extra config.
const envBase = process.env.EXPO_PUBLIC_API_URL;

const VPS_API = "https://shovotcarton.uz/api";

let host = "10.0.2.2";
try {
  if (!envBase) {
    const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig || {};
    const debuggerHost = manifest.debuggerHost || manifest.hostUri || manifest.packagerOpts?.host || null;
    if (debuggerHost) {
      host = String(debuggerHost).split(":" )[0];
    }
  }
} catch (e) {
  // ignore and use default
}

const API_BASE = envBase || VPS_API;

export { API_BASE };

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem("token", token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
  await AsyncStorage.removeItem("employeeFaceImage");
}

export async function getUser(): Promise<any | null> {
  const raw = await AsyncStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function setUser(user: any): Promise<void> {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  return user?.role === "admin";
}

export async function getUserRole(): Promise<string | null> {
  const user = await getUser();
  return user?.role || null;
}

export async function isOwner(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin" || role === "owner";
}

export async function isDriver(): Promise<boolean> {
  const role = await getUserRole();
  return role === "driver";
}

export async function isEmployee(): Promise<boolean> {
  const role = await getUserRole();
  return role === "employee" || role === "user" || (!role);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function apiFetchFormData<T = any>(
  path: string,
  formData: FormData,
  timeoutMs = 30000,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
      headers,
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error(`Serverdan javob kelmadi (${Math.round(timeoutMs / 1000)}s)`);
    if (e.message === "Network request failed") throw new Error("Serverga ulanib bo'lmadi. Wi-Fi yoki server manzilini tekshiring");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// Report client-side errors to the server log (fire-and-forget, never throws).
export async function logClientError(
  message: string,
  context?: Record<string, any>,
  stack?: string,
): Promise<void> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    await fetch(`${API_BASE}/client-log`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, context: context ?? null, stack: stack ?? null, app: "mobile" }),
    }).catch(() => {});
  } catch {}
}
