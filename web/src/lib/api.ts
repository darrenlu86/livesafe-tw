import type { RiskReport } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

export async function fetchReport(address: string): Promise<RiskReport> {
  const url = `${API_BASE}/api/report?address=${encodeURIComponent(address)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as {
      error?: string;
      hint?: string;
    };
    throw new Error(body.hint ?? body.error ?? `HTTP ${resp.status}`);
  }
  return (await resp.json()) as RiskReport;
}
