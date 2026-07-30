import { Clapperboard, FileText, MoveRight, Sparkles } from "lucide-react";

export default function HomePage({ onOpenVideo, onOpenDocument }: { onOpenVideo(): void; onOpenDocument(): void }) {
  return <section className="editor-home"><div className="home-hero"><span className="soft-icon"><Sparkles /></span><span className="eyebrow">LOCA EDITOR</span><h2>Your creative workspace</h2><p>Choose a tool to process video or documents from one consistent interface.</p></div><div className="home-tools"><button onClick={onOpenVideo}><span className="home-tool-icon"><Clapperboard /></span><span><strong>Video Editor</strong><small>Download, extract audio, compress, rotate, and mirror video.</small></span><MoveRight /></button><button onClick={onOpenDocument}><span className="home-tool-icon"><FileText /></span><span><strong>Document Editor</strong><small>Convert, split, merge, and rotate PDF documents.</small></span><MoveRight /></button></div></section>;
}
