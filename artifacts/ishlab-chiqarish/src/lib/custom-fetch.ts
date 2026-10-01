const getToken = () => localStorage.getItem("token");

export default async function customFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const hasFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(hasFormData ? {} : { "Content-Type": "application/json" }),
    // Web klient — serverda faqat admin uchun ruxsat etilgan endpointlar bor.
    "X-Client": "web",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    // JSON {"error":"..."} bo'lsa — faqat xabar matnini tashlaymiz.
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.error === "string" && parsed.error) message = parsed.error;
    } catch {}
    throw new Error(message);
  }
  return res;
}
