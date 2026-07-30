import { useEffect, useState } from "react";
import { Clapperboard, FileText, House, Info, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import DownloadPage from "./pages/DownloadPage";
import CompressPage from "./pages/CompressPage";
import DocumentPage from "./pages/DocumentPage";
import SplitPdfPage from "./pages/SplitPdfPage";
import MergePdfPage from "./pages/MergePdfPage";
import RotateVideoPage from "./pages/RotateVideoPage";
import RotatePdfPage from "./pages/RotatePdfPage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import PasswordChangePage from "./pages/PasswordChangePage";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import { useAuth } from "./contexts/AuthContext";
import { isPasswordRecovery } from "./services/supabaseAuth";

type Editor = "video" | "document";
type Page = "home" | "download" | "compress" | "rotate-video" | "convert" | "split-pdf" | "merge-pdf" | "rotate-pdf" | "about" | "admin";
type LocationState = { editor: Editor; page: Page };

const tabs: Record<Editor, { id: Page; label: string }[]> = {
  video: [{ id: "download", label: "Download Video" }, { id: "compress", label: "Compress Video" }, { id: "rotate-video", label: "Rotate Video" }, { id: "about", label: "About" }],
  document: [{ id: "convert", label: "Convert Document" }, { id: "split-pdf", label: "Split PDF" }, { id: "merge-pdf", label: "Merge PDF" }, { id: "rotate-pdf", label: "Rotate PDF" }, { id: "about", label: "About" }],
};
const routeFor = (editor: Editor, page: Page) => page === "home" ? "/" : page === "admin" ? "/admin" : `/${editor}/${page}`;
function readLocation(): LocationState {
  const path = window.location.pathname.replace(/\/$/, "");
  if (!path) return { editor: "video", page: "home" };
  if (path === "/admin") return { editor: "document", page: "admin" };
  if (path === "/document/split-pdf") return { editor: "document", page: "split-pdf" };
  if (path === "/document/merge-pdf") return { editor: "document", page: "merge-pdf" };
  if (path === "/document/rotate-pdf") return { editor: "document", page: "rotate-pdf" };
  if (path === "/document/about") return { editor: "document", page: "about" };
  if (path.startsWith("/document")) return { editor: "document", page: "convert" };
  if (path === "/video/compress") return { editor: "video", page: "compress" };
  if (path === "/video/rotate-video") return { editor: "video", page: "rotate-video" };
  if (path === "/video/about") return { editor: "video", page: "about" };
  return { editor: "video", page: "download" };
}

export default function App() {
  const { session, profile, loading, signOut } = useAuth(); const initial = readLocation(); const [editor, setEditor] = useState<Editor>(initial.editor); const [page, setPage] = useState<Page>(initial.page); const [menuOpen, setMenuOpen] = useState(false); const [showLogin, setShowLogin] = useState(false);
  useEffect(() => { const pop = () => { const next = readLocation(); setEditor(next.editor); setPage(next.page); }; window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  useEffect(() => { if (!loading && page === "admin" && profile?.role !== "admin") { setPage("home"); window.history.replaceState({}, "", "/"); } }, [loading, profile, page]);
  if (loading) return <main className="auth-loading"><img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Loca Editor" /><p>Verifying your account...</p></main>;
  if (showLogin && (!session || !profile)) return <LoginPage onBack={() => setShowLogin(false)} />;
  if (profile?.force_password_change || (session && isPasswordRecovery())) return <PasswordChangePage />;
  function navigate(nextEditor: Editor, nextPage: Page) { if (nextPage === "admin" && profile?.role !== "admin") return; setEditor(nextEditor); setPage(nextPage); setMenuOpen(false); window.history.pushState({}, "", routeFor(nextEditor, nextPage)); }
  function chooseEditor(next: Editor) { navigate(next, next === "video" ? "download" : "convert"); }
  return <div className="app-shell">
    <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen ? <X /> : <Menu />}</button>{page !== "admin" && page !== "home" && <nav className="top-tabs">{tabs[editor].map(tab => <button key={tab.id} className={page === tab.id ? "active" : ""} onClick={() => navigate(editor, tab.id)}>{tab.label}</button>)}</nav>}</header>
    <div className="workspace"><aside className={menuOpen ? "sidebar open" : "sidebar"}><button type="button" className="brand-row brand-home" onClick={() => navigate("video", "home")} aria-label="Loca Editor home"><img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Loca Editor" /><h1><strong>Loca</strong> <span>Editor</span></h1></button>
      <button className={page === "home" ? "active" : ""} onClick={() => navigate(editor, "home")}><House /><span><strong>Home</strong><small>Overview and quick access</small></span></button>
      <button className={page !== "admin" && page !== "home" && editor === "video" ? "active" : ""} onClick={() => chooseEditor("video")}><Clapperboard /><span><strong>Video Editor</strong><small>Download and optimize video</small></span></button>
      <button className={page !== "admin" && page !== "home" && editor === "document" ? "active" : ""} onClick={() => chooseEditor("document")}><FileText /><span><strong>Document Editor</strong><small>Convert and process documents</small></span></button>
      {profile?.role === "admin" && <button className={page === "admin" ? "active admin-nav" : "admin-nav"} onClick={() => navigate(editor, "admin")}><ShieldCheck /><span><strong>Administration</strong><small>Accounts and permissions</small></span></button>}
      <div className="sidebar-account">{profile ? <><div className="sidebar-user"><UserRound/><span><strong>{profile.email}</strong><small>{profile.role}</small></span></div><button onClick={() => void signOut()}><LogOut/> Sign out</button></> : <button className="sidebar-login" onClick={() => setShowLogin(true)}><UserRound/> Sign in</button>}</div>
      <div className="sidebar-foot"><Info size={15} /><span>Designed by Tuyen Truong · © 2026</span></div></aside>
      <main className="main">{!profile && <div className="public-demo"><span className="demo-icon"><ShieldCheck /></span><span className="demo-copy"><strong>Guest preview</strong><small>Explore the complete interface. Sign in when you are ready to process files.</small></span><button className="primary" onClick={() => setShowLogin(true)}><UserRound /> Sign in</button></div>}{page === "home" && <HomePage onOpenVideo={() => navigate("video", "download")} onOpenDocument={() => navigate("document", "convert")} />}{page === "download" && <DownloadPage />}{page === "compress" && <CompressPage />}{page === "rotate-video" && <RotateVideoPage />}{page === "convert" && <DocumentPage />}{page === "split-pdf" && <SplitPdfPage />}{page === "merge-pdf" && <MergePdfPage />}{page === "rotate-pdf" && <RotatePdfPage />}{page === "about" && <AboutPage editor={editor} />}{page === "admin" && profile?.role === "admin" && <AdminPage />}</main>
    </div>
  </div>;
}
