"use client";

import type { DimensionKey } from "./types";

const KEY = "livesafe:disabled-dims";

function safeGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function safeSet(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* quota */
  }
}

export function getDisabledDims(): Set<DimensionKey> {
  const raw = safeGet();
  if (!raw) return new Set();
  try {
    const list = JSON.parse(raw) as DimensionKey[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function setDisabledDims(set: Set<DimensionKey>): void {
  safeSet(JSON.stringify(Array.from(set)));
}

export function toggleDimension(key: DimensionKey): Set<DimensionKey> {
  const current = getDisabledDims();
  if (current.has(key)) current.delete(key);
  else current.add(key);
  setDisabledDims(current);
  return current;
}

export function resetWeights(): void {
  safeSet("[]");
}
