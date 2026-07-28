import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { markPasswordChanged } from "../services/adminApi";
import { updatePassword } from "../services/supabaseAuth";

export default function PasswordChangePage() {
  const { token, reloadProfile } = useAuth(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự."); if (password !== confirm) return setError("Mật khẩu xác nhận không khớp."); setBusy(true); setError(""); try { const accessToken = await token(); if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn."); await updatePassword(accessToken, password); await markPasswordChanged(); await reloadProfile(); window.location.replace(`${window.location.origin}/video/studio`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu."); } finally { setBusy(false); } }
  return <main className="login-screen"><section className="login-card"><span className="soft-icon"><KeyRound /></span><div className="login-copy"><span className="eyebrow">BẢO MẬT TÀI KHOẢN</span><h2>Đổi mật khẩu lần đầu</h2><p>Hãy đặt mật khẩu riêng trước khi sử dụng Loca Editor.</p></div><form onSubmit={submit}><label className="field"><span>Mật khẩu mới</span><input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required /></label><label className="field"><span>Nhập lại mật khẩu</span><input type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} required /></label>{error && <div className="notice error">{error}</div>}<button className="primary login-submit" disabled={busy}>{busy && <LoaderCircle className="spin" />}{busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button></form></section></main>;
}
