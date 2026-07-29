import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Music2, Pause, Play, Scissors, Settings2, Upload, Volume2 } from "lucide-react";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00:00";
  const seconds = Math.max(0, Math.floor(value));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(part => String(part).padStart(2, "0")).join(":");
}

export default function StudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const source = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  function chooseFile(next: File | null) { if (!next) return; setFile(next); setCurrentTime(0); setDuration(0); setPlaying(false); }
  async function togglePlayback() { const video = videoRef.current; if (!video) return; if (video.paused) await video.play(); else video.pause(); }

  return <section className="studio"><input ref={inputRef} className="studio-file-input" type="file" accept="video/*" onChange={event => chooseFile(event.target.files?.[0] || null)} /><div className="studio-bar"><div><strong>{file?.name || "Dự án chưa đặt tên"}</strong><span>{formatTime(duration)}</span></div><button className="studio-export" disabled={!file} title="Chức năng xuất video sẽ được bổ sung ở bước tiếp theo">Xuất video</button></div><div className="studio-grid"><aside className="media-panel"><div className="media-tabs"><button className="active"><Film />Video</button><button><Music2 />Âm thanh</button></div><button className="import" onClick={() => inputRef.current?.click()}><Upload /> Nhập tệp</button><p>TỆP DỰ ÁN</p>{file ? <button className="media-item active" onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}><Film /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · {formatTime(duration)}</small></span></button> : <div className="media-empty"><Film /><span>Chưa có tệp phương tiện</span></div>}</aside><div className="studio-preview"><div className="screen">{source ? <video ref={videoRef} src={source} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /> : <div><Play /><p>Nhập video để bắt đầu chỉnh sửa</p></div>}</div><div className="player"><span>{formatTime(currentTime)}</span><button disabled={!file} onClick={togglePlayback}>{playing ? <Pause /> : <Play />}</button><Volume2 /><span>{formatTime(duration)}</span></div></div><aside className="properties-panel"><h3><Settings2 /> Thuộc tính</h3>{file ? <div><Film /><p><strong>{file.name}</strong><br />Thời lượng: {formatTime(duration)}<br />Dung lượng: {(file.size / 1024 / 1024).toFixed(1)} MB</p></div> : <div><Settings2 /><p>Chọn một đoạn video để chỉnh sửa thuộc tính.</p></div>}</aside></div><div className="timeline"><div className="timeline-tools"><button disabled={!file}><Scissors /> Cắt</button><span>Timeline</span><b>{formatTime(duration)}</b></div>{["Video", "Văn bản", "Âm thanh"].map((label, index) => <div className="track" key={label}><strong>{label}</strong><div>{index === 0 && file ? <button className="timeline-clip" onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}><Film /> {file.name}</button> : <button onClick={() => index === 0 && inputRef.current?.click()}>+ {index === 0 ? "Thêm video" : `Thêm ${label.toLowerCase()}`}</button>}</div></div>)}</div></section>;
}
