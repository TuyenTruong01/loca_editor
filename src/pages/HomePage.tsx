import { Clapperboard, FileText, MoveRight, Sparkles } from "lucide-react";

export default function HomePage({ onOpenVideo, onOpenDocument }: { onOpenVideo(): void; onOpenDocument(): void }) {
  return <section className="editor-home"><div className="home-hero"><span className="soft-icon"><Sparkles /></span><span className="eyebrow">LOCA EDITOR</span><h2>Không gian chỉnh sửa của bạn</h2><p>Chọn công cụ để bắt đầu xử lý video hoặc tài liệu trong cùng một giao diện.</p></div><div className="home-tools"><button onClick={onOpenVideo}><span className="home-tool-icon"><Clapperboard /></span><span><strong>Video Editor</strong><small>Chỉnh sửa, tải, tách âm thanh và nén video.</small></span><MoveRight /></button><button onClick={onOpenDocument}><span className="home-tool-icon"><FileText /></span><span><strong>Document Editor</strong><small>Chuyển đổi, cắt và nối tài liệu PDF.</small></span><MoveRight /></button></div></section>;
}
