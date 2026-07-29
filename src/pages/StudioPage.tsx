import { useEffect, useRef, useState } from "react";
import { Film, Music2, Pause, Play, Plus, Save, Scissors, Settings2, Type, Upload, Volume2, X } from "lucide-react";
import { renderVideoProject, saveBlob } from "../services/api";

type Clip = { id: string; file: File; source: string; duration: number; start: number; end: number };
type TextLayer = { id: number; text: string; start: number; end: number };
const formatTime = (value: number) => { const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(part => String(part).padStart(2, "0")).join(":"); };

export default function StudioPage() {
  const [clips, setClips] = useState<Clip[]>([]); const [selected, setSelected] = useState(0);
  const [music, setMusic] = useState<File | null>(null); const [texts, setTexts] = useState<TextLayer[]>([]); const [draftText, setDraftText] = useState("");
  const [currentTime, setCurrentTime] = useState(0); const [playing, setPlaying] = useState(false); const [draggedIndex, setDraggedIndex] = useState<number | null>(null); const [dragOverIndex, setDragOverIndex] = useState<number | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState<Blob | null>(null);
  const videoInput = useRef<HTMLInputElement>(null); const audioInput = useRef<HTMLInputElement>(null); const videoRef = useRef<HTMLVideoElement>(null);
  const clipsRef = useRef<Clip[]>([]);
  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => () => clipsRef.current.forEach(clip => URL.revokeObjectURL(clip.source)), []);
  const active = clips[selected]; const totalDuration = clips.reduce((sum, clip) => sum + Math.max(0, (clip.end || clip.duration) - clip.start), 0);

  function importVideos(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files).map(file => ({ id: crypto.randomUUID(), file, source: URL.createObjectURL(file), duration: 0, start: 0, end: 0 }));
    setClips(previous => [...previous, ...additions]); setSelected(clips.length); setResult(null); setError("");
  }
  function updateDuration(duration: number) { setClips(previous => previous.map((clip, index) => index === selected && (clip.duration !== duration || !clip.end) ? { ...clip, duration, end: clip.end || duration } : clip)); }
  function updateTrim(field: "start" | "end", value: number) { setClips(previous => previous.map((clip, index) => index === selected ? { ...clip, [field]: value } : clip)); if (field === "start" && videoRef.current) videoRef.current.currentTime = value; setResult(null); }
  function removeClip(index: number) { const removed = clips[index]; if (removed) URL.revokeObjectURL(removed.source); setClips(previous => previous.filter((_, itemIndex) => itemIndex !== index)); setSelected(current => Math.max(0, Math.min(current, clips.length - 2))); setCurrentTime(0); setPlaying(false); setResult(null); }
  function selectClip(index: number) { videoRef.current?.pause(); setSelected(index); setCurrentTime(0); setPlaying(false); }
  function moveClip(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= clips.length || to >= clips.length) return;
    const activeId = active?.id;
    const reordered = [...clips]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved);
    setClips(reordered); setSelected(Math.max(0, reordered.findIndex(clip => clip.id === activeId))); setDraggedIndex(null); setDragOverIndex(null); setResult(null);
  }
  function dragProps(index: number) { return { draggable: true, onDragStart: () => setDraggedIndex(index), onDragEnter: () => setDragOverIndex(index), onDragOver: (event: React.DragEvent) => event.preventDefault(), onDrop: (event: React.DragEvent) => { event.preventDefault(); if (draggedIndex !== null) moveClip(draggedIndex, index); }, onDragEnd: () => { setDraggedIndex(null); setDragOverIndex(null); } }; }
  function addText() { const text = draftText.trim(); if (!text || !active) return; setTexts(previous => [...previous, { id: Date.now(), text, start: currentTime, end: Math.min(active.duration, currentTime + 5) }]); setDraftText(""); setResult(null); }
  async function togglePlayback() { if (!videoRef.current) return; if (videoRef.current.paused) await videoRef.current.play(); else videoRef.current.pause(); }
  function seekTo(value: number) { const video = videoRef.current; if (!video || !active) return; const next = Math.max(0, Math.min(value, active.duration)); video.currentTime = next; setCurrentTime(next); }
  async function exportProject() { if (!clips.length || busy) return; try { setBusy(true); setError(""); setResult(null); const blob = await renderVideoProject(clips.map(clip => clip.file), clips.map(({ start, end }) => ({ start, end })), texts.map(({ text, start, end }) => ({ text, start, end })), music); setResult(blob); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xuất video."); } finally { setBusy(false); } }

  return <section className="studio">
    <input ref={videoInput} className="studio-file-input" type="file" accept="video/*" multiple onChange={event => { importVideos(event.target.files); event.target.value = ""; }} />
    <input ref={audioInput} className="studio-file-input" type="file" accept="audio/*" onChange={event => setMusic(event.target.files?.[0] || null)} />
    <div className="studio-bar"><div><strong>{active?.file.name || "Dự án chưa đặt tên"}</strong><span>{clips.length} video · {formatTime(totalDuration)}</span></div><div className="studio-actions">{result && <button onClick={() => saveBlob(result, "loca-project.mp4")}><Save /> Lưu video</button>}<button className="studio-export" disabled={!clips.length || busy} onClick={exportProject}>{busy ? "Đang xuất..." : "Xuất video"}</button></div></div>
    {error && <div className="studio-error">{error}</div>}
    <div className="studio-grid"><aside className="media-panel"><div className="media-tabs"><button className="active"><Film />Video</button><button onClick={() => audioInput.current?.click()}><Music2 />Âm thanh</button></div><button className="import" onClick={() => videoInput.current?.click()}><Upload /> Nhập nhiều tệp</button><p>TỆP DỰ ÁN ({clips.length})</p><div className="media-list">{clips.map((clip, index) => <button key={clip.id} {...dragProps(index)} className={`${index === selected ? "media-item active" : "media-item"}${draggedIndex === index ? " dragging" : ""}${dragOverIndex === index && draggedIndex !== index ? " drag-over" : ""}`} onClick={() => selectClip(index)}><Film /><span><strong>{clip.file.name}</strong><small>{(clip.file.size / 1048576).toFixed(1)} MB · {formatTime(clip.duration)}</small></span><X className="remove-media" onClick={event => { event.stopPropagation(); removeClip(index); }} /></button>)}</div>{!clips.length && <div className="media-empty"><Film /><span>Chưa có tệp phương tiện</span></div>}</aside>
      <div className="studio-preview"><div className="screen">{active ? <><video key={active.id} ref={videoRef} src={active.source} onLoadedMetadata={event => updateDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />{texts.filter(item => currentTime >= item.start && currentTime <= item.end).map(item => <div className="video-text-overlay" key={item.id}>{item.text}</div>)}</> : <div><Play /><p>Nhập video để bắt đầu chỉnh sửa</p></div>}</div><div className="player"><span>{formatTime(currentTime)}</span><button disabled={!active} onClick={togglePlayback}>{playing ? <Pause /> : <Play />}</button><Volume2 /><input className="seek" type="range" min="0" max={active?.duration || 0} step="0.05" value={Math.min(currentTime, active?.duration || 0)} disabled={!active} onPointerDown={() => videoRef.current?.pause()} onInput={event => seekTo(Number(event.currentTarget.value))} onChange={event => seekTo(Number(event.currentTarget.value))} /><span>{formatTime(active?.duration || 0)}</span></div></div>
      <aside className="properties-panel"><h3><Settings2 /> Thuộc tính</h3>{active ? <div className="property-form"><label>Bắt đầu<input type="number" min="0" max={active.end} step="0.1" value={active.start} onChange={event => updateTrim("start", Number(event.target.value))} /></label><label>Kết thúc<input type="number" min={active.start} max={active.duration} step="0.1" value={active.end} onChange={event => updateTrim("end", Number(event.target.value))} /></label><small>Đoạn xuất: {formatTime(Math.max(0, active.end - active.start))}</small></div> : <div><Settings2 /><p>Chọn video để chỉnh sửa.</p></div>}</aside></div>
    <div className="timeline"><div className="timeline-tools"><button disabled={!active} onClick={() => active && updateTrim("start", currentTime)}><Scissors /> Đặt điểm đầu</button><button disabled={!active} onClick={() => active && updateTrim("end", currentTime)}><Scissors /> Đặt điểm cuối</button><span>Timeline</span><b>{formatTime(totalDuration)}</b></div>
      <div className="track"><strong>Video</strong><div className="clip-row">{clips.map((clip, index) => <button key={clip.id} {...dragProps(index)} className={`${index === selected ? "timeline-clip active" : "timeline-clip"}${draggedIndex === index ? " dragging" : ""}${dragOverIndex === index && draggedIndex !== index ? " drag-over" : ""}`} style={{ flexGrow: Math.max(1, clip.end - clip.start) }} onClick={() => selectClip(index)}><Film /> {clip.file.name}</button>)}<button onClick={() => videoInput.current?.click()}><Plus /> Video</button></div></div>
      <div className="track text-track"><strong>Văn bản</strong><div><div className="inline-add"><input value={draftText} onChange={event => setDraftText(event.target.value)} placeholder="Nhập chữ hiển thị trên video" /><button disabled={!active || !draftText.trim()} onClick={addText}><Type /> Thêm chữ</button></div>{texts.map(item => <button key={item.id} className="text-chip" onClick={() => setCurrentTime(item.start)}>{item.text} · {item.start.toFixed(1)}–{item.end.toFixed(1)}s <X onClick={event => { event.stopPropagation(); setTexts(previous => previous.filter(text => text.id !== item.id)); }} /></button>)}</div></div>
      <div className="track"><strong>Âm thanh</strong><div className="clip-row">{music ? <button className="timeline-clip active"><Music2 /> {music.name}<X onClick={event => { event.stopPropagation(); setMusic(null); }} /></button> : <button onClick={() => audioInput.current?.click()}><Plus /> Thêm âm thanh</button>}</div></div>
    </div>
  </section>;
}
