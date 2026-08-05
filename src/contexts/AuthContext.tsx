import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  readRecoverySession, readStoredSession, refreshSession, saveSession,
  signIn as supabaseSignIn, signOut as supabaseSignOut, type AuthSession,
} from "../services/supabaseAuth";
import { getRuntimeConfig, isDesktopMode } from "../runtimeConfig";

export type AccessProfile = {
  user_id: string; email: string; role: "admin" | "agent" | "user";
  status: "active" | "locked" | "expired"; expires_at: string | null;
  force_password_change: boolean;
};
type Value = {
  session: AuthSession | null; profile: AccessProfile | null; loading: boolean; error: string;
  signIn(email: string, password: string): Promise<void>; signOut(): Promise<void>;
  reloadProfile(): Promise<void>; token(): Promise<string | null>;
};
const AuthContext = createContext<Value | null>(null);
const desktopProfile: AccessProfile = {
  user_id: "desktop-local", email: "Local desktop", role: "user", status: "active",
  expires_at: null, force_password_change: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktopMode();
  const [session, setSession] = useState<AuthSession | null>(() => desktop ? null : readRecoverySession() || readStoredSession());
  const [profile, setProfile] = useState<AccessProfile | null>(() => desktop ? desktopProfile : null);
  const [loading, setLoading] = useState(!desktop);
  const [error, setError] = useState("");
  const token = useCallback(async () => {
    if (desktop) return "desktop-local";
    let current = session || readStoredSession();
    if (!current) return null;
    if ((current.expires_at || 0) <= Math.floor(Date.now() / 1000) + 30) {
      current = await refreshSession(current.refresh_token); setSession(current);
    }
    return current.access_token;
  }, [desktop, session]);
  const reloadProfile = useCallback(async () => {
    if (desktop) { setProfile(desktopProfile); return; }
    const accessToken = await token(); if (!accessToken) { setProfile(null); return; }
    const base = getRuntimeConfig().documentApiBase.replace(/\/$/, "");
    const response = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "This account does not have access.");
    setProfile(data as AccessProfile);
  }, [desktop, token]);
  useEffect(() => {
    if (desktop) { setLoading(false); return; }
    let alive = true;
    void (async () => {
      try { if (session) await reloadProfile(); }
      catch (reason) {
        if (alive) { setError(reason instanceof Error ? reason.message : "Could not verify the account."); await supabaseSignOut(session?.access_token); setSession(null); setProfile(null); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    if (desktop) return;
    setError(""); const next = await supabaseSignIn(email, password); setSession(next);
    const base = getRuntimeConfig().documentApiBase.replace(/\/$/, "");
    const response = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${next.access_token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { await supabaseSignOut(next.access_token); setSession(null); throw new Error(data.detail || "This account does not have access."); }
    setProfile(data as AccessProfile);
  }, [desktop]);
  const signOut = useCallback(async () => {
    if (desktop) return;
    await supabaseSignOut(session?.access_token); saveSession(null); setSession(null); setProfile(null);
  }, [desktop, session]);
  const value = useMemo(() => ({ session, profile, loading, error, signIn, signOut, reloadProfile, token }), [session, profile, loading, error, signIn, signOut, reloadProfile, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
