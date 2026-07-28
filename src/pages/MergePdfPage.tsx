import { useMemo, useRef, useState } from "react";
import { FilePlus2, GripVertical, LoaderCircle, Merge, Trash2 } from "lucide-react";
import PdfPreview from "../components/PdfPreview";
import TimedActionButton from "../components/TimedActionButton";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { inspectPdf, mergePdfs, saveBlob } from "../services/api";

type PdfItem = { id: string; file: File; pages: number };
const fingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export default function MergePdfPage() {
  const [items, setItems] = useState<PdfItem[]>([]); const [selectedId, setSelectedId] = useState("");
  const [outputName, setOutputName] = useState("merged-document.pdf"); const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [dragId, setDragId] = useState(""); const input = useRef<HTMLInputElement>(null);
  const timer = useElapsedTimer();
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === selectedId)); const selected = items[selectedIndex] || null;
  const stats = useMemo(() => ({ pages: items.reduce((sum, item) => sum + item.pages, 0), bytes: items.reduce((sum, item) => sum + item.file.size, 0) }), [items]);

  async function addFiles(list: FileList | File[]) {
    timer.reset(); setAdding(true); setError(""); setMessage(""); const existing = new Set(items.map(item => fingerprint(item.file))); const next: PdfItem[] = [];
    try {
      for (const file of Array.from(list)) {
        if ((file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) { setError(`${file.name}: chỉ chấp nhận tệp PDF.`); continue; }
        const key = fingerprint(file); if (existing.has(key)) { setError(`${file.name}: tệp này đã có trong danh sách.`); continue; }
        const info = await inspectPdf(file); next.push({ id: crypto.randomUUID(), file, pages: info.pages }); existing.add(key);
      }
      if (next.length) { setItems(current => [...current, ...next]); setSelectedId(current => current || next[0].id); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đọc PDF."); }
    finally { setAdding(false); if (input.current) input.current.value = ""; }
  }
  function remove(id: string) {
    timer.reset();
    setItems(current => { const index = current.findIndex(item => item.id === id); const next = current.filter(item => item.id !== id); if (id === selectedId) setSelectedId(next[Math.min(index, next.length - 1)]?.id || ""); return next; });
  }
  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setItems(current => { const from = current.findIndex(item => item.id === dragId); const to = current.findIndex(item => item.id === targetId); const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); setDragId("");
  }
  async function submit() {
    if (items.length < 2 || busy) return; timer.start(); setBusy(true); setError(""); setMessage("");
    try { const result = await mergePdfs(items.map(item => item.file), outputName); saveBlob(result.blob, result.filename); setMessage(`Đã nối PDF và tải xuống ${result.filename}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể nối PDF."); }
    finally { setBusy(false); timer.stop(); }
  }
  return <section><div className="page-heading"><div><span className="eyebrow">DOCUMENT EDITOR</span><h2>Nối PDF</h2><p>Thêm nhiều file và sắp xếp đúng thứ tự trước khi nối.</p></div></div>
    <div className="document-layout pdf-tool-layout"><article className="card document-controls pdf-tool-controls"><div className="card-title"><span className="number">01</span><div><h3>Danh sách file PDF</h3><p>Thêm nhiều file và sắp xếp thứ tự trước khi nối.</p></div></div>
      <div className="multi-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addFiles(event.dataTransfer.files); }} onClick={() => input.current?.click()}><input ref={input} type="file" accept=".pdf,application/pdf" multiple onChange={event => { if (event.target.files) void addFiles(event.target.files); }} /><span className="drop-icon"><FilePlus2 /></span><strong>Kéo thả hoặc bấm để thêm file PDF</strong><small>Có thể thêm file nhiều lần; danh sách cũ được giữ nguyên.</small></div>
      <div className="merge-actions"><button type="button" onClick={() => input.current?.click()} disabled={adding}><FilePlus2 /> {adding ? "Đang thêm..." : "Thêm file PDF"}</button><button type="button" onClick={() => { setItems([]); setSelectedId(""); timer.reset(); }} disabled={!items.length}><Trash2 /> Xóa tất cả</button></div>
      <div className="pdf-file-list">{!items.length && <div className="list-empty">Chưa có file PDF nào.</div>}{items.map((item, index) => <div key={item.id} draggable onDragStart={() => setDragId(item.id)} onDragEnd={() => setDragId("")} onDragOver={event => event.preventDefault()} onDrop={() => dropOn(item.id)} onClick={() => setSelectedId(item.id)} className={`${item.id === selectedId ? "pdf-file-row active" : "pdf-file-row"}${item.id === dragId ? " dragging" : ""}`}><GripVertical className="drag-handle" /><b>{index + 1}</b><div><strong>{item.file.name}</strong><span>{item.pages} trang · {(item.file.size / 1048576).toFixed(2)} MB</span></div><button type="button" onClick={event => { event.stopPropagation(); remove(item.id); }} aria-label={`Xóa ${item.file.name}`}><Trash2 /></button></div>)}</div>
      <p className="pdf-stats">Số file: {items.length} · Tổng số trang: {stats.pages} · Tổng dung lượng: {(stats.bytes / 1048576).toFixed(2)} MB</p>
      <label className="field"><span>Tên file sau khi nối</span><input value={outputName} onChange={event => setOutputName(event.target.value)} placeholder="merged-document.pdf" /></label><p className="download-note">File kết quả sẽ được tải xuống bằng trình duyệt.</p>
      {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
      <TimedActionButton label="Nối các file PDF" loadingLabel="Đang nối PDF..." isRunning={timer.isRunning} elapsedTime={timer.formattedTime} disabled={items.length < 2 || busy || adding} onClick={submit} icon={busy ? <LoaderCircle className="spin" /> : <Merge />} success={!!message} error={!!error} />
    </article><PdfPreview file={selected?.file || null} pageCount={selected?.pages} position={selected ? `File ${selectedIndex + 1}/${items.length}` : undefined} /></div></section>;
}
