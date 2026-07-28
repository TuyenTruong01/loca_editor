export type AuthUser = { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> };
export type AuthSession = { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user: AuthUser };

const url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const storageKey = "loca-editor-auth-session";

function configured() { return Boolean(url && key); }
async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!configured()) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Không thể xác thực tài khoản.");
  return data as T;
}

function normalize(session: AuthSession): AuthSession {
  if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  return session;
}

export function readStoredSession(): AuthSession | null {
  try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) as AuthSession : null; } catch { return null; }
}
export function readRecoverySession(): AuthSession | null {
  if (!window.location.hash.includes("type=recovery")) return null;
  const params = new URLSearchParams(window.location.hash.slice(1)); const access_token = params.get("access_token"); const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  const expires_in = Number(params.get("expires_in") || 3600); const session: AuthSession = { access_token, refresh_token, expires_in, expires_at: Math.floor(Date.now() / 1000) + expires_in, user: { id: "" } };
  store(session); return session;
}
function store(session: AuthSession | null) { if (session) localStorage.setItem(storageKey, JSON.stringify(normalize(session))); else localStorage.removeItem(storageKey); }

export async function signIn(email: string, password: string) {
  const session = normalize(await request<AuthSession>("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })); store(session); return session;
}
export async function refreshSession(refreshToken: string) {
  const session = normalize(await request<AuthSession>("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) })); store(session); return session;
}
export async function updatePassword(token: string, password: string) { return request<AuthUser>("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) }, token); }
export async function signOut(token?: string) { try { if (token) await request("/auth/v1/logout", { method: "POST" }, token); } finally { store(null); } }
export function saveSession(session: AuthSession | null) { store(session); }
export function isSupabaseConfigured() { return configured(); }
export function isPasswordRecovery() { return window.location.hash.includes("type=recovery"); }
export async function getAccessToken() {
  let session = readStoredSession(); if (!session) return null;
  if ((session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 30) session = await refreshSession(session.refresh_token);
  return session.access_token;
}
