const KEY = "fg-auth";
export interface AuthUser { email: string; name: string }

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch { return null; }
}
export function setAuth(u: AuthUser) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(u));
}
export function clearAuth() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
