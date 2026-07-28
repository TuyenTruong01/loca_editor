import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readRecoverySession, readStoredSession, refreshSession, saveSession, signIn as supabaseSignIn, signOut as supabaseSignOut, type AuthSession } from "../services/supabaseAuth";

export type AccessProfile = { user_id: string; email: string; role: "admin" | "agent" | "user"; status: "active" | "locked" | "expired"; expires_at: string | null; force_password_change: boolean };
type Value = { session: AuthSession | null; profile: AccessProfile | null; loading: boolean; error: string; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void>; reloadProfile(): Promise<void>; token(): Promise<string | null> };
const AuthContext = createContext<Value | null>(null);
const documentBase = import.meta.env.VITE_DOCUMENT_API_BASE || "http://127.0.0.1:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readRecoverySession() || readStoredSession()); const [profile, setProfile] = useState<AccessProfile | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const token = useCallback(async () => {
    let current = session || readStoredSession(); if (!current) return null;
    if ((current.expires_at || 0) <= Math.floor(Date.now() / 1000) + 30) { current = await refreshSession(current.refresh_token); setSession(current); }
    return current.access_token;
  }, [session]);
  const reloadProfile = useCallback(async () => {
    const accessToken = await token(); if (!accessToken) { setProfile(null); return; }
    const response = await fetch(`${documentBase}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.detail || "Tài khoản không có quyền truy cập."); setProfile(data as AccessProfile);
  }, [token]);
  useEffect(() => { let alive = true; (async () => { try { if (session) await reloadProfile(); } catch (reason) { if (alive) { setError(reason instanceof Error ? reason.message : "Không thể xác minh tài khoản."); await supabaseSignOut(session?.access_token); setSession(null); setProfile(null); } } finally { if (alive) setLoading(false); } })(); return () => { alive = false; }; }, []);
  const signIn = useCallback(async (email: string, password: string) => { setError(""); const next = await supabaseSignIn(email, password); setSession(next); const response = await fetch(`${documentBase}/api/auth/me`, { headers: { Authorization: `Bearer ${next.access_token}` } }); const data = await response.json().catch(() => ({})); if (!response.ok) { await supabaseSignOut(next.access_token); setSession(null); throw new Error(data.detail || "Tài khoản không có quyền truy cập."); } setProfile(data as AccessProfile); }, []);
  const signOut = useCallback(async () => { await supabaseSignOut(session?.access_token); saveSession(null); setSession(null); setProfile(null); }, [session]);
  const value = useMemo(() => ({ session, profile, loading, error, signIn, signOut, reloadProfile, token }), [session, profile, loading, error, signIn, signOut, reloadProfile, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth phải nằm trong AuthProvider"); return value; }
