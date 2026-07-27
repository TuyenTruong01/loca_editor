import { useState } from "react";
import { Clapperboard, FileText, Info, Menu, X } from "lucide-react";
import DownloadPage from "./pages/DownloadPage";
import CompressPage from "./pages/CompressPage";
import DocumentPage from "./pages/DocumentPage";
import StudioPage from "./pages/StudioPage";
import AboutPage from "./pages/AboutPage";

type Editor = "video" | "document";
type Page = "studio" | "download" | "compress" | "convert" | "about";

const tabs: Record<Editor, { id: Page; label: string }[]> = {
  video: [{ id: "studio", label: "Studio chỉnh sửa" }, { id: "download", label: "Tải video" }, { id: "compress", label: "Nén video" }, { id: "about", label: "Giới thiệu" }],
  document: [{ id: "convert", label: "Chuyển đổi tài liệu" }, { id: "about", label: "Giới thiệu" }],
};

export default function App() {
  const [editor, setEditor] = useState<Editor>("video");
  const [page, setPage] = useState<Page>("studio");
  const [menuOpen, setMenuOpen] = useState(false);
  function chooseEditor(next: Editor) { setEditor(next); setPage(next === "video" ? "studio" : "convert"); setMenuOpen(false); }
  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở trình đơn">{menuOpen ? <X /> : <Menu />}</button>
      <nav className="top-tabs">{tabs[editor].map(tab => <button key={tab.id} className={page === tab.id ? "active" : ""} onClick={() => setPage(tab.id)}>{tab.label}</button>)}</nav>
    </header>
    <div className="workspace">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand-row"><img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="Loca Editor" /><h1><strong>Loca</strong> <span>Editor</span></h1></div>
        <button className={editor === "video" ? "active" : ""} onClick={() => chooseEditor("video")}><Clapperboard /><span><strong>Video Editor</strong><small>Chỉnh sửa và tối ưu video</small></span></button>
        <button className={editor === "document" ? "active" : ""} onClick={() => chooseEditor("document")}><FileText /><span><strong>Document Editor</strong><small>Chuyển đổi tài liệu</small></span></button>
        <div className="sidebar-foot"><Info size={15} /><span>Loca Editor<br/><small>Designed by Tuyen Truong · © 2026</small></span></div>
      </aside>
      <main className={page === "studio" ? "main studio-main" : "main"}>
        {page === "studio" && <StudioPage />}{page === "download" && <DownloadPage />}{page === "compress" && <CompressPage />}{page === "convert" && <DocumentPage />}{page === "about" && <AboutPage editor={editor} />}
      </main>
    </div>
  </div>;
}
