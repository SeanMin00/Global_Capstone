"use client";

import { useEffect, useRef, useState } from "react";

type BaseRegion = "NA" | "EU" | "ASIA";
type RegionCode =
  | BaseRegion
  | "US"
  | "CA"
  | "KR"
  | "CN"
  | "JP"
  | "TW"
  | "HK"
  | "SG"
  | "IN"
  | "DE"
  | "UK"
  | "FR";

type RiskLevel = "low" | "moderate" | "high" | null;

type RegionSummary = {
  region: RegionCode;
  region_name: string;
  sentiment: number;
  count: number;
};

type MapRisk = {
  score: number | null;
  level: RiskLevel;
};

type Props = {
  selectedRegion: RegionCode;
  mapFocusRegion: BaseRegion | null;
  mapRegionLookup: Map<RegionCode, RegionSummary>;
  detailRegionsByGroup: Record<BaseRegion, RegionSummary[]>;
  aggregateRiskForRegion: Map<RegionCode, MapRisk>;
  mapRegionSegments: Map<RegionCode, string[]>;
  onSelectRegion: (region: RegionCode) => void;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  code: Exclude<RegionCode, BaseRegion> | null;
};

const SCRIPT_D3 = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js";
const SCRIPT_TOPOJSON = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const NUMERIC_TO_REGION: Record<number, Exclude<RegionCode, BaseRegion>> = {
  840: "US",
  124: "CA",
  410: "KR",
  156: "CN",
  392: "JP",
  158: "TW",
  344: "HK",
  702: "SG",
  356: "IN",
  276: "DE",
  826: "UK",
  250: "FR",
};

const DETAIL_TO_PARENT: Record<Exclude<RegionCode, BaseRegion>, BaseRegion> = {
  US: "NA",
  CA: "NA",
  KR: "ASIA",
  CN: "ASIA",
  JP: "ASIA",
  TW: "ASIA",
  HK: "ASIA",
  SG: "ASIA",
  IN: "ASIA",
  DE: "EU",
  UK: "EU",
  FR: "EU",
};

type ExternalWindow = Window & {
  d3?: any;
  topojson?: any;
};

function loadScript(src: string, globalName: "d3" | "topojson") {
  return new Promise<void>((resolve, reject) => {
    const win = window as ExternalWindow;
    if (win[globalName]) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[data-global="${globalName}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${globalName}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.global = globalName;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${globalName}`));
    document.head.appendChild(script);
  });
}

function parentOf(region: Exclude<RegionCode, BaseRegion>) {
  return DETAIL_TO_PARENT[region];
}

function sentimentFill(score: number) {
  if (score > 0.2) return "#183d2a";
  if (score < -0.2) return "#3f1818";
  return "#4a3810";
}

function riskStroke(level: RiskLevel) {
  if (level === "low") return "#22c55e";
  if (level === "moderate") return "#f59e0b";
  if (level === "high") return "#ef4444";
  return "rgba(56, 189, 248, 0.16)";
}

function selectionApplies(
  selectedRegion: RegionCode,
  mapFocusRegion: BaseRegion | null,
  region: Exclude<RegionCode, BaseRegion>,
) {
  if (mapFocusRegion) {
    if (selectedRegion === region) return true;
    return parentOf(region) === mapFocusRegion;
  }

  if (selectedRegion === region) return true;
  if (selectedRegion === parentOf(region)) return true;
  return false;
}

function exactSelectionApplies(selectedRegion: RegionCode, region: Exclude<RegionCode, BaseRegion>) {
  return selectedRegion === region;
}

export default function SentimentWorldMap({
  selectedRegion,
  mapFocusRegion,
  mapRegionLookup,
  detailRegionsByGroup,
  aggregateRiskForRegion,
  mapRegionSegments,
  onSelectRegion,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [mapError, setMapError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    code: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await Promise.all([
          loadScript(SCRIPT_TOPOJSON, "topojson"),
          loadScript(SCRIPT_D3, "d3"),
        ]);

        const response = await fetch(WORLD_ATLAS_URL);
        if (!response.ok) {
          throw new Error(`Map request failed with ${response.status}`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setWorldData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Map failed to load");
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const win = window as ExternalWindow;
    if (!container || !worldData || !win.d3 || !win.topojson) {
      return;
    }

    const d3 = win.d3;
    const topojson = win.topojson;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 560;

    const visibleCountries = mapFocusRegion
      ? new Set(
          detailRegionsByGroup[mapFocusRegion].map(
            (item) => item.region as Exclude<RegionCode, BaseRegion>,
          ),
        )
      : new Set(Object.keys(DETAIL_TO_PARENT) as Exclude<RegionCode, BaseRegion>[]);

    const svg = d3
      .select(container)
      .html("")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", "world-map-svg");

    const countries = topojson.feature(worldData, worldData.objects.countries).features;
    const focusFeatures = countries.filter((feature: { id: string | number }) => {
      const code = NUMERIC_TO_REGION[Number(feature.id)];
      if (!code) return false;
      if (!mapFocusRegion) return true;
      return visibleCountries.has(code);
    });

    const projection = d3.geoNaturalEarth1();
    const targetFeatures = focusFeatures.length ? focusFeatures : countries;

    projection.fitExtent(
      mapFocusRegion
        ? [
            [54, 34],
            [width - 54, height - 30],
          ]
        : [
            [18, 20],
            [width - 18, height - 18],
          ],
      {
        type: "FeatureCollection",
        features: targetFeatures,
      },
    );

    const path = d3.geoPath().projection(projection);

    svg
      .append("g")
      .selectAll("path")
      .data(countries)
      .enter()
      .append("path")
      .attr("class", "world-country")
      .attr("d", path)
      .attr("fill", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return "#101926";

        const summary =
          mapRegionLookup.get(code) ?? mapRegionLookup.get(parentOf(code));

        if (!summary) return "#101926";

        if (mapFocusRegion && !visibleCountries.has(code)) {
          return "#111a25";
        }

        return sentimentFill(summary.sentiment);
      })
      .attr("opacity", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return 0.58;
        if (mapFocusRegion && !visibleCountries.has(code)) return 0.22;
        return selectionApplies(selectedRegion, mapFocusRegion, code) ? 0.96 : 0.78;
      })
      .attr("stroke", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return "rgba(56, 189, 248, 0.14)";

        const risk = aggregateRiskForRegion.get(code) ?? { score: null, level: null };
        if (exactSelectionApplies(selectedRegion, code)) {
          return "#00e5ff";
        }

        if (selectionApplies(selectedRegion, mapFocusRegion, code)) {
          return "rgba(0, 229, 255, 0.34)";
        }

        return riskStroke(risk.level);
      })
      .attr("stroke-width", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return 0.6;
        if (exactSelectionApplies(selectedRegion, code)) return 1.8;
        return selectionApplies(selectedRegion, mapFocusRegion, code) ? 1.05 : 0.65;
      })
      .style("filter", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return null;
        if (exactSelectionApplies(selectedRegion, code)) {
          return "drop-shadow(0 0 10px rgba(0, 229, 255, 0.42))";
        }
        if (selectionApplies(selectedRegion, mapFocusRegion, code)) {
          return "drop-shadow(0 0 6px rgba(0, 229, 255, 0.18))";
        }
        return null;
      })
      .style("cursor", (feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        return code ? "pointer" : "default";
      })
      .on("mouseenter", (event: MouseEvent, feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return;
        setTooltip({
          visible: true,
          x: Math.min(event.clientX + 18, window.innerWidth - 280),
          y: Math.min(event.clientY - 12, window.innerHeight - 220),
          code,
        });
      })
      .on("mousemove", (event: MouseEvent, feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return;
        setTooltip({
          visible: true,
          x: Math.min(event.clientX + 18, window.innerWidth - 280),
          y: Math.min(event.clientY - 12, window.innerHeight - 220),
          code,
        });
      })
      .on("mouseleave", () => {
        setTooltip((current) => ({ ...current, visible: false, code: null }));
      })
      .on("click", (_event: MouseEvent, feature: { id: string | number }) => {
        const code = NUMERIC_TO_REGION[Number(feature.id)];
        if (!code) return;
        onSelectRegion(code);
      });
  }, [
    aggregateRiskForRegion,
    detailRegionsByGroup,
    mapFocusRegion,
    mapRegionLookup,
    onSelectRegion,
    selectedRegion,
    worldData,
  ]);

  const tooltipRegion = tooltip.code ? mapRegionLookup.get(tooltip.code) : null;
  const tooltipRisk = tooltip.code ? aggregateRiskForRegion.get(tooltip.code) : null;
  const tooltipSegments = tooltip.code ? mapRegionSegments.get(tooltip.code) : null;

  return (
    <>
      <div ref={containerRef} className="world-map-canvas">
        {mapError ? <div className="map-fallback-copy">Map failed to load: {mapError}</div> : null}
      </div>
      {tooltip.visible && tooltip.code && tooltipRegion ? (
        <div
          className="map-tooltip-card"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="map-tooltip-top">
            <strong>{tooltipRegion.region_name}</strong>
            <span className={`map-tooltip-risk ${(tooltipRisk?.level ?? "none").toString()}`}>
              {tooltipRisk?.level ? `${tooltipRisk.level} risk` : "Risk N/A"}
            </span>
          </div>
          <div className="map-tooltip-meta">
            <span>Top Segments</span>
            <small>{tooltipSegments?.length ? tooltipSegments.join(" · ") : "No segment data"}</small>
          </div>
        </div>
      ) : null}
    </>
  );
}
