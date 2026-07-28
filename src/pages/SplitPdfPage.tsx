import { useMemo, useState } from "react";
import { LoaderCircle, Scissors, Trash2 } from "lucide-react";
import FileDrop from "../components/FileDrop";
import PdfPreview from "../components/PdfPreview";
import TimedActionButton from "../components/TimedActionButton";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { inspectPdf, saveBlob, splitPdf, type PdfInfo } from "../services/api";
import { parsePageRanges } from "../services/pdfRanges";

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null); const [info, setInfo] = useState<PdfInfo | null>(null);
  const [ranges, setRanges] = useState(""); const [mode, setMode] = useState<"merged" | "separate">("merged");
  const [outputName, setOutputName] = useState("document_cut.pdf"); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [inspecting, setInspecting] = useState(false);
  const timer = useElapsedTimer();
  const parsed = useMemo(() => parsePageRanges(ranges, info?.pages || 0), [ranges, info?.pages]);

  async function choose(next: File | null) {
    setMessage(""); setError(""); setInfo(null); setFile(next); timer.reset();
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setFile(null); setError("Chỉ chấp nhận một tệp PDF."); return; }
    setOutputName(`${next.name.replace(/\.pdf$/i, "")}_cut.pdf`); setInspecting(true);
    try { const result = await inspectPdf(next); setInfo(result); setRanges(`1-${result.pages}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đọc PDF."); }
    finally { setInspecting(false); }
  }
  async function submit() {
    if (!file || parsed.error || busy) return;
    timer.start(); setBusy(true); setError(""); setMessage("");
    try { const result = await splitPdf(file, ranges, mode, outputName); saveBlob(result.blob, result.filename); setMessage(`Đã cắt PDF và tải xuống ${result.filename}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể cắt PDF."); }
    finally { setBusy(false); timer.stop(); }
  }
  return <section><div className="page-heading"><div><span className="eyebrow">DOCUMENT EDITOR</span><h2>Cắt PDF</h2><p>Chọn chính xác các trang cần giữ và tải kết quả về trình duyệt.</p></div></div>
    <div className="document-layout pdf-tool-layout"><article className="card document-controls pdf-tool-controls"><div className="card-title"><span className="number">01</span><div><h3>Tệp PDF và tùy chọn cắt</h3><p>Chọn tệp, nhập phạm vi trang và xuất kết quả.</p></div></div>
      <FileDrop file={file} accept=".pdf,application/pdf" hint="Chỉ chấp nhận một tệp PDF" onChange={choose} />
      {file && <div className="file-summary"><div><strong>{file.name}</strong><span>{(file.size / 1048576).toFixed(2)} MB · {info ? `${info.pages} trang` : inspecting ? "Đang đọc..." : "Chưa đọc được số trang"}</span></div><button type="button" onClick={() => choose(null)} aria-label="Xóa tệp"><Trash2 /></button></div>}
      <label className="field"><span>Trang cần cắt</span><input value={ranges} onChange={event => setRanges(event.target.value)} placeholder="Ví dụ: 1,2 | 3-8 | 1,3,5-7" disabled={!file || inspecting} /></label>
      {file && ranges && parsed.error && <div className="field-error">{parsed.error}</div>}
      <div className="output-modes"><label><input type="radio" checked={mode === "merged"} onChange={() => setMode("merged")} /><span><strong>Gộp thành một file</strong><small>Gộp tất cả trang đã chọn theo thứ tự.</small></span></label><label><input type="radio" checked={mode === "separate"} onChange={() => setMode("separate")} /><span><strong>Tách theo nhóm</strong><small>Mỗi nhóm “|” thành một PDF; nhiều nhóm tải bằng ZIP.</small></span></label></div>
      <label className="field"><span>Tên file đầu ra</span><input value={outputName} onChange={event => setOutputName(event.target.value)} placeholder="document_cut.pdf" /></label>
      <p className="download-note">File kết quả sẽ được tải xuống bằng trình duyệt.</p>
      {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
      <TimedActionButton label="Cắt file PDF" loadingLabel="Đang cắt PDF..." isRunning={timer.isRunning} elapsedTime={timer.formattedTime} disabled={!file || !info || !!parsed.error || busy || inspecting} onClick={submit} icon={busy ? <LoaderCircle className="spin" /> : <Scissors />} success={!!message} error={!!error} />
    </article><PdfPreview file={file} pageCount={info?.pages} selectedPages={parsed.selected} status={info ? `Đã chọn ${parsed.selected.size}/${info.pages} trang` : undefined} /></div></section>;
}
