// Central fallback only. The PF page first asks the backend for FRED DGS3MO;
// this value is used only when that official fetch path is unavailable.
export const DEFAULT_RISK_FREE_RATE = Number(
  process.env.NEXT_PUBLIC_RISK_FREE_RATE ?? "0.04",
);

export const DEFAULT_SIMULATION_COUNT = 3000;
export const MIN_OBSERVATIONS_FOR_CML = 30;
