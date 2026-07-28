import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import FileDrop from "../components/FileDrop";
import PdfPreview from "../components/PdfPreview";
import TimedActionButton from "../components/TimedActionButton";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { convertDocument, downloadDocument, saveBlob, type DocumentJob } from "../services/api";

export default function DocumentPage() {
  const [file, setFile] = useState<File | null>(null); const [format, setFormat] = useState("docx");
  const [mode, setMode] = useState("hybrid"); const [pages, setPages] = useState(""); const [language, setLanguage] = useState("auto");
  const [busy, setBusy] = useState(false); const [job, setJob] = useState<DocumentJob | null>(null); const [error, setError] = useState("");
  const timer = useElapsedTimer();
  async function start() { if (!file || busy) return; timer.start(); try { setBusy(true); setError(""); setJob(null); setJob(await convertDocument(file, { output_format: format, mode, pages, ocr_language: language })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể chuyển đổi tài liệu."); } finally { setBusy(false); timer.stop(); } }
  return <section><div className="page-heading"><div><span className="eyebrow">DOCUMENT EDITOR</span><h2>Chuyển đổi tài liệu</h2><p>Chọn tệp, thiết lập đầu ra và xem trước trên cùng một màn hình.</p></div></div>
    <div className="document-layout"><article className="card document-controls"><div className="card-title"><span className="number">01</span><div><h3>Tệp đầu vào và tùy chọn</h3><p>Thiết lập quá trình chuyển đổi.</p></div></div><FileDrop file={file} accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.docx,.xlsx,.pptx,.dxf" hint="PDF, ảnh, Word, Excel, PowerPoint hoặc DXF" onChange={value => { setFile(value); setJob(null); setError(""); timer.reset(); }} />
      <div className="form-grid"><label className="field"><span>Định dạng đầu ra</span><select value={format} onChange={event => setFormat(event.target.value)}><option value="docx">Word (.docx)</option><option value="xlsx">Excel (.xlsx)</option><option value="pptx">PowerPoint (.pptx)</option><option value="searchable_pdf">PDF (.pdf)</option><option value="txt">TXT (.txt)</option></select></label><label className="field"><span>Chế độ</span><select value={mode} onChange={event => setMode(event.target.value)}><option value="visual">Ưu tiên giống bản gốc</option><option value="editable">Ưu tiên chỉnh sửa</option><option value="hybrid">Kết hợp</option></select></label><label className="field"><span>Trang xử lý</span><input value={pages} onChange={event => setPages(event.target.value)} placeholder="Ví dụ: 1-5, 8" /></label><label className="field"><span>Ngôn ngữ OCR</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="auto">Tự động</option><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option><option value="vi+en">Việt + Anh</option></select></label></div>
      <div className="checks"><label><input type="checkbox" defaultChecked /> Giữ font</label><label><input type="checkbox" defaultChecked /> Nhận diện bảng</label><label><input type="checkbox" defaultChecked /> Giữ hình ảnh</label><label><input type="checkbox" defaultChecked /> So sánh bố cục</label></div>
      {error && <div className="notice error">{error}</div>}<TimedActionButton label="Bắt đầu chuyển đổi" loadingLabel="Đang chuyển đổi..." isRunning={timer.isRunning} elapsedTime={timer.formattedTime} disabled={!file || busy} onClick={start} icon={busy ? <LoaderCircle className="spin" /> : undefined} success={!!job} error={!!error} />{job && <button className="primary result-download" onClick={async () => { try { const result = await downloadDocument(job); saveBlob(result.blob, result.filename); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải tài liệu."); } }}><Download /> Lưu tài liệu</button>}
    </article><PdfPreview file={file} /></div>
  </section>;
}
