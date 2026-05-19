"use client";

import type { RiskReport } from "./types";

const KEY_RECENT = "livesafe:recent";
const KEY_COMPARE = "livesafe:compare";
const MAX_RECENT = 12;

export interface StoredReport {
  id: string;
  address: string;
  display_name?: string;
  lat: number;
  lng: number;
  overall_grade: RiskReport["overall"]["grade"];
  overall_score: number;
  scores: {
    earthquake: number;
    air_quality: number;
    healthcare: number;
    amenities: number;
    transit: number;
  };
  saved_at: string;
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota exceeded — ignore */
  }
}

function toStored(report: RiskReport): StoredReport {
  return {
    id: `${report.query.lat.toFixed(5)},${report.query.lng.toFixed(5)}`,
    address: report.query.address,
    display_name: report.query.geocode_display_name,
    lat: report.query.lat,
    lng: report.query.lng,
    overall_grade: report.overall.grade,
    overall_score: report.overall.score,
    scores: {
      earthquake: report.dimensions.earthquake.score,
      air_quality: report.dimensions.air_quality.score,
      healthcare: report.dimensions.healthcare.score,
      amenities: report.dimensions.amenities.score,
      transit: report.dimensions.transit.score,
    },
    saved_at: new Date().toISOString(),
  };
}

export function recordRecent(report: RiskReport): void {
  const list = listRecent();
  const stored = toStored(report);
  const filtered = list.filter((r) => r.id !== stored.id);
  const next = [stored, ...filtered].slice(0, MAX_RECENT);
  safeSet(KEY_RECENT, JSON.stringify(next));
}

export function listRecent(): StoredReport[] {
  const raw = safeGet(KEY_RECENT);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredReport[];
  } catch {
    return [];
  }
}

export function clearRecent(): void {
  safeSet(KEY_RECENT, "[]");
}

export function listCompare(): string[] {
  const raw = safeGet(KEY_COMPARE);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function isInCompare(address: string): boolean {
  return listCompare().includes(address);
}

export function toggleCompare(address: string): boolean {
  const current = listCompare();
  let next: string[];
  if (current.includes(address)) {
    next = current.filter((a) => a !== address);
  } else {
    next = [...current, address].slice(-4);
  }
  safeSet(KEY_COMPARE, JSON.stringify(next));
  return next.includes(address);
}

export function clearCompare(): void {
  safeSet(KEY_COMPARE, "[]");
}
