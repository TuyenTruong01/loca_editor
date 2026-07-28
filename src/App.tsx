import { useEffect, useState } from "react";
import { Clapperboard, FileText, Info, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import DownloadPage from "./pages/DownloadPage";
import CompressPage from "./pages/CompressPage";
import DocumentPage from "./pages/DocumentPage";
import SplitPdfPage from "./pages/SplitPdfPage";
import MergePdfPage from "./pages/MergePdfPage";
import StudioPage from "./pages/StudioPage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import PasswordChangePage from "./pages/PasswordChangePage";
import AdminPage from "./pages/AdminPage";
import { useAuth } from "./contexts/AuthContext";

type Editor = "video" | "document";
type Page = "studio" | "download" | "compress" | "convert" | "split-pdf" | "merge-pdf" | "about" | "admin";
type LocationState = { editor: Editor; page: Page };

const tabs: Record<Editor, { id: Page; label: string }[]> = {
  video: [{ id: "studio", label: "Studio chỉnh sửa" }, { id: "download", label: "Tải video" }, { id: "compress", label: "Nén video" }, { id: "about", label: "Giới thiệu" }],
  document: [{ id: "convert", label: "Chuyển đổi tài liệu" }, { id: "split-pdf", label: "Cắt PDF" }, { id: "merge-pdf", label: "Nối PDF" }, { id: "about", label: "Giới thiệu" }],
};
const routeFor = (editor: Editor, page: Page) => page === "admin" ? "/admin" : `/${editor}/${page}`;
function readLocation(): LocationState {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/admin") return { editor: "document", page: "admin" };
  if (path === "/document/split-pdf") return { editor: "document", page: "split-pdf" };
  if (path === "/document/merge-pdf") return { editor: "document", page: "merge-pdf" };
  if (path === "/document/about") return { editor: "document", page: "about" };
  if (path.startsWith("/document")) return { editor: "document", page: "convert" };
  if (path === "/video/download") return { editor: "video", page: "download" };
  if (path === "/video/compress") return { editor: "video", page: "compress" };
  if (path === "/video/about") return { editor: "video", page: "about" };
  return { editor: "video", page: "studio" };
}

export default function App() {
  const { session, profile, loading, signOut } = useAuth(); const initial = readLocation(); const [editor, setEditor] = useState<Editor>(initial.editor); const [page, setPage] = useState<Page>(initial.page); const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const pop = () => { const next = readLocation(); setEditor(next.editor); setPage(next.page); }; window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  useEffect(() => { if (!loading && profile && page === "admin" && profile.role !== "admin") { setPage("studio"); setEditor("video"); window.history.replaceState({}, "", "/video/studio"); } }, [loading, profile, page]);
  if (loading) return <main className="auth-loading"><img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Loca Editor" /><p>Đang xác minh tài khoản...</p></main>;
  if (!session || !profile) return <LoginPage />;
  if (profile.force_password_change) return <PasswordChangePage />;
  function navigate(nextEditor: Editor, nextPage: Page) { if (nextPage === "admin" && profile?.role !== "admin") return; setEditor(nextEditor); setPage(nextPage); setMenuOpen(false); window.history.pushState({}, "", routeFor(nextEditor, nextPage)); }
  function chooseEditor(next: Editor) { navigate(next, next === "video" ? "studio" : "convert"); }
  return <div className="app-shell">
    <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở trình đơn">{menuOpen ? <X /> : <Menu />}</button>{page !== "admin" && <nav className="top-tabs">{tabs[editor].map(tab => <button key={tab.id} className={page === tab.id ? "active" : ""} onClick={() => navigate(editor, tab.id)}>{tab.label}</button>)}</nav>}<div className="account-actions"><span><UserRound/><b>{profile.email}</b><small>{profile.role}</small></span><button onClick={() => void signOut()}><LogOut/> Đăng xuất</button></div></header>
    <div className="workspace"><aside className={menuOpen ? "sidebar open" : "sidebar"}><div className="brand-row"><img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Loca Editor" /><h1><strong>Loca</strong> <span>Editor</span></h1></div>
      <button className={page !== "admin" && editor === "video" ? "active" : ""} onClick={() => chooseEditor("video")}><Clapperboard /><span><strong>Video Editor</strong><small>Chỉnh sửa và tối ưu video</small></span></button>
      <button className={page !== "admin" && editor === "document" ? "active" : ""} onClick={() => chooseEditor("document")}><FileText /><span><strong>Document Editor</strong><small>Chuyển đổi và xử lý tài liệu</small></span></button>
      {profile.role === "admin" && <button className={page === "admin" ? "active admin-nav" : "admin-nav"} onClick={() => navigate(editor, "admin")}><ShieldCheck /><span><strong>Quản trị</strong><small>Tài khoản và phân quyền</small></span></button>}
      <div className="sidebar-foot"><Info size={15} /><span>Loca Editor<br/><small>Designed by Tuyen Truong · © 2026</small></span></div></aside>
      <main className={page === "studio" ? "main studio-main" : "main"}>{page === "studio" && <StudioPage />}{page === "download" && <DownloadPage />}{page === "compress" && <CompressPage />}{page === "convert" && <DocumentPage />}{page === "split-pdf" && <SplitPdfPage />}{page === "merge-pdf" && <MergePdfPage />}{page === "about" && <AboutPage editor={editor} />}{page === "admin" && profile.role === "admin" && <AdminPage />}</main>
    </div>
  </div>;
}
