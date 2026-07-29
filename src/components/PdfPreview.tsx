import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, Maximize2, Minus, Plus } from "lucide-react";

type Props = {
  file: File | null;
  pageCount?: number;
  selectedPages?: Set<number>;
  status?: string;
  position?: string;
};

export default function PdfPreview({ file, pageCount = 0, selectedPages, status, position }: Props) {
  const [zoom, setZoom] = useState(100);
  const previewBody = useRef<HTMLDivElement>(null);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  const isPdf = Boolean(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));
  const isImage = Boolean(file && (file.type.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(file.name)));

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return <article className="card document-preview pdf-preview-card">
    <div className="preview-head">
      <div><h3>Xem trước tài liệu</h3><p>{file?.name || "Tài liệu sẽ xuất hiện tại đây"}</p></div>
      <div className="preview-meta">{position && <strong>{position}</strong>}{pageCount > 0 && <span>{pageCount} trang</span>}{status && <span>{status}</span>}</div>
      <div className="zoom">{isImage && <><button type="button" onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Thu nhỏ"><Minus /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(Math.min(160, zoom + 10))} aria-label="Phóng to"><Plus /></button></>}<button type="button" onClick={() => previewBody.current?.requestFullscreen()} aria-label="Xem toàn màn hình" title="Xem toàn màn hình"><Maximize2 /></button></div>
    </div>
    <div className="pdf-preview-body" ref={previewBody}>
      <div className="paper-viewport">
        {!file && <div className="empty-preview"><span><FileSearch /></span><h3>Chưa có tài liệu</h3><p>Chọn một tệp ở cột bên trái để xem trước.</p></div>}
        {isPdf && <object data={preview} type="application/pdf" aria-label={`Xem trước ${file?.name}`} />}
        {isImage && <div className="image-paper" style={{ width: `${zoom}%` }}><img src={preview} alt={`Xem trước ${file?.name}`} /></div>}
        {file && !isPdf && !isImage && <div className="empty-preview"><span><FileSearch /></span><h3>{file.name}</h3><p>Tệp đã sẵn sàng để chuyển đổi. Định dạng này không hỗ trợ xem trước trực tiếp.</p></div>}
      </div>
    </div>
  </article>;
}
