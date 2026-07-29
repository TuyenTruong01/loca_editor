import { useEffect, useMemo, useState } from "react";
import { Download, Headphones, Link2, Save, ShieldCheck, VolumeX } from "lucide-react";
import FileDrop from "../components/FileDrop";
import TimedActionButton from "../components/TimedActionButton";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { downloadVideo, extractAudio, muteVideo, saveBlob } from "../services/api";

type Result = { blob: Blob; name: string } | null;
export default function DownloadPage() {
  const [url, setUrl] = useState(""); const [quality, setQuality] = useState("balanced");
  const [videoFile, setVideoFile] = useState<File | null>(null); const [downloadResult, setDownloadResult] = useState<Result>(null); const [audioResult, setAudioResult] = useState<Result>(null); const [mutedResult, setMutedResult] = useState<Result>(null);
  const [downloadBusy, setDownloadBusy] = useState(false); const [audioBusy, setAudioBusy] = useState(false); const [message, setMessage] = useState("");
  const downloadTimer = useElapsedTimer(); const audioTimer = useElapsedTimer();
  const videoPreview = useMemo(() => videoFile ? URL.createObjectURL(videoFile) : "", [videoFile]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);
  async function startDownload() { if (downloadBusy) return; downloadTimer.start(); try { setDownloadBusy(true); setMessage(""); setDownloadResult(null); const blob = await downloadVideo(url, quality, "none"); setDownloadResult({ blob, name: "loca-video.mp4" }); } catch (e) { setMessage(e instanceof Error ? e.message : "Không thể tải video."); } finally { setDownloadBusy(false); downloadTimer.stop(); } }
  async function startAudio() { if (!videoFile || audioBusy) return; audioTimer.start(); try { setAudioBusy(true); setMessage(""); setAudioResult(null); setMutedResult(null); const [audio, muted] = await Promise.all([extractAudio(videoFile), muteVideo(videoFile)]); const base = videoFile.name.replace(/\.[^.]+$/, ""); setAudioResult({ blob: audio, name: `${base}-audio.mp3` }); setMutedResult({ blob: muted, name: `${base}-khong-tieng.mp4` }); } catch (e) { setMessage(e instanceof Error ? e.message : "Không thể tách video và âm thanh."); } finally { setAudioBusy(false); audioTimer.stop(); } }
  return <section>
    <div className="page-heading"><div><span className="eyebrow">VIDEO EDITOR</span><h2>Tải video và tách âm thanh</h2><p>Hai công cụ thiết yếu trong cùng một không gian làm việc.</p></div><span className="safe"><ShieldCheck /> Dữ liệu được xử lý cục bộ</span></div>
    {message && <div className="notice error">{message}</div>}
    <div className="split equal">
      <article className="card tool-card"><div className="card-title"><span className="number">01</span><div><h3>Tải video</h3><p>Tải từ đường dẫn trực tiếp hoặc website phổ biến.</p></div></div>
        <label className="field"><span>Đường dẫn video</span><div className="input-icon"><Link2 /><input value={url} onChange={e => { setUrl(e.target.value); setDownloadResult(null); downloadTimer.reset(); }} placeholder="https://youtube.com/watch?v=..." /></div></label>
        <div className="choice-grid">{[["small","Tiết kiệm","720p"],["balanced","Cân bằng","1080p"],["best","Cao nhất","Chất lượng gốc"]].map(item => <button key={item[0]} className={quality === item[0] ? "choice active" : "choice"} onClick={() => setQuality(item[0])}><i/><strong>{item[1]}</strong><small>{item[2]}</small></button>)}</div>
        <TimedActionButton label="Tải video" loadingLabel="Đang tải..." isRunning={downloadTimer.isRunning} elapsedTime={downloadTimer.formattedTime} disabled={!url.trim() || downloadBusy} onClick={startDownload} icon={<Download />} success={!!downloadResult} error={!!message} />{downloadResult && <div className="result"><span><strong>Video đã sẵn sàng</strong><small>Chọn nơi lưu trên máy tính.</small></span><button className="primary" onClick={() => saveBlob(downloadResult.blob, downloadResult.name)}><Save /> Lưu video</button></div>}
      </article>
      <article className="card tool-card"><div className="card-title"><span className="number">02</span><div><h3>Tách âm thanh khỏi video</h3><p>Xuất phần âm thanh thành một tệp riêng.</p></div></div>
        <FileDrop file={videoFile} accept="video/*" hint="MP4, MOV, MKV, WebM hoặc AVI" onChange={file => { setVideoFile(file); setAudioResult(null); setMutedResult(null); audioTimer.reset(); }} />
        {videoPreview && <video className="compact-video" src={videoPreview} controls />}
        <TimedActionButton label="Tách video và âm thanh" loadingLabel="Đang tạo 2 đầu ra..." isRunning={audioTimer.isRunning} elapsedTime={audioTimer.formattedTime} disabled={!videoFile || audioBusy} onClick={startAudio} icon={<Headphones />} success={!!audioResult && !!mutedResult} error={!!message} />{mutedResult && <div className="result"><span><strong><VolumeX /> Video không có tiếng</strong><small>{mutedResult.name}</small></span><button className="primary" onClick={() => saveBlob(mutedResult.blob, mutedResult.name)}><Save /> Lưu video</button></div>}{audioResult && <div className="result"><span><strong><Headphones /> Chỉ có âm thanh</strong><small>{audioResult.name}</small></span><button className="primary" onClick={() => saveBlob(audioResult.blob, audioResult.name)}><Save /> Lưu audio</button></div>}
      </article>
    </div>
  </section>;
}
