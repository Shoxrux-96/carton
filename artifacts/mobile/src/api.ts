import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://192.168.1.8:3003/api";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem("token", token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
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
  formData: FormData
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
    if (e.name === "AbortError") throw new Error("Serverdan javob kelmadi (30s)");
    if (e.message === "Network request failed") throw new Error("Serverga ulanib bo'lmadi. Wi-Fi yoki server manzilini tekshiring");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
