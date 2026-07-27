import axios from "axios";

const videoApi = axios.create({ baseURL: import.meta.env.VITE_VIDEO_API_BASE || "http://127.0.0.1:8765/api", timeout: 15000 });
const documentBase = import.meta.env.VITE_DOCUMENT_API_BASE || "http://127.0.0.1:8000";

function blobError(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) throw new Error(error.message || fallback);
  throw error instanceof Error ? error : new Error(fallback);
}

export async function downloadVideo(url: string, quality: string, browser: string) {
  const body = new FormData();
  body.append("url", url); body.append("quality", quality); body.append("cookie_browser", browser);
  try { return (await videoApi.post<Blob>("/downloads/fetch", body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return blobError(error, "Không thể tải video."); }
}

export async function compressVideo(file: File, preset: string, format: string) {
  const body = new FormData(); body.append("file", file); body.append("preset", preset); body.append("output_format", format);
  try { return (await videoApi.post<Blob>("/compression/process", body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return blobError(error, "Không thể nén video."); }
}

async function audioOperation(path: string, file: File) {
  const body = new FormData(); body.append("file", file);
  try { return (await videoApi.post<Blob>(path, body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return blobError(error, "Không thể xử lý âm thanh."); }
}
export const extractAudio = (file: File) => audioOperation("/audio/extract", file);

async function json<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Có lỗi xảy ra.");
  return data;
}
export type DocumentJob = { job_id: string; status?: string; output_file?: string; download_url?: string; [key: string]: unknown };
export async function convertDocument(file: File, settings: Record<string, unknown>) {
  const job = await json<DocumentJob>(await fetch(`${documentBase}/api/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }));
  const upload = new FormData(); upload.append("job_id", job.job_id); upload.append("file", file);
  await json(await fetch(`${documentBase}/api/upload`, { method: "POST", body: upload }));
  return json<DocumentJob>(await fetch(`${documentBase}/api/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id }) }));
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function documentDownloadUrl(job: DocumentJob) {
  if (job.download_url) return job.download_url.startsWith("http") ? job.download_url : `${documentBase}${job.download_url}`;
  return `${documentBase}/api/jobs/${job.job_id}/download`;
}
