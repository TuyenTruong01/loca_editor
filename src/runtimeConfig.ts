export type RuntimeConfig = {
  appMode: "web" | "desktop";
  videoApiBase: string;
  documentApiBase: string;
  authenticationEnabled: boolean;
  cloudflareEnabled: boolean;
};

const fallback: RuntimeConfig = {
  appMode: "web",
  videoApiBase: import.meta.env.VITE_VIDEO_API_BASE || "http://127.0.0.1:8765/api",
  documentApiBase: import.meta.env.VITE_DOCUMENT_API_BASE || "http://127.0.0.1:8000",
  authenticationEnabled: true,
  cloudflareEnabled: true,
};

let current = fallback;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config/app-config.json`, { cache: "no-store" });
    if (response.ok) current = { ...fallback, ...(await response.json()) };
  } catch {
    current = fallback;
  }
  return current;
}

export function getRuntimeConfig(): RuntimeConfig {
  return current;
}

export const isDesktopMode = () => getRuntimeConfig().appMode === "desktop";
