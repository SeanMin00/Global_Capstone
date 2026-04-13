"use client";

import { useEffect, useMemo, useState } from "react";

type RegionArticle = {
  title: string;
  source: string;
  url: string;
  sentiment: number;
};

type BaseRegion = "NA" | "EU" | "ASIA";
type RegionCode = BaseRegion | "US" | "CA" | "KR" | "CN" | "JP" | "TW" | "HK" | "SG" | "IN" | "DE" | "UK" | "FR";

type RegionSummary = {
  region: RegionCode;
  region_name: string;
  sentiment: number;
  count: number;
  color: string;
  summary: string;
  articles: RegionArticle[];
};

type MarketRiskSnapshot = {
  country: string;
  iso_code: string;
  market_risk_score: number;
  risk_level: "low" | "moderate" | "high";
  component_scores: {
    volatility: number;
    beta: number;
    fx_risk: number;
  };
  raw_metrics: {
    realized_vol_30d: number | null;
    beta_60d: number | null;
    fx_vol_30d: number | null;
    market_return_60d: number | null;
    benchmark_return_60d: number | null;
    vix_close: number | null;
  };
  data_source_used: string[];
  as_of_date: string;
  last_updated_timestamp: string;
  short_explanation: string;
};

type ViewMode = "map" | "chart" | "pf" | "personal";
type ChartMode = "heatmap" | "structure";
type StructureViewMode = "country" | "segment";
type TrendType = "Reactive" | "Structural";

type HeatmapStock = {
  ticker: string;
  name: string;
  sector: string;
  region: BaseRegion;
  detailRegion?: Exclude<RegionCode, BaseRegion>;
  change: number;
  marketCap: number;
  size: "lg" | "md" | "sm";
};

type StructureSegment = {
  segment: string;
  trendType: TrendType;
  trendSummary: string;
  avgMarketCap: number;
  avgRoi1Y: number;
  companies: {
    name: string;
    ticker: string;
    marketCap: number;
    roi1Y: number;
    note: string;
  }[];
};

type AggregatedSegment = {
  segment: string;
  trendType: TrendType;
  trendSummary: string;
  avgMarketCap: number;
  avgRoi1Y: number;
  countryCount: number;
  countries: Exclude<RegionCode, BaseRegion>[];
  companies: {
    name: string;
    ticker: string;
    marketCap: number;
    roi1Y: number;
    note: string;
    country: Exclude<RegionCode, BaseRegion>;
  }[];
};

const BASE_REGIONS: BaseRegion[] = ["NA", "EU", "ASIA"];
const NA_DETAIL_REGIONS: RegionCode[] = ["US", "CA"];
const ASIA_DETAIL_REGIONS: RegionCode[] = ["KR", "CN", "JP", "TW", "HK", "SG", "IN"];
const EU_DETAIL_REGIONS: RegionCode[] = ["DE", "UK", "FR"];
const DETAIL_REGIONS: Record<BaseRegion, RegionCode[]> = {
  NA: NA_DETAIL_REGIONS,
  ASIA: ASIA_DETAIL_REGIONS,
  EU: EU_DETAIL_REGIONS,
};
const ALL_DETAIL_REGIONS = [...NA_DETAIL_REGIONS, ...ASIA_DETAIL_REGIONS, ...EU_DETAIL_REGIONS];
const MARKET_RISK_COUNTRIES = new Set<RegionCode>([
  "US",
  "CA",
  "KR",
  "JP",
  "CN",
  "TW",
  "HK",
  "SG",
  "IN",
  "DE",
  "UK",
  "FR",
]);

const regionLabels: Record<RegionCode, string> = {
  NA: "🌎 NA",
  US: "🇺🇸 US",
  EU: "🇪🇺 EU",
  ASIA: "🌏 ASIA",
  CA: "🇨🇦 CA",
  KR: "🇰🇷 KR",
  CN: "🇨🇳 CN",
  JP: "🇯🇵 JP",
  TW: "🇹🇼 TW",
  HK: "🇭🇰 HK",
  SG: "🇸🇬 SG",
  IN: "🇮🇳 IN",
  DE: "🇩🇪 DE",
  UK: "🇬🇧 UK",
  FR: "🇫🇷 FR",
};

const regionPositions: Record<RegionCode, { top: string; left: string }> = {
  NA: { top: "40%", left: "24%" },
  US: { top: "46%", left: "28%" },
  EU: { top: "33%", left: "53%" },
  ASIA: { top: "45%", left: "77%" },
  CA: { top: "31%", left: "22%" },
  KR: { top: "39%", left: "83%" },
  CN: { top: "44%", left: "75%" },
  JP: { top: "34%", left: "87%" },
  TW: { top: "41.5%", left: "79.5%" },
  HK: { top: "46.5%", left: "80.5%" },
  SG: { top: "58%", left: "78.5%" },
  IN: { top: "56%", left: "67%" },
  DE: { top: "33%", left: "56%" },
  UK: { top: "29%", left: "50%" },
  FR: { top: "38%", left: "52.5%" },
};

const focusedRegionPositions: Record<BaseRegion, Partial<Record<RegionCode, { top: string; left: string }>>> = {
  NA: {
    US: { top: "50%", left: "58%" },
    CA: { top: "30%", left: "38%" },
  },
  ASIA: {
    KR: { top: "34%", left: "30%" },
    CN: { top: "54%", left: "45%" },
    JP: { top: "24%", left: "66%" },
    TW: { top: "42%", left: "75%" },
    HK: { top: "56%", left: "63%" },
    SG: { top: "67%", left: "57%" },
    IN: { top: "63%", left: "24%" },
  },
  EU: {
    UK: { top: "30%", left: "28%" },
    DE: { top: "44%", left: "56%" },
    FR: { top: "62%", left: "38%" },
  },
};

const heatmapStocks: HeatmapStock[] = [
  { ticker: "AAPL", name: "Apple", sector: "Technology", region: "NA", detailRegion: "US", change: 1.42, marketCap: 2950, size: "lg" },
  { ticker: "MSFT", name: "Microsoft", sector: "Technology", region: "NA", detailRegion: "US", change: 2.14, marketCap: 3150, size: "lg" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology", region: "NA", detailRegion: "US", change: 3.28, marketCap: 2650, size: "lg" },
  { ticker: "JPM", name: "JPMorgan", sector: "Financial", region: "NA", detailRegion: "US", change: -0.74, marketCap: 620, size: "md" },
  { ticker: "RY", name: "Royal Bank of Canada", sector: "Financial", region: "NA", detailRegion: "CA", change: 0.54, marketCap: 155, size: "md" },
  { ticker: "SHOP", name: "Shopify", sector: "Technology", region: "NA", detailRegion: "CA", change: 1.92, marketCap: 110, size: "md" },
  { ticker: "XOM", name: "Exxon", sector: "Energy", region: "NA", detailRegion: "US", change: -1.81, marketCap: 510, size: "md" },
  { ticker: "SAP", name: "SAP", sector: "Technology", region: "EU", detailRegion: "DE", change: 1.26, marketCap: 250, size: "lg" },
  { ticker: "ASML", name: "ASML", sector: "Technology", region: "EU", change: 2.02, marketCap: 390, size: "lg" },
  { ticker: "SIE", name: "Siemens", sector: "Industrials", region: "EU", detailRegion: "DE", change: -0.62, marketCap: 150, size: "md" },
  { ticker: "MC", name: "LVMH", sector: "Consumer Cyclical", region: "EU", detailRegion: "FR", change: 0.41, marketCap: 360, size: "md" },
  { ticker: "BP", name: "BP", sector: "Energy", region: "EU", detailRegion: "UK", change: -1.22, marketCap: 120, size: "sm" },
  { ticker: "TSM", name: "TSMC", sector: "Technology", region: "ASIA", detailRegion: "TW", change: 2.84, marketCap: 890, size: "lg" },
  { ticker: "SONY", name: "Sony", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 0.93, marketCap: 150, size: "md" },
  { ticker: "BABA", name: "Alibaba", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "CN", change: -2.17, marketCap: 210, size: "lg" },
  { ticker: "005930", name: "Samsung", sector: "Technology", region: "ASIA", detailRegion: "KR", change: 1.73, marketCap: 420, size: "lg" },
  { ticker: "0700", name: "Tencent", sector: "Communication Services", region: "ASIA", detailRegion: "HK", change: 1.04, marketCap: 470, size: "lg" },
  { ticker: "1299", name: "AIA", sector: "Financial", region: "ASIA", detailRegion: "HK", change: 0.61, marketCap: 140, size: "md" },
  { ticker: "D05", name: "DBS", sector: "Financial", region: "ASIA", detailRegion: "SG", change: 0.37, marketCap: 95, size: "md" },
  { ticker: "U11", name: "UOB", sector: "Financial", region: "ASIA", detailRegion: "SG", change: 0.22, marketCap: 48, size: "sm" },
  { ticker: "INFY", name: "Infosys", sector: "Technology", region: "ASIA", detailRegion: "IN", change: 1.13, marketCap: 78, size: "md" },
  { ticker: "HDBK", name: "HDFC Bank", sector: "Financial", region: "ASIA", detailRegion: "IN", change: 0.46, marketCap: 145, size: "md" },
  { ticker: "HDB", name: "HDFC Bank", sector: "Financial", region: "ASIA", change: -0.38, marketCap: 145, size: "sm" },
  { ticker: "GOOG", name: "Alphabet", sector: "Communication Services", region: "NA", detailRegion: "US", change: 1.12, marketCap: 2150, size: "lg" },
  { ticker: "META", name: "Meta", sector: "Communication Services", region: "NA", detailRegion: "US", change: -0.61, marketCap: 1320, size: "md" },
  { ticker: "AMZN", name: "Amazon", sector: "Consumer Cyclical", region: "NA", detailRegion: "US", change: 1.58, marketCap: 1960, size: "lg" },
  { ticker: "TSLA", name: "Tesla", sector: "Consumer Cyclical", region: "NA", detailRegion: "US", change: -2.44, marketCap: 610, size: "md" },
  { ticker: "WMT", name: "Walmart", sector: "Consumer Defensive", region: "NA", detailRegion: "US", change: 0.44, marketCap: 540, size: "md" },
  { ticker: "KO", name: "Coca-Cola", sector: "Consumer Defensive", region: "NA", detailRegion: "US", change: 0.31, marketCap: 290, size: "sm" },
  { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare", region: "NA", detailRegion: "US", change: 2.37, marketCap: 770, size: "lg" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", region: "NA", detailRegion: "US", change: -0.29, marketCap: 380, size: "md" },
  { ticker: "CAT", name: "Caterpillar", sector: "Industrials", region: "NA", detailRegion: "US", change: 0.72, marketCap: 165, size: "md" },
  { ticker: "BA", name: "Boeing", sector: "Industrials", region: "NA", detailRegion: "US", change: -1.46, marketCap: 120, size: "md" },
  { ticker: "PLD", name: "Prologis", sector: "Real Estate", region: "NA", detailRegion: "US", change: 0.17, marketCap: 110, size: "sm" },
  { ticker: "AMT", name: "American Tower", sector: "Real Estate", region: "NA", detailRegion: "US", change: -0.41, marketCap: 95, size: "sm" },
  { ticker: "NEE", name: "NextEra", sector: "Utilities", region: "NA", detailRegion: "US", change: 0.23, marketCap: 145, size: "sm" },
  { ticker: "DUK", name: "Duke Energy", sector: "Utilities", region: "NA", detailRegion: "US", change: -0.18, marketCap: 85, size: "sm" },
  { ticker: "LIN", name: "Linde", sector: "Basic Materials", region: "EU", detailRegion: "DE", change: 0.96, marketCap: 210, size: "md" },
  { ticker: "RIO", name: "Rio Tinto", sector: "Basic Materials", region: "EU", detailRegion: "UK", change: -1.09, marketCap: 115, size: "md" },
  { ticker: "BNP", name: "BNP Paribas", sector: "Financial", region: "EU", detailRegion: "FR", change: -0.34, marketCap: 90, size: "md" },
  { ticker: "ADS", name: "Adidas", sector: "Consumer Cyclical", region: "EU", detailRegion: "DE", change: 0.67, marketCap: 45, size: "sm" },
  { ticker: "NESN", name: "Nestle", sector: "Consumer Defensive", region: "EU", change: -0.22, marketCap: 310, size: "sm" },
  { ticker: "NVO", name: "Novo Nordisk", sector: "Healthcare", region: "EU", change: 1.81, marketCap: 570, size: "lg" },
  { ticker: "ENEL", name: "Enel", sector: "Utilities", region: "EU", change: 0.12, marketCap: 70, size: "sm" },
  { ticker: "SU", name: "Schneider", sector: "Industrials", region: "EU", detailRegion: "FR", change: 0.58, marketCap: 130, size: "sm" },
  { ticker: "REL", name: "Relx", sector: "Communication Services", region: "EU", detailRegion: "UK", change: 0.35, marketCap: 78, size: "sm" },
  { ticker: "AIR", name: "Airbus", sector: "Industrials", region: "EU", detailRegion: "FR", change: -0.87, marketCap: 120, size: "md" },
  { ticker: "PTR", name: "PetroChina", sector: "Energy", region: "ASIA", detailRegion: "CN", change: 0.66, marketCap: 165, size: "md" },
  { ticker: "7203", name: "Toyota", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 1.06, marketCap: 320, size: "lg" },
  { ticker: "9984", name: "SoftBank", sector: "Communication Services", region: "ASIA", detailRegion: "JP", change: -0.93, marketCap: 95, size: "md" },
  { ticker: "6861", name: "Keyence", sector: "Technology", region: "ASIA", detailRegion: "JP", change: 1.24, marketCap: 130, size: "md" },
  { ticker: "1398", name: "ICBC", sector: "Financial", region: "ASIA", detailRegion: "CN", change: 0.28, marketCap: 220, size: "sm" },
  { ticker: "KHC", name: "Hengan", sector: "Consumer Defensive", region: "ASIA", detailRegion: "CN", change: -0.14, marketCap: 35, size: "sm" },
  { ticker: "2317", name: "Foxconn", sector: "Industrials", region: "ASIA", detailRegion: "TW", change: 0.77, marketCap: 85, size: "md" },
  { ticker: "0883", name: "CNOOC", sector: "Energy", region: "ASIA", detailRegion: "CN", change: -1.36, marketCap: 145, size: "sm" },
  { ticker: "3988", name: "Bank of China", sector: "Financial", region: "ASIA", detailRegion: "CN", change: 0.18, marketCap: 150, size: "sm" },
  { ticker: "9618", name: "JD.com", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "CN", change: -1.11, marketCap: 55, size: "md" },
  { ticker: "HMC", name: "Honda", sector: "Consumer Cyclical", region: "ASIA", detailRegion: "JP", change: 0.54, marketCap: 55, size: "sm" },
  { ticker: "4704", name: "Trend Micro", sector: "Technology", region: "ASIA", detailRegion: "JP", change: 0.49, marketCap: 35, size: "sm" },
  { ticker: "TCL", name: "TCL Zhonghuan", sector: "Basic Materials", region: "ASIA", detailRegion: "CN", change: -0.43, marketCap: 24, size: "sm" },
];

const structureData: Partial<Record<Exclude<RegionCode, BaseRegion>, StructureSegment[]>> = {
  US: [
    {
      segment: "Big Tech",
      trendType: "Structural",
      trendSummary: "Cloud, AI, and platform capex remain the dominant long-cycle driver.",
      avgMarketCap: 2800,
      avgRoi1Y: 24,
      companies: [
        { name: "Apple", ticker: "AAPL", marketCap: 2950, roi1Y: 18, note: "Hardware ecosystem and services base." },
        { name: "Microsoft", ticker: "MSFT", marketCap: 3150, roi1Y: 27, note: "AI infrastructure and enterprise software leader." },
        { name: "NVIDIA", ticker: "NVDA", marketCap: 2650, roi1Y: 29, note: "Core beneficiary of AI accelerator demand." },
      ],
    },
    {
      segment: "Consumer Platforms",
      trendType: "Reactive",
      trendSummary: "Ad demand, discretionary spending, and logistics updates move this basket quickly.",
      avgMarketCap: 1760,
      avgRoi1Y: 16,
      companies: [
        { name: "Amazon", ticker: "AMZN", marketCap: 1960, roi1Y: 21, note: "Retail scale plus AWS margin sensitivity." },
        { name: "Meta", ticker: "META", marketCap: 1320, roi1Y: 11, note: "Ad cycle and engagement trends matter most." },
        { name: "Walmart", ticker: "WMT", marketCap: 540, roi1Y: 16, note: "Consumer resilience proxy with defensive tilt." },
      ],
    },
    {
      segment: "Healthcare",
      trendType: "Structural",
      trendSummary: "Drug pipelines and aging demographics make this a durable longer-term segment.",
      avgMarketCap: 575,
      avgRoi1Y: 15,
      companies: [
        { name: "Eli Lilly", ticker: "LLY", marketCap: 770, roi1Y: 25, note: "Obesity and pharma pipeline leadership." },
        { name: "Johnson & Johnson", ticker: "JNJ", marketCap: 380, roi1Y: 8, note: "Defensive healthcare quality name." },
        { name: "AbbVie", ticker: "ABBV", marketCap: 575, roi1Y: 12, note: "Cash generation and drug franchise depth." },
      ],
    },
  ],
  CA: [
    {
      segment: "Banking",
      trendType: "Reactive",
      trendSummary: "Rate expectations and housing sensitivity keep Canadian banks event-driven.",
      avgMarketCap: 110,
      avgRoi1Y: 13,
      companies: [
        { name: "Royal Bank of Canada", ticker: "RY", marketCap: 155, roi1Y: 14, note: "Scale leader across domestic banking and wealth." },
        { name: "TD Bank", ticker: "TD", marketCap: 105, roi1Y: 10, note: "North American retail footprint." },
        { name: "Bank of Montreal", ticker: "BMO", marketCap: 70, roi1Y: 14, note: "Balanced commercial and consumer exposure." },
      ],
    },
    {
      segment: "Energy",
      trendType: "Reactive",
      trendSummary: "Oil and pipeline headlines still dominate short-run market reactions.",
      avgMarketCap: 62,
      avgRoi1Y: 17,
      companies: [
        { name: "Suncor", ticker: "SU", marketCap: 55, roi1Y: 15, note: "Integrated oil sands exposure." },
        { name: "Canadian Natural", ticker: "CNQ", marketCap: 85, roi1Y: 18, note: "Large upstream producer." },
        { name: "Cenovus", ticker: "CVE", marketCap: 46, roi1Y: 17, note: "Heavy oil and refining leverage." },
      ],
    },
    {
      segment: "Technology",
      trendType: "Structural",
      trendSummary: "Canada's tech winners remain smaller but benefit from platform and payments trends.",
      avgMarketCap: 55,
      avgRoi1Y: 18,
      companies: [
        { name: "Shopify", ticker: "SHOP", marketCap: 110, roi1Y: 20, note: "Global commerce software platform." },
        { name: "Constellation Software", ticker: "CSU", marketCap: 65, roi1Y: 16, note: "Serial acquirer of vertical software." },
        { name: "CGI", ticker: "GIB", marketCap: 28, roi1Y: 18, note: "IT services and enterprise modernization." },
      ],
    },
  ],
  KR: [
    {
      segment: "Semiconductors",
      trendType: "Structural",
      trendSummary: "Memory pricing and AI server demand still define Korea's equity leadership.",
      avgMarketCap: 220,
      avgRoi1Y: 25,
      companies: [
        { name: "Samsung Electronics", ticker: "005930", marketCap: 420, roi1Y: 24, note: "Memory, foundry, and consumer electronics anchor." },
        { name: "SK Hynix", ticker: "000660", marketCap: 150, roi1Y: 31, note: "HBM and AI memory strength." },
        { name: "Samsung SDI", ticker: "006400", marketCap: 90, roi1Y: 20, note: "Battery and advanced materials exposure." },
      ],
    },
    {
      segment: "Automotive",
      trendType: "Reactive",
      trendSummary: "Export demand, EV positioning, and FX shifts move Korea autos quickly.",
      avgMarketCap: 55,
      avgRoi1Y: 30,
      companies: [
        { name: "Hyundai", ticker: "005380", marketCap: 60, roi1Y: 32, note: "Global EV and SUV momentum." },
        { name: "Kia", ticker: "000270", marketCap: 55, roi1Y: 29, note: "Operating leverage and design strength." },
        { name: "Hyundai Mobis", ticker: "012330", marketCap: 50, roi1Y: 29, note: "Parts and module supplier." },
      ],
    },
    {
      segment: "Finance",
      trendType: "Reactive",
      trendSummary: "Banks respond quickly to rate, property, and credit cycle headlines.",
      avgMarketCap: 25,
      avgRoi1Y: 10,
      companies: [
        { name: "KB Financial", ticker: "105560", marketCap: 30, roi1Y: 11, note: "Largest diversified financial group." },
        { name: "Shinhan Financial", ticker: "055550", marketCap: 24, roi1Y: 10, note: "Balanced bank and card franchise." },
        { name: "Hana Financial", ticker: "086790", marketCap: 21, roi1Y: 9, note: "Commercial and retail banking mix." },
      ],
    },
  ],
  TW: [
    {
      segment: "Semiconductors",
      trendType: "Structural",
      trendSummary: "Advanced foundry dominance keeps Taiwan tied to long-cycle AI and compute demand.",
      avgMarketCap: 350,
      avgRoi1Y: 35,
      companies: [
        { name: "TSMC", ticker: "TSM", marketCap: 890, roi1Y: 39, note: "Global foundry leader." },
        { name: "MediaTek", ticker: "2454", marketCap: 90, roi1Y: 32, note: "Mobile and edge chip design." },
        { name: "UMC", ticker: "2303", marketCap: 70, roi1Y: 34, note: "Mature node manufacturing base." },
      ],
    },
    {
      segment: "Electronics Manufacturing",
      trendType: "Reactive",
      trendSummary: "Device cycle and export orders define Taiwan EMS leaders.",
      avgMarketCap: 40,
      avgRoi1Y: 20,
      companies: [
        { name: "Hon Hai", ticker: "2317", marketCap: 85, roi1Y: 19, note: "Global hardware assembly backbone." },
        { name: "Quanta", ticker: "2382", marketCap: 22, roi1Y: 21, note: "Server and notebook manufacturing." },
        { name: "Pegatron", ticker: "4938", marketCap: 13, roi1Y: 20, note: "Consumer electronics manufacturing." },
      ],
    },
    {
      segment: "Finance",
      trendType: "Reactive",
      trendSummary: "Financials stay sensitive to local property and regional risk sentiment.",
      avgMarketCap: 20,
      avgRoi1Y: 12,
      companies: [
        { name: "Cathay Financial", ticker: "2882", marketCap: 22, roi1Y: 11, note: "Insurance and banking mix." },
        { name: "Fubon Financial", ticker: "2881", marketCap: 21, roi1Y: 12, note: "Large insurer-bank platform." },
        { name: "CTBC Financial", ticker: "2891", marketCap: 17, roi1Y: 13, note: "Retail and cross-border banking." },
      ],
    },
  ],
  JP: [
    {
      segment: "Automotive",
      trendType: "Reactive",
      trendSummary: "FX, export demand, and EV competition drive Japan auto moves.",
      avgMarketCap: 120,
      avgRoi1Y: 20,
      companies: [
        { name: "Toyota", ticker: "7203", marketCap: 320, roi1Y: 24, note: "Scale leader with hybrid and EV optionality." },
        { name: "Honda", ticker: "HMC", marketCap: 55, roi1Y: 18, note: "Balanced mobility and manufacturing story." },
        { name: "Nissan", ticker: "7201", marketCap: 25, roi1Y: 18, note: "Turnaround and global demand sensitivity." },
      ],
    },
    {
      segment: "Industrials",
      trendType: "Structural",
      trendSummary: "Japanese industrial leaders benefit from automation and capex cycles.",
      avgMarketCap: 60,
      avgRoi1Y: 18,
      companies: [
        { name: "Mitsubishi Corp", ticker: "8058", marketCap: 95, roi1Y: 17, note: "Trading house exposure to global cycle." },
        { name: "Hitachi", ticker: "6501", marketCap: 75, roi1Y: 20, note: "Digital infrastructure and industry." },
        { name: "Komatsu", ticker: "6301", marketCap: 35, roi1Y: 17, note: "Machinery and construction demand." },
      ],
    },
    {
      segment: "Consumer Tech",
      trendType: "Structural",
      trendSummary: "Gaming, devices, and telecom-tech platforms keep this segment differentiated.",
      avgMarketCap: 70,
      avgRoi1Y: 25,
      companies: [
        { name: "Sony", ticker: "SONY", marketCap: 150, roi1Y: 22, note: "Gaming, media, and imaging portfolio." },
        { name: "SoftBank", ticker: "9984", marketCap: 95, roi1Y: 24, note: "Telecom plus venture and AI exposure." },
        { name: "Nintendo", ticker: "7974", marketCap: 65, roi1Y: 29, note: "Platform IP and console cycle." },
      ],
    },
  ],
  CN: [
    {
      segment: "E-commerce / Tech",
      trendType: "Reactive",
      trendSummary: "Policy signals and consumer confidence still drive China platform names.",
      avgMarketCap: 200,
      avgRoi1Y: 15,
      companies: [
        { name: "Alibaba", ticker: "BABA", marketCap: 210, roi1Y: 12, note: "Consumer and cloud recovery angle." },
        { name: "Tencent", ticker: "0700", marketCap: 470, roi1Y: 18, note: "Gaming, ads, and platform breadth." },
        { name: "JD.com", ticker: "9618", marketCap: 55, roi1Y: 15, note: "Retail execution and margin leverage." },
      ],
    },
    {
      segment: "EV / Auto",
      trendType: "Structural",
      trendSummary: "EV adoption and export scale keep this segment on a longer structural path.",
      avgMarketCap: 60,
      avgRoi1Y: 40,
      companies: [
        { name: "BYD", ticker: "1211", marketCap: 110, roi1Y: 42, note: "Integrated EV and battery champion." },
        { name: "NIO", ticker: "NIO", marketCap: 12, roi1Y: 31, note: "Premium EV brand with execution pressure." },
        { name: "Li Auto", ticker: "LI", marketCap: 58, roi1Y: 47, note: "Strong large-vehicle domestic demand." },
      ],
    },
    {
      segment: "Finance",
      trendType: "Reactive",
      trendSummary: "Chinese banks react to policy easing, credit demand, and property headlines.",
      avgMarketCap: 150,
      avgRoi1Y: 5,
      companies: [
        { name: "ICBC", ticker: "1398", marketCap: 220, roi1Y: 6, note: "Largest state-owned bank." },
        { name: "China Construction Bank", ticker: "0939", marketCap: 160, roi1Y: 4, note: "Credit and policy transmission proxy." },
        { name: "Bank of China", ticker: "3988", marketCap: 150, roi1Y: 5, note: "Cross-border and domestic exposure." },
      ],
    },
  ],
  HK: [
    {
      segment: "Internet Platforms",
      trendType: "Reactive",
      trendSummary: "Hong Kong tech trades as a fast policy-and-sentiment transmission channel.",
      avgMarketCap: 220,
      avgRoi1Y: 16,
      companies: [
        { name: "Tencent", ticker: "0700", marketCap: 470, roi1Y: 18, note: "Core Hong Kong tech proxy." },
        { name: "Meituan", ticker: "3690", marketCap: 90, roi1Y: 14, note: "Consumption and delivery platform." },
        { name: "AIA", ticker: "1299", marketCap: 140, roi1Y: 15, note: "Insurance and wealth flows." },
      ],
    },
    {
      segment: "Property / Financials",
      trendType: "Reactive",
      trendSummary: "Rates and China property spillover dominate this segment.",
      avgMarketCap: 58,
      avgRoi1Y: 9,
      companies: [
        { name: "Hong Kong Exchanges", ticker: "0388", marketCap: 42, roi1Y: 11, note: "Capital market activity proxy." },
        { name: "Sun Hung Kai", ticker: "0016", marketCap: 23, roi1Y: 7, note: "Property bellwether." },
        { name: "BOC Hong Kong", ticker: "2388", marketCap: 18, roi1Y: 9, note: "Local banking franchise." },
      ],
    },
    {
      segment: "Insurance",
      trendType: "Structural",
      trendSummary: "Wealth management and cross-border savings flows support the long-cycle case.",
      avgMarketCap: 72,
      avgRoi1Y: 13,
      companies: [
        { name: "AIA", ticker: "1299", marketCap: 140, roi1Y: 15, note: "Dominant Asia life insurer." },
        { name: "Prudential", ticker: "PRU", marketCap: 38, roi1Y: 12, note: "Asia-oriented insurer." },
        { name: "Ping An", ticker: "2318", marketCap: 38, roi1Y: 11, note: "China-linked financials exposure." },
      ],
    },
  ],
  SG: [
    {
      segment: "Banking",
      trendType: "Reactive",
      trendSummary: "Singapore banks respond quickly to rates and regional capital flows.",
      avgMarketCap: 62,
      avgRoi1Y: 14,
      companies: [
        { name: "DBS", ticker: "D05", marketCap: 95, roi1Y: 15, note: "Regional banking flagship." },
        { name: "UOB", ticker: "U11", marketCap: 48, roi1Y: 13, note: "Commercial and wealth banking mix." },
        { name: "OCBC", ticker: "O39", marketCap: 42, roi1Y: 13, note: "Insurance and banking combination." },
      ],
    },
    {
      segment: "Transport / Logistics",
      trendType: "Structural",
      trendSummary: "Singapore's hub status makes logistics a longer-cycle strategic segment.",
      avgMarketCap: 28,
      avgRoi1Y: 11,
      companies: [
        { name: "SIA", ticker: "C6L", marketCap: 19, roi1Y: 13, note: "Passenger and cargo travel proxy." },
        { name: "ST Engineering", ticker: "S63", marketCap: 18, roi1Y: 11, note: "Aerospace and defense systems." },
        { name: "Yangzijiang", ticker: "BS6", marketCap: 48, roi1Y: 9, note: "Shipping and marine demand." },
      ],
    },
    {
      segment: "REITs / Property",
      trendType: "Reactive",
      trendSummary: "Rates and property valuation changes hit this segment directly.",
      avgMarketCap: 14,
      avgRoi1Y: 8,
      companies: [
        { name: "CapitaLand Integrated", ticker: "C38U", marketCap: 12, roi1Y: 7, note: "Retail and office REIT proxy." },
        { name: "Mapletree Industrial", ticker: "ME8U", marketCap: 10, roi1Y: 9, note: "Industrial and data center exposure." },
        { name: "Ascendas REIT", ticker: "A17U", marketCap: 20, roi1Y: 8, note: "Business parks and logistics assets." },
      ],
    },
  ],
  IN: [
    {
      segment: "IT Services",
      trendType: "Structural",
      trendSummary: "India's software export base remains a long-duration services story.",
      avgMarketCap: 92,
      avgRoi1Y: 24,
      companies: [
        { name: "Infosys", ticker: "INFY", marketCap: 78, roi1Y: 21, note: "Global IT outsourcing platform." },
        { name: "TCS", ticker: "TCS", marketCap: 165, roi1Y: 25, note: "Large-cap Indian services leader." },
        { name: "Wipro", ticker: "WIT", marketCap: 33, roi1Y: 26, note: "Digital transformation and IT services." },
      ],
    },
    {
      segment: "Banking",
      trendType: "Reactive",
      trendSummary: "Domestic demand and credit growth still make Indian banks event-sensitive.",
      avgMarketCap: 84,
      avgRoi1Y: 19,
      companies: [
        { name: "HDFC Bank", ticker: "HDBK", marketCap: 145, roi1Y: 18, note: "Core private bank compounder." },
        { name: "ICICI Bank", ticker: "IBN", marketCap: 73, roi1Y: 20, note: "Strong retail and corporate mix." },
        { name: "State Bank of India", ticker: "SBI", marketCap: 35, roi1Y: 18, note: "State-owned scale and broad credit exposure." },
      ],
    },
    {
      segment: "Conglomerates / Industrials",
      trendType: "Structural",
      trendSummary: "Capex, infrastructure, and domestic manufacturing are long-cycle drivers.",
      avgMarketCap: 66,
      avgRoi1Y: 23,
      companies: [
        { name: "Reliance", ticker: "RELIANCE", marketCap: 190, roi1Y: 24, note: "Energy, telecom, and consumer platform mix." },
        { name: "Larsen & Toubro", ticker: "LT", marketCap: 52, roi1Y: 22, note: "Infrastructure and project execution." },
        { name: "Adani Ports", ticker: "ADANIPORTS", marketCap: 28, roi1Y: 22, note: "Trade and logistics leverage." },
      ],
    },
  ],
  DE: [
    {
      segment: "Industrials",
      trendType: "Structural",
      trendSummary: "German market leadership still leans on engineering and automation franchises.",
      avgMarketCap: 120,
      avgRoi1Y: 20,
      companies: [
        { name: "Siemens", ticker: "SIE", marketCap: 150, roi1Y: 19, note: "Industrial automation and electrification." },
        { name: "Airbus", ticker: "AIR", marketCap: 120, roi1Y: 21, note: "Aerospace and order book visibility." },
        { name: "Schneider Electric", ticker: "SU", marketCap: 130, roi1Y: 20, note: "Energy management and automation." },
      ],
    },
    {
      segment: "Software / Tech",
      trendType: "Structural",
      trendSummary: "European enterprise software remains one of Germany's cleaner structural growth areas.",
      avgMarketCap: 282,
      avgRoi1Y: 21,
      companies: [
        { name: "SAP", ticker: "SAP", marketCap: 250, roi1Y: 19, note: "Enterprise software transition story." },
        { name: "ASML", ticker: "ASML", marketCap: 390, roi1Y: 24, note: "Semiconductor equipment dominance." },
        { name: "Infineon", ticker: "IFX", marketCap: 105, roi1Y: 20, note: "Auto and power semiconductor leverage." },
      ],
    },
    {
      segment: "Autos / Mobility",
      trendType: "Reactive",
      trendSummary: "Demand and tariff sensitivity keep German autos highly reactive.",
      avgMarketCap: 72,
      avgRoi1Y: 14,
      companies: [
        { name: "Volkswagen", ticker: "VOW3", marketCap: 65, roi1Y: 12, note: "Global scale with EV transition risk." },
        { name: "Mercedes-Benz", ticker: "MBG", marketCap: 70, roi1Y: 15, note: "Premium auto demand proxy." },
        { name: "BMW", ticker: "BMW", marketCap: 81, roi1Y: 15, note: "Luxury autos and margins." },
      ],
    },
  ],
  UK: [
    {
      segment: "Banking",
      trendType: "Reactive",
      trendSummary: "UK bank performance remains closely linked to rates and domestic growth data.",
      avgMarketCap: 70,
      avgRoi1Y: 25,
      companies: [
        { name: "HSBC", ticker: "HSBC", marketCap: 145, roi1Y: 24, note: "Global banking franchise." },
        { name: "Barclays", ticker: "BCS", marketCap: 42, roi1Y: 26, note: "Investment bank and UK consumer mix." },
        { name: "Lloyds", ticker: "LYG", marketCap: 24, roi1Y: 25, note: "Domestic UK rates sensitivity." },
      ],
    },
    {
      segment: "Energy",
      trendType: "Reactive",
      trendSummary: "Commodity headlines still dominate UK energy heavyweights.",
      avgMarketCap: 180,
      avgRoi1Y: 18,
      companies: [
        { name: "Shell", ticker: "SHEL", marketCap: 210, roi1Y: 19, note: "Global energy major." },
        { name: "BP", ticker: "BP", marketCap: 120, roi1Y: 17, note: "Oil and refining exposure." },
        { name: "Rio Tinto", ticker: "RIO", marketCap: 115, roi1Y: 18, note: "Materials and commodity cycle." },
      ],
    },
    {
      segment: "Consumer / Media",
      trendType: "Structural",
      trendSummary: "Media, data, and staples give the UK a steadier structural cash flow mix.",
      avgMarketCap: 74,
      avgRoi1Y: 14,
      companies: [
        { name: "Relx", ticker: "REL", marketCap: 78, roi1Y: 15, note: "Data and information services." },
        { name: "Unilever", ticker: "UL", marketCap: 110, roi1Y: 13, note: "Global staples footprint." },
        { name: "Diageo", ticker: "DEO", marketCap: 35, roi1Y: 14, note: "Premium consumer brand exposure." },
      ],
    },
  ],
  FR: [
    {
      segment: "Luxury",
      trendType: "Structural",
      trendSummary: "Luxury remains France's strongest global structural equity segment.",
      avgMarketCap: 200,
      avgRoi1Y: 22,
      companies: [
        { name: "LVMH", ticker: "MC", marketCap: 360, roi1Y: 21, note: "Luxury bellwether." },
        { name: "Hermes", ticker: "RMS", marketCap: 250, roi1Y: 25, note: "Ultra-premium demand resilience." },
        { name: "Kering", ticker: "KER", marketCap: 55, roi1Y: 20, note: "Luxury portfolio turnaround case." },
      ],
    },
    {
      segment: "Industrials",
      trendType: "Structural",
      trendSummary: "Aerospace and electrification drive France's industrial leaders.",
      avgMarketCap: 120,
      avgRoi1Y: 20,
      companies: [
        { name: "Airbus", ticker: "AIR", marketCap: 120, roi1Y: 19, note: "Aerospace backlog visibility." },
        { name: "Schneider Electric", ticker: "SU", marketCap: 130, roi1Y: 21, note: "Energy efficiency and automation." },
        { name: "Safran", ticker: "SAF", marketCap: 110, roi1Y: 20, note: "Aircraft engine cycle." },
      ],
    },
    {
      segment: "Banking / Utilities",
      trendType: "Reactive",
      trendSummary: "Rates and regulated pricing make this basket more event-sensitive.",
      avgMarketCap: 56,
      avgRoi1Y: 12,
      companies: [
        { name: "BNP Paribas", ticker: "BNP", marketCap: 90, roi1Y: 11, note: "European bank with diversified footprint." },
        { name: "Credit Agricole", ticker: "ACA", marketCap: 52, roi1Y: 13, note: "Retail and asset management mix." },
        { name: "Veolia", ticker: "VIE", marketCap: 26, roi1Y: 12, note: "Utility and environmental services angle." },
      ],
    },
  ],
};

const sectorOrder = [
  "Technology",
  "Financial",
  "Consumer Cyclical",
  "Communication Services",
  "Healthcare",
  "Consumer Defensive",
  "Industrials",
  "Real Estate",
  "Utilities",
  "Energy",
  "Basic Materials",
];

function getRegionMarketCap(region: RegionCode) {
  if (ALL_DETAIL_REGIONS.includes(region)) {
    return heatmapStocks
      .filter((stock) => stock.detailRegion === region)
      .reduce((sum, stock) => sum + stock.marketCap, 0);
  }
  return heatmapStocks
    .filter((stock) => stock.region === region)
    .reduce((sum, stock) => sum + stock.marketCap, 0);
}

function isAsiaFamily(region: RegionCode) {
  return region === "ASIA" || ASIA_DETAIL_REGIONS.includes(region);
}

function isEuFamily(region: RegionCode) {
  return region === "EU" || EU_DETAIL_REGIONS.includes(region);
}

function isUsFamily(region: RegionCode) {
  return region === "NA" || NA_DETAIL_REGIONS.includes(region);
}

function getParentRegion(region: RegionCode): BaseRegion {
  if (isUsFamily(region)) return "NA";
  if (isAsiaFamily(region)) return "ASIA";
  if (isEuFamily(region)) return "EU";
  return "NA";
}

function sentimentLabel(score: number) {
  if (score > 0.2) return "Positive";
  if (score < -0.2) return "Negative";
  return "Neutral";
}

function sentimentGradient(score: number) {
  if (score > 0.2) return "linear-gradient(135deg, #22c55e, #bef264)";
  if (score < -0.2) return "linear-gradient(135deg, #ef4444, #fb923c)";
  return "linear-gradient(135deg, #f59e0b, #fde68a)";
}

function sentimentBackground(score: number) {
  if (score > 0.2) return "rgba(34, 197, 94, 0.18)";
  if (score < -0.2) return "rgba(239, 68, 68, 0.18)";
  return "rgba(245, 158, 11, 0.18)";
}

function sentimentWidth(score: number) {
  return `${Math.round(((score + 1) / 2) * 100)}%`;
}

function stockToneClass(change: number) {
  if (change > 0.5) return "heat-positive";
  if (change < -0.5) return "heat-negative";
  return "heat-neutral";
}

function stockSizeClass(size: HeatmapStock["size"]) {
  if (size === "lg") return "heat-tile-lg";
  if (size === "md") return "heat-tile-md";
  return "heat-tile-sm";
}

function riskToneLabel(level: MarketRiskSnapshot["risk_level"] | null) {
  if (level === "high") return "High";
  if (level === "moderate") return "Moderate";
  if (level === "low") return "Low";
  return "N/A";
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

function viewModeLabel(viewMode: ViewMode) {
  if (viewMode === "map") return "Map + News Panel";
  if (viewMode === "chart") return "Stock Heatmap";
  if (viewMode === "pf") return "PF Workspace";
  return "Personal Page";
}

function viewModeCopy(viewMode: ViewMode) {
  if (viewMode === "map") {
    return "Click a region on the map. The right panel updates with related headlines, and sentiment changes the marker color.";
  }
  if (viewMode === "chart") {
    return "Switch to chart mode for a Finviz-style stock heatmap. It is frontend-only for now and grouped by the selected region.";
  }
  if (viewMode === "pf") {
    return "Portfolio workspace placeholder. We can connect holdings, watchlists, and personal risk tools here next.";
  }
  return "Start with a lightweight profile onboarding flow, then move into investor preferences and personalization.";
}

function humanizeProfileValue(value: string) {
  return value.replaceAll("_", " ");
}

function riskPostureLabel(score: number) {
  if (score >= 70) return "Low risk tolerance";
  if (score >= 40) return "Balanced";
  return "High risk tolerance";
}

function lossToleranceLabel(value: number) {
  if (value >= 30) return "Can absorb larger drawdowns";
  if (value >= 15) return "Moderate drawdown tolerance";
  return "Prefers shallow losses";
}

function riskAversionLabel(score: number) {
  if (score >= 70) return "Defensive";
  if (score >= 40) return "Balanced";
  return "Growth-oriented";
}

function scaleBubbleSize(value: number, minValue: number, maxValue: number, minSize: number, maxSize: number) {
  if (value <= 0) {
    return minSize;
  }

  if (maxValue <= minValue) {
    return (minSize + maxSize) / 2;
  }

  const normalized =
    (Math.sqrt(value) - Math.sqrt(minValue)) / (Math.sqrt(maxValue) - Math.sqrt(minValue));
  return Math.round(minSize + normalized * (maxSize - minSize));
}

export default function ExplorePage() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>("EU");
  const [mapFocusRegion, setMapFocusRegion] = useState<BaseRegion | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("ASML");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [chartMode, setChartMode] = useState<ChartMode>("heatmap");
  const [structureViewMode, setStructureViewMode] = useState<StructureViewMode>("country");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketRisk, setMarketRisk] = useState<MarketRiskSnapshot | null>(null);
  const [marketRiskLoading, setMarketRiskLoading] = useState(false);
  const [marketRiskError, setMarketRiskError] = useState("");
  const [regionsLoaded, setRegionsLoaded] = useState(false);
  const [profileStep, setProfileStep] = useState<"login" | "preferences">("login");
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [profilePreferences, setProfilePreferences] = useState({
    investmentGoal: "long_term_growth",
    investmentHorizon: "5_10_years",
    riskAversion: 55,
    occupation: "student",
    monthlyCashFlowStability: "moderate",
    lossTolerance: 20,
  });
  const [selectedStructureCountry, setSelectedStructureCountry] = useState<Exclude<RegionCode, BaseRegion>>("US");
  const [selectedStructureSegment, setSelectedStructureSegment] = useState("");
  const [compareTickers, setCompareTickers] = useState<string[]>([]);

  const needsMarketData = viewMode === "map" || viewMode === "chart";

  useEffect(() => {
    if (!needsMarketData || regionsLoaded) {
      return;
    }

    async function loadRegions() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("http://localhost:8000/regions/sentiment");
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const payload = (await response.json()) as RegionSummary[];
        setRegions(payload);
        const baseRegionsOnly = payload.filter((item) =>
          BASE_REGIONS.includes(item.region as BaseRegion),
        );
        const topMarketRegion = [...baseRegionsOnly].sort(
          (a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region),
        )[0];
        if (topMarketRegion?.region) {
          setSelectedRegion(topMarketRegion.region);
        }
        setRegionsLoaded(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadRegions();
  }, [needsMarketData, regionsLoaded]);

  useEffect(() => {
    if (viewMode !== "chart") {
      return;
    }

    if (selectedRegion !== "NA" && selectedRegion !== "EU" && selectedRegion !== "ASIA") {
      setSelectedRegion(getParentRegion(selectedRegion));
    }
  }, [selectedRegion, viewMode]);

  useEffect(() => {
    if (viewMode !== "chart") {
      return;
    }

    if (chartMode === "heatmap") {
      setCompareTickers([]);
    }
  }, [chartMode, viewMode]);

  useEffect(() => {
    if (viewMode === "chart") {
      setMapFocusRegion(null);
      return;
    }

    if (ASIA_DETAIL_REGIONS.includes(selectedRegion)) {
      setMapFocusRegion("ASIA");
      return;
    }

    if (EU_DETAIL_REGIONS.includes(selectedRegion)) {
      setMapFocusRegion("EU");
      return;
    }

    if (NA_DETAIL_REGIONS.includes(selectedRegion)) {
      setMapFocusRegion("NA");
      return;
    }
  }, [selectedRegion, viewMode]);

  useEffect(() => {
    const firstStock = heatmapStocks.find((stock) => stock.region === selectedRegion);
    if (firstStock) {
      setSelectedTicker(firstStock.ticker);
    }
    const sectorTotals = new Map<string, number>();
    for (const stock of heatmapStocks.filter((item) => item.region === selectedRegion)) {
      sectorTotals.set(stock.sector, (sectorTotals.get(stock.sector) ?? 0) + stock.marketCap);
    }

    const firstSector =
      [...sectorTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Technology";
    setSelectedSector(firstSector);
  }, [selectedRegion]);

  useEffect(() => {
    async function loadMarketRisk() {
      if (!MARKET_RISK_COUNTRIES.has(selectedRegion)) {
        setMarketRisk(null);
        setMarketRiskError("");
        return;
      }

      try {
        setMarketRiskLoading(true);
        setMarketRiskError("");
        const response = await fetch(`http://localhost:8000/api/market-risk/${selectedRegion}`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
          setMarketRisk(null);
          setMarketRiskError(payload?.detail ?? `Market risk is not available for ${selectedRegion} yet.`);
          return;
        }

        const payload = (await response.json()) as MarketRiskSnapshot;
        setMarketRisk(payload);
      } catch {
        setMarketRisk(null);
        setMarketRiskError(`Market risk is not available for ${selectedRegion} right now.`);
      } finally {
        setMarketRiskLoading(false);
      }
    }

    if (viewMode === "map") {
      loadMarketRisk();
    }
  }, [selectedRegion, viewMode]);

  const activeRegion = useMemo(
    () => regions.find((region) => region.region === selectedRegion) ?? regions[0],
    [regions, selectedRegion],
  );

  const mapRegionLookup = useMemo(
    () => new Map(regions.map((region) => [region.region, region])),
    [regions],
  );

  const sortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => BASE_REGIONS.includes(region.region as BaseRegion))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
    [regions],
  );

  const articleSortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => BASE_REGIONS.includes(region.region as BaseRegion))
        .sort((a, b) => b.count - a.count),
    [regions],
  );

  const detailRegionsByGroup = useMemo(
    () => ({
      NA: DETAIL_REGIONS.NA.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
      ASIA: DETAIL_REGIONS.ASIA.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
      EU: DETAIL_REGIONS.EU.map((code) => mapRegionLookup.get(code))
        .filter((region): region is RegionSummary => Boolean(region))
        .sort((a, b) => getRegionMarketCap(b.region) - getRegionMarketCap(a.region)),
    }),
    [mapRegionLookup],
  );

  const baseMapRegions = useMemo(
    () =>
      BASE_REGIONS.map((code) => mapRegionLookup.get(code)).filter(
        (region): region is RegionSummary => Boolean(region),
      ),
    [mapRegionLookup],
  );

  const currentMapRegions = useMemo(() => {
    if (!mapFocusRegion) {
      return baseMapRegions;
    }

    return detailRegionsByGroup[mapFocusRegion];
  }, [baseMapRegions, detailRegionsByGroup, mapFocusRegion]);

  const mapBubbleMetrics = useMemo(() => {
    const positiveCaps = currentMapRegions
      .map((region) => getRegionMarketCap(region.region))
      .filter((marketCap) => marketCap > 0);
    const minCap = positiveCaps.length ? Math.min(...positiveCaps) : 0;
    const maxCap = positiveCaps.length ? Math.max(...positiveCaps) : 0;
    const minSize = mapFocusRegion ? 140 : 220;
    const maxSize = mapFocusRegion ? 280 : 420;

    return new Map(
      currentMapRegions.map((region) => {
        const marketCap = getRegionMarketCap(region.region);
        const size = scaleBubbleSize(marketCap, minCap, maxCap, minSize, maxSize);

        return [
          region.region,
          {
            marketCap,
            size,
          },
        ];
      }),
    );
  }, [currentMapRegions, mapFocusRegion]);

  const regionStocks = useMemo(
    () => heatmapStocks.filter((stock) => stock.region === selectedRegion),
    [selectedRegion],
  );

  const sortedSectors = useMemo(() => {
    const totals = new Map<string, number>();

    for (const stock of regionStocks) {
      totals.set(stock.sector, (totals.get(stock.sector) ?? 0) + stock.marketCap);
    }

    return [...sectorOrder]
      .filter((sector) => totals.has(sector))
      .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  }, [regionStocks]);

  const filteredRegionStocks = useMemo(
    () =>
      selectedSector === "All"
        ? regionStocks
        : regionStocks.filter((stock) => stock.sector === selectedSector),
    [regionStocks, selectedSector],
  );

  const activeStock = useMemo(
    () => filteredRegionStocks.find((stock) => stock.ticker === selectedTicker) ?? filteredRegionStocks[0] ?? regionStocks[0],
    [filteredRegionStocks, regionStocks, selectedTicker],
  );

  const structureCountries = useMemo(
    () => DETAIL_REGIONS[selectedRegion as BaseRegion] ?? [],
    [selectedRegion],
  );

  useEffect(() => {
    if (viewMode !== "chart" || chartMode !== "structure") {
      return;
    }

    const fallbackCountry = structureCountries[0];
    if (!fallbackCountry) {
      return;
    }

    if (!structureCountries.includes(selectedStructureCountry)) {
      setSelectedStructureCountry(fallbackCountry as Exclude<RegionCode, BaseRegion>);
    }
  }, [chartMode, selectedStructureCountry, selectedRegion, structureCountries, viewMode]);

  const selectedCountrySegments = useMemo(
    () => structureData[selectedStructureCountry] ?? [],
    [selectedStructureCountry],
  );

  const aggregatedSegments = useMemo(() => {
    const grouped = new Map<string, AggregatedSegment>();

    for (const country of structureCountries) {
      const segments = structureData[country as Exclude<RegionCode, BaseRegion>] ?? [];

      for (const segment of segments) {
        const existing = grouped.get(segment.segment);
        const companies = segment.companies.map((company) => ({
          ...company,
          country: country as Exclude<RegionCode, BaseRegion>,
        }));

        if (!existing) {
          grouped.set(segment.segment, {
            segment: segment.segment,
            trendType: segment.trendType,
            trendSummary: segment.trendSummary,
            avgMarketCap: segment.avgMarketCap,
            avgRoi1Y: segment.avgRoi1Y,
            countryCount: 1,
            countries: [country as Exclude<RegionCode, BaseRegion>],
            companies,
          });
          continue;
        }

        const nextCountryCount = existing.countryCount + 1;
        const structuralBias =
          (existing.trendType === "Structural" ? 1 : 0) +
          (segment.trendType === "Structural" ? 1 : 0);

        grouped.set(segment.segment, {
          segment: existing.segment,
          trendType: structuralBias >= 1 ? "Structural" : "Reactive",
          trendSummary:
            existing.countryCount >= nextCountryCount / 2 ? existing.trendSummary : segment.trendSummary,
          avgMarketCap: Math.round(
            (existing.avgMarketCap * existing.countryCount + segment.avgMarketCap) / nextCountryCount,
          ),
          avgRoi1Y: Math.round(
            (existing.avgRoi1Y * existing.countryCount + segment.avgRoi1Y) / nextCountryCount,
          ),
          countryCount: nextCountryCount,
          countries: [...existing.countries, country as Exclude<RegionCode, BaseRegion>],
          companies: [...existing.companies, ...companies]
            .sort((a, b) => b.marketCap - a.marketCap)
            .slice(0, 3),
        });
      }
    }

    return [...grouped.values()].sort((a, b) => b.avgMarketCap - a.avgMarketCap);
  }, [structureCountries]);

  const [selectedGlobalSegment, setSelectedGlobalSegment] = useState("");

  useEffect(() => {
    if (viewMode !== "chart" || chartMode !== "structure") {
      return;
    }

    const fallbackSegment = selectedCountrySegments[0]?.segment ?? "";
    if (!fallbackSegment) {
      setSelectedStructureSegment("");
      return;
    }

    if (!selectedCountrySegments.some((segment) => segment.segment === selectedStructureSegment)) {
      setSelectedStructureSegment(fallbackSegment);
    }
  }, [chartMode, selectedCountrySegments, selectedStructureSegment, viewMode]);

  useEffect(() => {
    if (viewMode !== "chart" || chartMode !== "structure" || structureViewMode !== "segment") {
      return;
    }

    const fallbackSegment = aggregatedSegments[0]?.segment ?? "";
    if (!fallbackSegment) {
      setSelectedGlobalSegment("");
      return;
    }

    if (!aggregatedSegments.some((segment) => segment.segment === selectedGlobalSegment)) {
      setSelectedGlobalSegment(fallbackSegment);
    }
  }, [aggregatedSegments, chartMode, selectedGlobalSegment, structureViewMode, viewMode]);

  const activeStructureSegment = useMemo(
    () => selectedCountrySegments.find((segment) => segment.segment === selectedStructureSegment) ?? selectedCountrySegments[0],
    [selectedCountrySegments, selectedStructureSegment],
  );

  const activeGlobalSegment = useMemo(
    () => aggregatedSegments.find((segment) => segment.segment === selectedGlobalSegment) ?? aggregatedSegments[0],
    [aggregatedSegments, selectedGlobalSegment],
  );

  const comparisonSourceSegments = structureViewMode === "segment" ? aggregatedSegments : selectedCountrySegments;

  const comparisonCompanies = useMemo(() => {
    const candidates = comparisonSourceSegments.flatMap((segment) =>
      segment.companies.map((company) => ({
        ...company,
        segment: segment.segment,
        trendType: segment.trendType,
      })),
    );
    return candidates.filter((company) => compareTickers.includes(company.ticker));
  }, [comparisonSourceSegments, compareTickers]);

  const activeStructureCompany = useMemo(() => {
    if (comparisonCompanies[0]) {
      return comparisonCompanies[0];
    }
    if (structureViewMode === "segment") {
      return activeGlobalSegment?.companies[0] ?? null;
    }
    return activeStructureSegment?.companies[0] ?? null;
  }, [activeGlobalSegment, activeStructureSegment, comparisonCompanies, structureViewMode]);

  function getMapPosition(region: RegionCode) {
    if (mapFocusRegion && focusedRegionPositions[mapFocusRegion][region]) {
      return focusedRegionPositions[mapFocusRegion][region]!;
    }

    return regionPositions[region];
  }

  function enterMapGroup(group: BaseRegion) {
    const defaultRegion = detailRegionsByGroup[group][0]?.region ?? group;
    setMapFocusRegion(group);
    setSelectedRegion(defaultRegion);
  }

  function returnToGlobalMap() {
    const fallbackRegion = mapFocusRegion ?? getParentRegion(selectedRegion);
    setMapFocusRegion(null);
    setSelectedRegion(fallbackRegion);
  }

  function selectRegion(region: RegionCode) {
    if (viewMode === "chart") {
      setMapFocusRegion(null);
      setSelectedRegion(getParentRegion(region));
      return;
    }

    if (region === "ASIA" || region === "EU" || region === "NA") {
      enterMapGroup(region);
      return;
    }

    if (isUsFamily(region)) {
      setMapFocusRegion("NA");
      setSelectedRegion(region);
      return;
    }

    if (isAsiaFamily(region)) {
      setMapFocusRegion("ASIA");
      setSelectedRegion(region);
      return;
    }

    if (isEuFamily(region)) {
      setMapFocusRegion("EU");
      setSelectedRegion(region);
      return;
    }

    setMapFocusRegion(null);
    setSelectedRegion(region);
  }

  function toggleCompareTicker(ticker: string) {
    setCompareTickers((current) => {
      if (current.includes(ticker)) {
        return current.filter((item) => item !== ticker);
      }
      if (current.length >= 3) {
        return [...current.slice(1), ticker];
      }
      return [...current, ticker];
    });
  }

  const canContinueProfile = profileForm.name.trim().length > 0 || profileForm.email.trim().length > 0;

  return (
    <main className="explore-page">
      <section className="explore-shell">
        <aside className="left-rail no-logo">
          <div className="rail-stack compact">
            <button
              type="button"
              className={`rail-button ${viewMode === "map" ? "active" : ""}`}
              onClick={() => setViewMode("map")}
            >
              Map
            </button>
            <button
              type="button"
              className={`rail-button ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              Chart
            </button>
            <button
              type="button"
              className={`rail-button ${viewMode === "pf" ? "active" : ""}`}
              onClick={() => setViewMode("pf")}
            >
              PF
            </button>
            <button
              type="button"
              className={`rail-button ${viewMode === "personal" ? "active" : ""}`}
              onClick={() => setViewMode("personal")}
            >
              Profile
            </button>
          </div>
        </aside>

        <div className="explore-main">
          <header className="hero">
            <div>
              <p className="eyebrow">Minimal working MVP</p>
              <h1>Global News Pulse</h1>
              <p className="hero-copy">{viewModeCopy(viewMode)}</p>
            </div>
            <div className="hero-badge">{viewModeLabel(viewMode)}</div>
          </header>

          {loading ? <div className="state-card">Loading live news from GDELT...</div> : null}
          {error ? <div className="state-card error-card">Failed to load API: {error}</div> : null}

          {!loading && regions.length > 0 ? (
            <>
              {viewMode === "map" || viewMode === "chart" ? (
                <div className="region-tabs">
                  {viewMode === "chart"
                    ? sortedRegions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`region-tab ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => setSelectedRegion(region.region)}
                          style={{
                            borderColor:
                              region.region === selectedRegion ? region.color : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <span>{regionLabels[region.region]}</span>
                          <strong>{Math.round(getRegionMarketCap(region.region))}B mcap</strong>
                        </button>
                      ))
                    : articleSortedRegions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`region-tab ${
                            (mapFocusRegion ? mapFocusRegion === region.region : selectedRegion === region.region)
                              ? "active"
                              : ""
                          }`}
                          onClick={() => selectRegion(region.region)}
                          style={{
                            borderColor:
                              (mapFocusRegion ? mapFocusRegion === region.region : selectedRegion === region.region)
                                ? region.color
                                : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <span>{regionLabels[region.region]}</span>
                          <strong>{region.count} articles</strong>
                        </button>
                      ))}
                </div>
              ) : null}

              {viewMode === "map" ? (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">Map view</p>
                        <h2>Regional sentiment map</h2>
                      </div>
                      <div className="map-chip">
                        {mapFocusRegion ? `${mapRegionLookup.get(mapFocusRegion)?.region_name} focus` : "Global view"}
                      </div>
                    </div>

                    {mapFocusRegion ? (
                      <div className="map-detail-toolbar">
                        <button type="button" className="map-back-button" onClick={returnToGlobalMap}>
                          ← Back to Global
                        </button>
                        <div className="map-detail-meta">
                          <strong>{mapRegionLookup.get(mapFocusRegion)?.region_name}</strong>
                          <span>
                            {Math.round(getRegionMarketCap(mapFocusRegion))}B mcap ·{" "}
                            {mapRegionLookup.get(mapFocusRegion)?.count ?? 0} articles
                          </span>
                        </div>
                        <div className="map-detail-tabs">
                          {detailRegionsByGroup[mapFocusRegion].map((region) => (
                            <button
                              key={region.region}
                              type="button"
                              className={`map-detail-tab ${region.region === selectedRegion ? "active" : ""}`}
                              onClick={() => selectRegion(region.region)}
                              style={{
                                borderColor:
                                  region.region === selectedRegion
                                    ? region.color
                                    : "rgba(255,255,255,0.08)",
                              }}
                            >
                              <span>{regionLabels[region.region]}</span>
                              <strong>{Math.round(getRegionMarketCap(region.region))}B</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="map-stage">
                      {currentMapRegions.map((region) => {
                        const bubble = mapBubbleMetrics.get(region.region);
                        if (!bubble) {
                          return null;
                        }

                        return (
                          <div
                            key={`${region.region}-bubble`}
                            className={`map-bubble ${mapFocusRegion ? "detail-bubble" : "base-bubble"} ${
                              region.region === selectedRegion ? "active" : ""
                            }`}
                            style={{
                              top: getMapPosition(region.region).top,
                              left: getMapPosition(region.region).left,
                              width: `${bubble.size}px`,
                              height: `${bubble.size}px`,
                              background: sentimentBackground(region.sentiment),
                              borderColor:
                                region.region === selectedRegion
                                  ? "rgba(255,255,255,0.2)"
                                  : "rgba(56, 189, 248, 0.16)",
                              boxShadow:
                                region.region === selectedRegion
                                  ? "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.24), inset 0 0 60px rgba(255,255,255,0.05)"
                                  : "0 22px 60px rgba(0,0,0,0.16), inset 0 0 40px rgba(255,255,255,0.04)",
                            }}
                          >
                            <span className="bubble-cap">{Math.round(bubble.marketCap)}B</span>
                          </div>
                        );
                      })}

                      {currentMapRegions.map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`map-marker ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => selectRegion(region.region)}
                          style={{
                            top: getMapPosition(region.region).top,
                            left: getMapPosition(region.region).left,
                          }}
                        >
                          <span
                            className="marker-glow"
                            style={{ background: sentimentBackground(region.sentiment) }}
                          />
                          <span
                            className="marker-core"
                            style={{ background: sentimentGradient(region.sentiment) }}
                          />
                          <span className="marker-label">
                            <strong>{regionLabels[region.region]}</strong>
                            <small>{sentimentLabel(region.sentiment)}</small>
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="bottom-summary">
                      {(mapFocusRegion ? detailRegionsByGroup[mapFocusRegion] : articleSortedRegions).map((region) => (
                        <button
                          key={region.region}
                          type="button"
                          className={`summary-card ${region.region === selectedRegion ? "active" : ""}`}
                          onClick={() => selectRegion(region.region)}
                        >
                          <span>{region.region_name}</span>
                          <strong>
                            Mcap: {Math.round(getRegionMarketCap(region.region))}B · Sentiment:{" "}
                            {region.sentiment.toFixed(2)}
                          </strong>
                        </button>
                      ))}
                    </div>
                  </section>

                  <aside className="news-panel">
                    {activeRegion ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{activeRegion.region}</p>
                            <h2>{activeRegion.region_name}</h2>
                          </div>
                        </div>

                        <div className="summary-hero-card">
                          <div className="summary-hero-top">
                            <span className="summary-hero-label">Daily Brief</span>
                            <div className="sentiment-pill">{sentimentLabel(activeRegion.sentiment)}</div>
                          </div>
                          <p className="summary-hero-copy">{activeRegion.summary}</p>
                        </div>

                        <div className="sentiment-bar">
                          <div
                            className="sentiment-bar-fill"
                            style={{
                              width: sentimentWidth(activeRegion.sentiment),
                              background: sentimentGradient(activeRegion.sentiment),
                            }}
                          />
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Sentiment</span>
                            <strong>{activeRegion.sentiment.toFixed(2)}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Market risk</span>
                            <strong>
                              {marketRiskLoading
                                ? "..."
                                : marketRisk
                                  ? marketRisk.market_risk_score.toFixed(1)
                                  : "--"}
                            </strong>
                          </div>
                          <div className="metric-box">
                            <span>Market cap</span>
                            <strong>{Math.round(getRegionMarketCap(activeRegion.region))}B</strong>
                          </div>
                          <div className="metric-box">
                            <span>Articles</span>
                            <strong>{activeRegion.count}</strong>
                          </div>
                        </div>

                        <div className="risk-summary-card">
                          <div className="risk-summary-header">
                            <strong>Market Risk</strong>
                            <span className={`risk-level-pill risk-${marketRisk?.risk_level ?? "none"}`}>
                              {marketRiskLoading ? "Loading" : riskToneLabel(marketRisk?.risk_level ?? null)}
                            </span>
                          </div>
                          <p className="risk-summary-copy">
                            {marketRisk
                              ? marketRisk.short_explanation
                              : marketRiskError
                                ? marketRiskError
                              : MARKET_RISK_COUNTRIES.has(activeRegion.region)
                                ? "Run the market risk refresh pipeline to show this country risk score."
                                : "Market risk is currently available for US, CA, KR, JP, CN, TW, HK, SG, IN, DE, UK, and FR."}
                          </p>
                          {marketRisk ? (
                            <div className="risk-breakdown-grid">
                              <div className="risk-breakdown-item">
                                <span>Volatility</span>
                                <strong>{marketRisk.component_scores.volatility.toFixed(1)}</strong>
                                <small>{formatPercent(marketRisk.raw_metrics.realized_vol_30d)}</small>
                              </div>
                              <div className="risk-breakdown-item">
                                <span>Beta</span>
                                <strong>{marketRisk.component_scores.beta.toFixed(1)}</strong>
                                <small>
                                  {marketRisk.raw_metrics.beta_60d !== null
                                    ? marketRisk.raw_metrics.beta_60d.toFixed(2)
                                    : "--"}
                                </small>
                              </div>
                              <div className="risk-breakdown-item">
                                <span>FX Risk</span>
                                <strong>{marketRisk.component_scores.fx_risk.toFixed(1)}</strong>
                                <small>{formatPercent(marketRisk.raw_metrics.fx_vol_30d)}</small>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="article-list">
                          {activeRegion.articles.map((article) => (
                            <a
                              key={article.url}
                              href={article.url}
                              target="_blank"
                              rel="noreferrer"
                              className="article-card"
                            >
                              <div className="article-meta">
                                <span>{article.source}</span>
                                <span
                                  className="article-tone"
                                  style={{
                                    color:
                                      article.sentiment > 0.2
                                        ? "#86efac"
                                        : article.sentiment < -0.2
                                          ? "#fca5a5"
                                          : "#fde68a",
                                  }}
                                >
                                  {sentimentLabel(article.sentiment)}
                                </span>
                              </div>
                              <h3>{article.title}</h3>
                              <p>Open original article</p>
                            </a>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="state-card">No region selected.</div>
                    )}
                  </aside>
                </div>
              ) : viewMode === "chart" ? (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">Chart view</p>
                        <h2>{chartMode === "heatmap" ? "Regional stock heatmap" : "Market structure explorer"}</h2>
                      </div>
                      <div className="chart-mode-toggle">
                        <button
                          type="button"
                          className={`chart-mode-button ${chartMode === "heatmap" ? "active" : ""}`}
                          onClick={() => setChartMode("heatmap")}
                        >
                          Heatmap
                        </button>
                        <button
                          type="button"
                          className={`chart-mode-button ${chartMode === "structure" ? "active" : ""}`}
                          onClick={() => setChartMode("structure")}
                        >
                          Structure
                        </button>
                      </div>
                    </div>

                    {chartMode === "structure" ? (
                      <div className="structure-view-toggle">
                        <button
                          type="button"
                          className={`structure-view-button ${structureViewMode === "country" ? "active" : ""}`}
                          onClick={() => {
                            setStructureViewMode("country");
                            setCompareTickers([]);
                          }}
                        >
                          By Country
                        </button>
                        <button
                          type="button"
                          className={`structure-view-button ${structureViewMode === "segment" ? "active" : ""}`}
                          onClick={() => {
                            setStructureViewMode("segment");
                            setCompareTickers([]);
                          }}
                        >
                          By Segment
                        </button>
                      </div>
                    ) : null}

                    {chartMode === "heatmap" ? (
                      <div className="chart-shell">
                        <aside className="sector-rail">
                          <button
                            type="button"
                            className={`sector-link ${selectedSector === "All" ? "active" : ""}`}
                            onClick={() => setSelectedSector("All")}
                          >
                            All
                          </button>
                          {sortedSectors.map((sector) => (
                            <button
                              key={sector}
                              type="button"
                              className={`sector-link ${selectedSector === sector ? "active" : ""}`}
                              onClick={() => setSelectedSector(sector)}
                            >
                              {sector}
                              <span className="sector-cap">
                                {Math.round(
                                  regionStocks
                                    .filter((stock) => stock.sector === sector)
                                    .reduce((sum, stock) => sum + stock.marketCap, 0),
                                )}B
                              </span>
                            </button>
                          ))}
                        </aside>

                        <div className="heatmap-stage">
                          <div className="heatmap-grid">
                            {filteredRegionStocks.map((stock) => (
                              <button
                                key={stock.ticker}
                                type="button"
                                className={`heat-tile ${stockToneClass(stock.change)} ${stockSizeClass(stock.size)} ${
                                  activeStock?.ticker === stock.ticker ? "selected" : ""
                                }`}
                                onClick={() => setSelectedTicker(stock.ticker)}
                              >
                                <span className="heat-ticker">{stock.ticker}</span>
                                <span className="heat-name">{stock.name}</span>
                                <span className="heat-sector">{stock.sector}</span>
                                <strong className="heat-change">
                                  {stock.change > 0 ? "+" : ""}
                                  {stock.change.toFixed(2)}%
                                </strong>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : structureViewMode === "country" ? (
                      <div className="structure-shell">
                        <aside className="structure-column">
                          <div className="structure-column-header">
                            <span>Countries</span>
                            <strong>{activeRegion?.region_name}</strong>
                          </div>
                          <div className="structure-stack">
                            {structureCountries.map((countryCode) => {
                              const regionCard = mapRegionLookup.get(countryCode);
                              if (!regionCard) return null;
                              return (
                                <button
                                  key={countryCode}
                                  type="button"
                                  className={`structure-country-card ${selectedStructureCountry === countryCode ? "active" : ""}`}
                                  onClick={() => setSelectedStructureCountry(countryCode as Exclude<RegionCode, BaseRegion>)}
                                >
                                  <span>{regionLabels[countryCode]}</span>
                                  <strong>{regionCard.region_name}</strong>
                                  <small>{regionCard.count} articles</small>
                                </button>
                              );
                            })}
                          </div>
                        </aside>

                        <div className="structure-main">
                          <div className="structure-column-header">
                            <span>Top Segments</span>
                            <strong>{mapRegionLookup.get(selectedStructureCountry)?.region_name ?? regionLabels[selectedStructureCountry]}</strong>
                          </div>
                          <div className="structure-segment-grid">
                            {selectedCountrySegments.map((segment) => (
                              <button
                                key={segment.segment}
                                type="button"
                                className={`structure-segment-card ${activeStructureSegment?.segment === segment.segment ? "active" : ""}`}
                                onClick={() => setSelectedStructureSegment(segment.segment)}
                              >
                                <div className="structure-segment-top">
                                  <strong>{segment.segment}</strong>
                                  <span className={`trend-pill trend-${segment.trendType.toLowerCase()}`}>
                                    {segment.trendType}
                                  </span>
                                </div>
                                <p>{segment.trendSummary}</p>
                                <div className="structure-metric-row">
                                  <span>Avg Mkt Cap</span>
                                  <strong>{segment.avgMarketCap}B</strong>
                                </div>
                                <div className="structure-metric-row">
                                  <span>Avg ROI (1Y)</span>
                                  <strong>{segment.avgRoi1Y}%</strong>
                                </div>
                                <div className="structure-company-list">
                                  {segment.companies.slice(0, 3).map((company) => (
                                    <span key={company.ticker}>{company.name}</span>
                                  ))}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="structure-shell">
                        <aside className="structure-column">
                          <div className="structure-column-header">
                            <span>Segments</span>
                            <strong>{activeRegion?.region_name}</strong>
                          </div>
                          <div className="structure-stack">
                            {aggregatedSegments.map((segment) => (
                              <button
                                key={segment.segment}
                                type="button"
                                className={`structure-country-card ${activeGlobalSegment?.segment === segment.segment ? "active" : ""}`}
                                onClick={() => setSelectedGlobalSegment(segment.segment)}
                              >
                                <span>{segment.segment}</span>
                                <strong>{segment.countryCount} markets</strong>
                                <small>{segment.companies.map((company) => company.name).join(" · ")}</small>
                              </button>
                            ))}
                          </div>
                        </aside>

                        <div className="structure-main">
                          {activeGlobalSegment ? (
                            <>
                              <div className="structure-hero-card">
                                <div className="structure-hero-top">
                                  <div>
                                    <span className="eyebrow">Segment Focus</span>
                                    <h3>{activeGlobalSegment.segment}</h3>
                                  </div>
                                  <span className={`trend-pill trend-${activeGlobalSegment.trendType.toLowerCase()}`}>
                                    {activeGlobalSegment.trendType}
                                  </span>
                                </div>
                                <p>{activeGlobalSegment.trendSummary}</p>
                                <div className="structure-hero-grid">
                                  <div className="metric-box">
                                    <span>Markets</span>
                                    <strong>{activeGlobalSegment.countryCount}</strong>
                                  </div>
                                  <div className="metric-box">
                                    <span>Avg Mkt Cap</span>
                                    <strong>{activeGlobalSegment.avgMarketCap}B</strong>
                                  </div>
                                  <div className="metric-box">
                                    <span>Avg ROI (1Y)</span>
                                    <strong>{activeGlobalSegment.avgRoi1Y}%</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="structure-segment-grid structure-company-grid">
                                {activeGlobalSegment.companies.map((company) => (
                                  <button
                                    key={company.ticker}
                                    type="button"
                                    className={`structure-segment-card structure-company-card ${
                                      compareTickers.includes(company.ticker) ? "active" : ""
                                    }`}
                                    onClick={() => toggleCompareTicker(company.ticker)}
                                  >
                                    <div className="structure-segment-top">
                                      <strong>{company.name}</strong>
                                      <span>{regionLabels[company.country]}</span>
                                    </div>
                                    <div className="structure-metric-row">
                                      <span>Ticker</span>
                                      <strong>{company.ticker}</strong>
                                    </div>
                                    <div className="structure-metric-row">
                                      <span>Market Cap</span>
                                      <strong>{company.marketCap}B</strong>
                                    </div>
                                    <div className="structure-metric-row">
                                      <span>ROI (1Y)</span>
                                      <strong>{company.roi1Y}%</strong>
                                    </div>
                                    <p>{company.note}</p>
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="state-card">No segment data available for this region yet.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  <aside className="news-panel">
                    {chartMode === "heatmap" && activeStock ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{activeStock.ticker}</p>
                            <h2>{activeStock.name}</h2>
                            <p className="news-subtitle">
                              Finviz-style frontend heatmap card for the selected region
                            </p>
                          </div>
                          <div className="sentiment-pill">{activeStock.sector}</div>
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Region</span>
                            <strong>{activeStock.region}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Move</span>
                            <strong>
                              {activeStock.change > 0 ? "+" : ""}
                              {activeStock.change.toFixed(2)}%
                            </strong>
                          </div>
                        </div>

                        <div className="article-list">
                          {regionStocks.map((stock) => (
                            <button
                              key={stock.ticker}
                              type="button"
                              className={`article-card stock-list-card ${
                                stock.ticker === activeStock.ticker ? "stock-list-card-active" : ""
                              }`}
                              onClick={() => setSelectedTicker(stock.ticker)}
                            >
                              <div className="article-meta">
                                <span>{stock.sector}</span>
                                <span
                                  className="article-tone"
                                  style={{
                                    color:
                                      stock.change > 0.5
                                        ? "#86efac"
                                        : stock.change < -0.5
                                          ? "#fca5a5"
                                          : "#fde68a",
                                  }}
                                >
                                  {stock.change > 0 ? "+" : ""}
                                  {stock.change.toFixed(2)}%
                                </span>
                              </div>
                              <h3>
                                {stock.ticker} · {stock.name}
                              </h3>
                              <p>{stock.region} market heatmap block</p>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : chartMode === "structure" && structureViewMode === "country" && activeStructureSegment ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{selectedStructureCountry}</p>
                            <h2>{activeStructureSegment.segment}</h2>
                            <p className="news-subtitle">{activeStructureSegment.trendSummary}</p>
                          </div>
                          <div className={`sentiment-pill trend-${activeStructureSegment.trendType.toLowerCase()}`}>
                            {activeStructureSegment.trendType}
                          </div>
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Country</span>
                            <strong>{regionLabels[selectedStructureCountry]}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Avg Mkt Cap</span>
                            <strong>{activeStructureSegment.avgMarketCap}B</strong>
                          </div>
                          <div className="metric-box">
                            <span>Avg ROI (1Y)</span>
                            <strong>{activeStructureSegment.avgRoi1Y}%</strong>
                          </div>
                          <div className="metric-box">
                            <span>Compare</span>
                            <strong>{compareTickers.length}/3</strong>
                          </div>
                        </div>

                        <div className="structure-company-panel">
                          <div className="structure-panel-header">
                            <strong>Top 3 companies</strong>
                            <span>Select up to 3 for comparison</span>
                          </div>
                          <div className="article-list">
                            {activeStructureSegment.companies.map((company) => (
                              <button
                                key={company.ticker}
                                type="button"
                                className={`article-card stock-list-card ${
                                  compareTickers.includes(company.ticker) ? "stock-list-card-active" : ""
                                }`}
                                onClick={() => toggleCompareTicker(company.ticker)}
                              >
                                <div className="article-meta">
                                  <span>{company.ticker}</span>
                                  <span className="article-tone">
                                    {company.roi1Y > 0 ? "+" : ""}
                                    {company.roi1Y}%
                                  </span>
                                </div>
                                <h3>{company.name}</h3>
                                <p>{company.note}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="risk-summary-card">
                          <div className="risk-summary-header">
                            <strong>Comparison</strong>
                            <span className="map-chip">Up to 3 companies</span>
                          </div>
                          {comparisonCompanies.length > 0 ? (
                            <div className="comparison-grid">
                              {comparisonCompanies.map((company) => (
                                <div key={company.ticker} className="comparison-card">
                                  <span>{company.ticker}</span>
                                  <strong>{company.name}</strong>
                                  <small>Mcap {company.marketCap}B</small>
                                  <small>ROI {company.roi1Y}%</small>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="risk-summary-copy">
                              Start with a country, pick a segment, then select up to three companies to compare.
                            </p>
                          )}
                          {activeStructureCompany ? (
                            <p className="risk-summary-copy">
                              Focus company: {activeStructureCompany.name}. This segment is currently classified as{" "}
                              {activeStructureSegment.trendType.toLowerCase()} because {activeStructureSegment.trendSummary.toLowerCase()}
                            </p>
                          ) : null}
                        </div>
                      </>
                    ) : chartMode === "structure" && structureViewMode === "segment" && activeGlobalSegment ? (
                      <>
                        <div className="news-header">
                          <div>
                            <p className="eyebrow">{selectedRegion}</p>
                            <h2>{activeGlobalSegment.segment}</h2>
                            <p className="news-subtitle">{activeGlobalSegment.trendSummary}</p>
                          </div>
                          <div className={`sentiment-pill trend-${activeGlobalSegment.trendType.toLowerCase()}`}>
                            {activeGlobalSegment.trendType}
                          </div>
                        </div>

                        <div className="news-metrics">
                          <div className="metric-box">
                            <span>Region</span>
                            <strong>{regionLabels[selectedRegion]}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Markets</span>
                            <strong>{activeGlobalSegment.countryCount}</strong>
                          </div>
                          <div className="metric-box">
                            <span>Avg Mkt Cap</span>
                            <strong>{activeGlobalSegment.avgMarketCap}B</strong>
                          </div>
                          <div className="metric-box">
                            <span>Compare</span>
                            <strong>{compareTickers.length}/3</strong>
                          </div>
                        </div>

                        <div className="risk-summary-card">
                          <div className="risk-summary-header">
                            <strong>Top 3 Companies In Segment</strong>
                            <span className="map-chip">{activeGlobalSegment.segment}</span>
                          </div>
                          <p className="risk-summary-copy">
                            Cross-market view for {activeGlobalSegment.segment.toLowerCase()} inside{" "}
                            {activeRegion?.region_name ?? regionLabels[selectedRegion]}.
                          </p>
                          <div className="comparison-grid">
                            {activeGlobalSegment.companies.map((company) => (
                              <button
                                key={company.ticker}
                                type="button"
                                className={`comparison-card comparison-card-button ${
                                  compareTickers.includes(company.ticker) ? "stock-list-card-active" : ""
                                }`}
                                onClick={() => toggleCompareTicker(company.ticker)}
                              >
                                <span>{regionLabels[company.country]}</span>
                                <strong>{company.name}</strong>
                                <small>{company.ticker}</small>
                                <small>Mcap {company.marketCap}B</small>
                                <small>ROI {company.roi1Y}%</small>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="risk-summary-card">
                          <div className="risk-summary-header">
                            <strong>Comparison</strong>
                            <span className="map-chip">Up to 3 companies</span>
                          </div>
                          {comparisonCompanies.length > 0 ? (
                            <div className="comparison-grid">
                              {comparisonCompanies.map((company) => (
                                <div key={company.ticker} className="comparison-card">
                                  <span>{regionLabels[(company as typeof company & { country?: Exclude<RegionCode, BaseRegion> }).country ?? selectedStructureCountry]}</span>
                                  <strong>{company.name}</strong>
                                  <small>{company.segment}</small>
                                  <small>Mcap {company.marketCap}B</small>
                                  <small>ROI {company.roi1Y}%</small>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="risk-summary-copy">
                              Pick up to three companies inside this segment to compare them side by side.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="state-card">No stock or segment selected.</div>
                    )}
                  </aside>
                </div>
              ) : (
                <div className="explore-grid">
                  <section className="map-panel">
                    <div className="map-header">
                      <div>
                        <p className="eyebrow">{viewMode === "pf" ? "PF view" : "Personal view"}</p>
                        <h2>{viewMode === "pf" ? "Portfolio workspace" : "Profile onboarding"}</h2>
                      </div>
                      <div className="map-chip">Coming soon</div>
                    </div>

                    {viewMode === "pf" ? (
                      <div
                        className="state-card"
                        style={{ minHeight: "420px", display: "grid", placeItems: "center" }}
                      >
                        PF tab is ready. We can build portfolio-specific UI here next.
                      </div>
                    ) : profileStep === "login" ? (
                      <div className="profile-card">
                        <div className="profile-card-header">
                          <p className="eyebrow">Step 1</p>
                          <h3>Enter a basic profile</h3>
                          <p>
                            This is frontend-only for now. Fill in anything minimal, then move to preference setup.
                          </p>
                        </div>

                        <div className="profile-form-grid">
                          <label className="profile-field">
                            <span>Name</span>
                            <input
                              value={profileForm.name}
                              onChange={(event) =>
                                setProfileForm((current) => ({ ...current, name: event.target.value }))
                              }
                              placeholder="Sean"
                            />
                          </label>

                          <label className="profile-field">
                            <span>Email</span>
                            <input
                              value={profileForm.email}
                              onChange={(event) =>
                                setProfileForm((current) => ({ ...current, email: event.target.value }))
                              }
                              placeholder="sean@example.com"
                            />
                          </label>
                        </div>

                        <div className="profile-actions">
                          <button
                            type="button"
                            className="profile-primary-button"
                            disabled={!canContinueProfile}
                            onClick={() => setProfileStep("preferences")}
                          >
                            Continue to Preferences
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="profile-card">
                        <div className="profile-card-header">
                          <p className="eyebrow">Step 2</p>
                          <h3>Investor preferences</h3>
                          <p>Adjust a few core settings. We can wire this to real persistence later.</p>
                        </div>

                        <div className="profile-preferences-layout">
                          <section className="profile-input-section">
                            <div className="profile-input-section-header">
                              <strong>Strategy</strong>
                              <span>Define what this portfolio is trying to do over time.</span>
                            </div>
                            <div className="profile-form-grid">
                              <label className="profile-field">
                                <span>Investment goal</span>
                                <select
                                  value={profilePreferences.investmentGoal}
                                  onChange={(event) =>
                                    setProfilePreferences((current) => ({
                                      ...current,
                                      investmentGoal: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="capital_preservation">Capital preservation</option>
                                  <option value="balanced_growth">Balanced growth</option>
                                  <option value="long_term_growth">Long-term growth</option>
                                  <option value="income_generation">Income generation</option>
                                </select>
                              </label>

                              <label className="profile-field">
                                <span>Investment horizon</span>
                                <select
                                  value={profilePreferences.investmentHorizon}
                                  onChange={(event) =>
                                    setProfilePreferences((current) => ({
                                      ...current,
                                      investmentHorizon: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="under_3_years">Under 3 years</option>
                                  <option value="3_5_years">3 to 5 years</option>
                                  <option value="5_10_years">5 to 10 years</option>
                                  <option value="10_plus_years">10+ years</option>
                                </select>
                              </label>
                            </div>
                          </section>

                          <section className="profile-input-section">
                            <div className="profile-input-section-header">
                              <strong>Risk profile</strong>
                              <span>Set how cautious this investor should be under volatility and drawdowns.</span>
                            </div>
                            <div className="profile-slider-stack">
                              <label className="profile-field">
                                <div className="profile-field-label">
                                  <span>Risk aversion</span>
                                  <span className="info-tooltip" tabIndex={0}>
                                    ?
                                    <span className="info-tooltip-card">
                                      Higher values mean the investor is more sensitive to downside risk and prefers a more defensive portfolio.
                                    </span>
                                  </span>
                                </div>
                                <div className="profile-slider-row">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={profilePreferences.riskAversion}
                                    onChange={(event) =>
                                      setProfilePreferences((current) => ({
                                        ...current,
                                        riskAversion: Number(event.target.value),
                                      }))
                                    }
                                  />
                                  <strong>{profilePreferences.riskAversion}</strong>
                                </div>
                                <p className="profile-helper-copy">
                                  {riskAversionLabel(profilePreferences.riskAversion)}
                                </p>
                              </label>

                              <label className="profile-field">
                                <div className="profile-field-label">
                                  <span>Loss tolerance</span>
                                  <span className="info-tooltip" tabIndex={0}>
                                    ?
                                    <span className="info-tooltip-card">
                                      This estimates how much temporary portfolio decline the investor can tolerate before feeling pressure to reduce risk.
                                    </span>
                                  </span>
                                </div>
                                <div className="profile-slider-row">
                                  <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={profilePreferences.lossTolerance}
                                    onChange={(event) =>
                                      setProfilePreferences((current) => ({
                                        ...current,
                                        lossTolerance: Number(event.target.value),
                                      }))
                                    }
                                  />
                                  <strong>{profilePreferences.lossTolerance}%</strong>
                                </div>
                                <p className="profile-helper-copy">
                                  {lossToleranceLabel(profilePreferences.lossTolerance)}
                                </p>
                              </label>
                            </div>
                          </section>

                          <section className="profile-input-section">
                            <div className="profile-input-section-header">
                              <strong>Personal context</strong>
                              <span>Capture how stable the investor's situation is month to month.</span>
                            </div>
                            <div className="profile-form-grid">
                              <label className="profile-field">
                                <span>Occupation</span>
                                <select
                                  value={profilePreferences.occupation}
                                  onChange={(event) =>
                                    setProfilePreferences((current) => ({
                                      ...current,
                                      occupation: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="student">Student</option>
                                  <option value="professional">Professional</option>
                                  <option value="self_employed">Self-employed</option>
                                  <option value="other">Other</option>
                                </select>
                              </label>

                              <label className="profile-field">
                                <span>Monthly cash flow stability</span>
                                <select
                                  value={profilePreferences.monthlyCashFlowStability}
                                  onChange={(event) =>
                                    setProfilePreferences((current) => ({
                                      ...current,
                                      monthlyCashFlowStability: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="low">Low</option>
                                  <option value="moderate">Moderate</option>
                                  <option value="high">High</option>
                                </select>
                              </label>
                            </div>
                          </section>
                        </div>

                        <div className="profile-actions">
                          <button
                            type="button"
                            className="map-back-button"
                            onClick={() => setProfileStep("login")}
                          >
                            Back
                          </button>
                          <button type="button" className="profile-primary-button">
                            Save Later
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  <aside className="news-panel">
                    {viewMode === "pf" ? (
                      <div className="state-card" style={{ minHeight: "100%" }}>
                        Empty portfolio panel placeholder.
                      </div>
                    ) : (
                      <div className="profile-preview-card">
                        <div className="profile-preview-header">
                          <p className="eyebrow">Profile Preview</p>
                          <h3>{profileForm.name || "New user"}</h3>
                          <p>{profileForm.email || "No email entered yet"}</p>
                        </div>

                        <div className="profile-preview-hero">
                          <div className="profile-preview-hero-top">
                            <div className="profile-preview-pill">Inputs ready</div>
                            <div className="profile-preview-score">
                              <span>Profile fit</span>
                              <strong>{riskAversionLabel(profilePreferences.riskAversion)}</strong>
                            </div>
                          </div>
                          <div className="profile-preview-hero-grid">
                            <div className="profile-mini-card">
                              <span>Risk posture</span>
                              <strong>{riskPostureLabel(profilePreferences.riskAversion)}</strong>
                            </div>
                            <div className="profile-mini-card">
                              <span>Horizon</span>
                              <strong>{humanizeProfileValue(profilePreferences.investmentHorizon)}</strong>
                            </div>
                            <div className="profile-mini-card">
                              <span>Cash flow</span>
                              <strong>{humanizeProfileValue(profilePreferences.monthlyCashFlowStability)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="profile-preview-section">
                          <div className="profile-section-header">
                            <strong>Investor setup</strong>
                            <span>Core identity and objective</span>
                          </div>
                          <div className="profile-summary-list">
                            <div className="profile-summary-row">
                              <span>Goal</span>
                              <strong>{humanizeProfileValue(profilePreferences.investmentGoal)}</strong>
                            </div>
                            <div className="profile-summary-row">
                              <span>Occupation</span>
                              <strong>{humanizeProfileValue(profilePreferences.occupation)}</strong>
                            </div>
                            <div className="profile-summary-row">
                              <span>Cash flow stability</span>
                              <strong>
                                {humanizeProfileValue(profilePreferences.monthlyCashFlowStability)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="profile-preview-section">
                          <div className="profile-section-header">
                            <strong>Risk settings</strong>
                            <span>How conservative or aggressive this investor may be</span>
                          </div>
                          <div className="profile-summary-list">
                            <div className="profile-summary-row">
                              <span>Risk aversion</span>
                              <strong>{profilePreferences.riskAversion}</strong>
                            </div>
                            <div className="profile-summary-row">
                              <span>Loss tolerance</span>
                              <strong>{profilePreferences.lossTolerance}%</strong>
                            </div>
                            <div className="profile-summary-row">
                              <span>Interpretation</span>
                              <strong>{lossToleranceLabel(profilePreferences.lossTolerance)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="profile-insight-card">
                          <span className="profile-insight-label">Interpretation</span>
                          <strong>{riskPostureLabel(profilePreferences.riskAversion)}</strong>
                          <p>
                            {lossToleranceLabel(profilePreferences.lossTolerance)} with{" "}
                            {humanizeProfileValue(profilePreferences.monthlyCashFlowStability)} monthly cash flow
                            stability.
                          </p>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
