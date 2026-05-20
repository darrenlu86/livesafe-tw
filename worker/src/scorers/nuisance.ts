/**
 * 周邊嫌惡設施扣分 — OSM POI 距離扣分
 *
 * 類別與扣分（每類 cap）：
 *   變電所 substation:     <100m -25, <300m -10, <500m -5
 *   殯儀館 funeral_hall:   <300m -20, <500m -12, <1km  -5
 *   火葬場 crematorium:    <500m -25, <1km  -15, <2km  -5
 *   墓地  cemetery:        <200m -10, <500m  -5
 *   垃圾場 landfill:       <500m -25, <1km  -12, <2km  -5
 *   焚化廠 incinerator:    <1km  -25, <2km  -12
 *   監獄  prison:          <500m -15, <1km   -8
 *
 * base = 100
 * total penalty cap = -60 (最低 40 分)
 */
import { haversineKm } from "./healthcare";
import type { Coords, NuisanceCategory, NuisancePoi, NuisanceRisk } from "../types";

import nuisanceRaw from "../data/osm_nuisance.json";

interface RawPoi {
  name: string | null;
  lat: number;
  lng: number;
}
interface NuisanceDataset {
  metadata: { source: string; fetched_at: string };
  substation: RawPoi[];
  funeral_hall: RawPoi[];
  crematorium: RawPoi[];
  cemetery: RawPoi[];
  landfill: RawPoi[];
  incinerator: RawPoi[];
  prison: RawPoi[];
}

const data = nuisanceRaw as unknown as NuisanceDataset;

const CATEGORIES: NuisanceCategory[] = [
  "substation",
  "funeral_hall",
  "crematorium",
  "cemetery",
  "landfill",
  "incinerator",
  "prison",
];

const LABEL: Record<NuisanceCategory, string> = {
  substation: "變電所",
  funeral_hall: "殯儀館",
  crematorium: "火葬場",
  cemetery: "墓地",
  landfill: "垃圾掩埋場",
  incinerator: "焚化廠",
  prison: "監獄",
};

const SEARCH_RADIUS_KM: Record<NuisanceCategory, number> = {
  substation: 0.5,
  funeral_hall: 1.0,
  crematorium: 2.0,
  cemetery: 0.5,
  landfill: 2.0,
  incinerator: 2.0,
  prison: 1.0,
};

function penalty(category: NuisanceCategory, km: number): number {
  switch (category) {
    case "substation":
      return km < 0.1 ? 25 : km < 0.3 ? 10 : km < 0.5 ? 5 : 0;
    case "funeral_hall":
      return km < 0.3 ? 20 : km < 0.5 ? 12 : km < 1 ? 5 : 0;
    case "crematorium":
      return km < 0.5 ? 25 : km < 1 ? 15 : km < 2 ? 5 : 0;
    case "cemetery":
      return km < 0.2 ? 10 : km < 0.5 ? 5 : 0;
    case "landfill":
      return km < 0.5 ? 25 : km < 1 ? 12 : km < 2 ? 5 : 0;
    case "incinerator":
      return km < 1 ? 25 : km < 2 ? 12 : 0;
    case "prison":
      return km < 0.5 ? 15 : km < 1 ? 8 : 0;
  }
}

export function scoreNuisance(target: Coords): NuisanceRisk {
  const nearestByCategory: Record<string, NuisancePoi | null> = {};
  const nearbyPois: NuisancePoi[] = [];
  let totalPenalty = 0;
  for (const cat of CATEGORIES) {
    const items = (data[cat] ?? []) as RawPoi[];
    let nearest: NuisancePoi | null = null;
    let nearestKm = Infinity;
    let catPenalty = 0;
    for (const p of items) {
      const dKm = haversineKm(target, p);
      if (dKm < nearestKm) {
        nearestKm = dKm;
        nearest = {
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          category: cat,
          distance_km: Number(dKm.toFixed(2)),
        };
      }
      const pen = penalty(cat, dKm);
      if (pen > catPenalty) catPenalty = pen;
      // 收集 search radius 內的 POI
      if (dKm <= SEARCH_RADIUS_KM[cat]) {
        nearbyPois.push({
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          category: cat,
          distance_km: Number(dKm.toFixed(2)),
        });
      }
    }
    nearestByCategory[cat] = nearest;
    totalPenalty += catPenalty;
  }
  totalPenalty = Math.min(60, totalPenalty);
  const score = Math.max(40, 100 - totalPenalty);
  nearbyPois.sort((a, b) => a.distance_km - b.distance_km);

  const triggered = Object.entries(nearestByCategory)
    .filter(([cat, p]) => p && penalty(cat as NuisanceCategory, p.distance_km) > 0)
    .map(([cat]) => LABEL[cat as NuisanceCategory]);
  const noteParts = [
    `周邊嫌惡設施 OSM 資料代理，base 100、各類距離分級扣分上限 60`,
  ];
  if (triggered.length) {
    noteParts.push(`觸發扣分類別：${triggered.join("、")}`);
  }

  return {
    score,
    total_penalty: totalPenalty,
    nearest_by_category: nearestByCategory,
    nearby_pois: nearbyPois.slice(0, 12),
    proxy_note: noteParts.join("。"),
  };
}
