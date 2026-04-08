"use client";

import Map, { Marker, NavigationControl } from "react-map-gl";

import type { RegionSentimentPoint } from "@/lib/mock-data";

type MapPanelProps = {
  points: RegionSentimentPoint[];
};

function dotColor(sentiment: number) {
  if (sentiment > 0.15) return "#00A6A6";
  if (sentiment < -0.05) return "#F07167";
  return "#F6C177";
}

export function MapPanel({ points }: MapPanelProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/20 bg-white/70 p-6">
        <p className="text-sm font-medium text-ink">Mapbox token not set</p>
        <p className="mt-2 text-sm text-ink/70">
          Add `NEXT_PUBLIC_MAPBOX_TOKEN` to render the live map. The cards below still
          show the same region data.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {points.map((point) => (
            <div key={point.region_code} className="rounded-2xl border border-ink/10 bg-mist p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{point.region_name}</p>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: dotColor(point.sentiment_score) }}
                />
              </div>
              <p className="mt-2 text-sm text-ink/70">{point.top_topic}</p>
              <div className="mt-4 flex gap-4 text-xs text-ink/60">
                <span>Sentiment {point.sentiment_score.toFixed(2)}</span>
                <span>Fear {point.fear_score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <Map
        initialViewState={{ latitude: 20, longitude: 15, zoom: 1.2 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        style={{ width: "100%", height: 520 }}
      >
        <NavigationControl position="top-right" />
        {points.map((point) => (
          <Marker
            key={point.region_code}
            latitude={point.latitude}
            longitude={point.longitude}
            anchor="bottom"
          >
            <div className="rounded-full border-4 border-white bg-white/90 px-3 py-2 text-xs shadow-lg">
              <div
                className="mx-auto mb-2 h-3 w-3 rounded-full"
                style={{ backgroundColor: dotColor(point.sentiment_score) }}
              />
              <p className="font-semibold text-ink">{point.region_name}</p>
              <p className="text-[11px] text-ink/60">
                S {point.sentiment_score.toFixed(2)} / F {point.fear_score}
              </p>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}

