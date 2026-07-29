import axios from "axios";
import { getAccessToken } from "./supabaseAuth";

const videoApi = axios.create({ baseURL: import.meta.env.VITE_VIDEO_API_BASE || "http://127.0.0.1:8765/api", timeout: 15000 });
const documentBase = import.meta.env.VITE_DOCUMENT_API_BASE || "http://127.0.0.1:8000";
videoApi.interceptors.request.use(async config => { const token = await getAccessToken(); if (!token) throw new Error("Vui lòng đăng nhập để sử dụng chức năng này."); config.headers.Authorization = `Bearer ${token}`; return config; });
async function authHeaders(extra: HeadersInit = {}) { const token = await getAccessToken(); if (!token) throw new Error("Vui lòng đăng nhập để sử dụng chức năng này."); return { Authorization: `Bearer ${token}`, ...extra }; }

async function blobError(error: unknown, fallback: string): Promise<never> {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (responseData instanceof Blob) {
      try { const data = JSON.parse(await responseData.text()) as { detail?: string }; if (data.detail) throw new Error(data.detail); }
      catch (reason) { if (reason instanceof Error && reason.message !== "Unexpected end of JSON input") throw reason; }
    }
    throw new Error(error.response ? `${fallback} (HTTP ${error.response.status})` : "Không thể kết nối backend video. Hãy kiểm tra backend và Cloudflare Tunnel.");
  }
  throw error instanceof Error ? error : new Error(fallback);
}

export async function downloadVideo(url: string, quality: string, browser: string) {
  const body = new FormData();
  body.append("url", url); body.append("quality", quality); body.append("cookie_browser", browser);
  try { return (await videoApi.post<Blob>("/downloads/fetch", body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return await blobError(error, "Không thể tải video."); }
}

export async function compressVideo(file: File, preset: string, format: string) {
  const body = new FormData(); body.append("file", file); body.append("preset", preset); body.append("output_format", format);
  try { return (await videoApi.post<Blob>("/compression/process", body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return await blobError(error, "Không thể nén video."); }
}

async function audioOperation(path: string, file: File) {
  const body = new FormData(); body.append("file", file);
  try { return (await videoApi.post<Blob>(path, body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return await blobError(error, "Không thể xử lý âm thanh."); }
}
export const extractAudio = (file: File) => audioOperation("/audio/extract", file);
export const muteVideo = (file: File) => audioOperation("/audio/mute", file);

export async function renderVideoProject(clips: File[], trims: Array<{ start: number; end: number }>, texts: Array<{ text: string; start: number; end: number }>, music: File | null) {
  const body = new FormData();
  clips.forEach(clip => body.append("clips", clip));
  body.append("trims", JSON.stringify(trims)); body.append("texts", JSON.stringify(texts)); body.append("cut_mode", "accurate");
  if (music) body.append("music", music);
  try { return (await videoApi.post<Blob>("/editor/render", body, { responseType: "blob", timeout: 0 })).data; }
  catch (error) { return await blobError(error, "Không thể xuất dự án video."); }
}

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as { detail?: string };
  if (!response.ok) throw new Error(data.detail || "Có lỗi xảy ra.");
  return data as T;
}
export type DocumentJob = { job_id: string; status?: string; output_file?: string; download_url?: string; [key: string]: unknown };
export async function convertDocument(file: File, settings: Record<string, unknown>) {
  const call = async (path: string, init: RequestInit, step: string) => {
    try { return await fetch(`${documentBase}${path}`, init); }
    catch { throw new Error(`Mất kết nối backend tài liệu khi ${step}. Hãy kiểm tra backend và Cloudflare Tunnel.`); }
  };
  const job = await json<DocumentJob>(await call("/api/jobs", { method: "POST", headers: await authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(settings) }, "tạo tác vụ"));
  const upload = new FormData(); upload.append("job_id", job.job_id); upload.append("file", file);
  await json(await call("/api/upload", { method: "POST", headers: await authHeaders(), body: upload }, "tải tệp lên"));
  return json<DocumentJob>(await call("/api/convert", { method: "POST", headers: await authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ job_id: job.job_id }) }, "chuyển đổi"));
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function documentDownloadUrl(job: DocumentJob) {
  if (job.download_url) return job.download_url.startsWith("http") ? job.download_url : `${documentBase}${job.download_url}`;
  return `${documentBase}/api/jobs/${job.job_id}/download`;
}
export async function downloadDocument(job: DocumentJob) {
  const response = await fetch(documentDownloadUrl(job), { headers: await authHeaders() });
  if (!response.ok) return responseError(response, "Không thể tải tài liệu.");
  return { blob: await response.blob(), filename: responseFilename(response, `loca-document.${String(job.output_file || "docx").split(".").pop() || "docx"}`) };
}

export type PdfInfo = { filename: string; size: number; pages: number };
export type DownloadResult = { blob: Blob; filename: string };

async function responseError(response: Response, fallback: string): Promise<never> {
  try { const data = await response.json() as { detail?: string }; throw new Error(data.detail || fallback); }
  catch (error) { if (error instanceof Error && error.message !== "Unexpected end of JSON input") throw error; }
  throw new Error(fallback);
}

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) { try { return decodeURIComponent(utf[1]); } catch { return utf[1]; } }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export async function inspectPdf(file: File): Promise<PdfInfo> {
  const body = new FormData(); body.append("file", file);
  const response = await fetch(`${documentBase}/api/pdf/info`, { method: "POST", headers: await authHeaders(), body });
  if (!response.ok) return responseError(response, "Không thể đọc thông tin PDF.");
  return response.json() as Promise<PdfInfo>;
}

export async function splitPdf(file: File, pageRanges: string, outputMode: "merged" | "separate", outputName: string): Promise<DownloadResult> {
  const body = new FormData(); body.append("file", file); body.append("page_ranges", pageRanges); body.append("output_mode", outputMode); body.append("output_name", outputName);
  const response = await fetch(`${documentBase}/api/pdf/split`, { method: "POST", headers: await authHeaders(), body });
  if (!response.ok) return responseError(response, "Không thể cắt PDF.");
  const fallback = outputMode === "separate" && pageRanges.includes("|") ? `${outputName || "document_cut"}.zip` : `${outputName || "document_cut"}.pdf`;
  return { blob: await response.blob(), filename: responseFilename(response, fallback) };
}

export async function mergePdfs(files: File[], outputName: string): Promise<DownloadResult> {
  const body = new FormData(); files.forEach(file => body.append("files[]", file)); body.append("output_name", outputName);
  const response = await fetch(`${documentBase}/api/pdf/merge`, { method: "POST", headers: await authHeaders(), body });
  if (!response.ok) return responseError(response, "Không thể nối PDF.");
  return { blob: await response.blob(), filename: responseFilename(response, `${outputName || "merged-document"}.pdf`) };
}
