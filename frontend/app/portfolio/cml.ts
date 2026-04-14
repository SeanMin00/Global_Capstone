import {
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_SIMULATION_COUNT,
  MIN_OBSERVATIONS_FOR_CML,
} from "./cml-config";
import type { HistoricalClosePoint } from "../stocks/stock-api";

export type PortfolioAssetInput = {
  ticker: string;
  weight: number;
};

export type PortfolioPoint = {
  risk: number;
  return: number;
  sharpe: number;
  type: "random" | "frontier" | "cml" | "risk_free" | "tangency" | "user";
};

export type TangencyPortfolio = {
  risk: number;
  return: number;
  sharpe: number;
  weights: Record<string, number>;
};

export type PortfolioSummary = {
  riskFreeRate: number;
  interpretation: string;
  alignedObservations: number;
  warnings: string[];
  weightsNormalized: boolean;
  inputWeightTotal: number;
};

export type CmlAnalysisResult = {
  randomPortfolios: PortfolioPoint[];
  efficientFrontier: PortfolioPoint[];
  cml: PortfolioPoint[];
  riskFreePoint: PortfolioPoint;
  tangencyPortfolio: TangencyPortfolio | null;
  userPortfolio: TangencyPortfolio;
  summary: PortfolioSummary;
};

type SanitizedAssets = {
  assets: PortfolioAssetInput[];
  inputWeightTotal: number;
  weightsNormalized: boolean;
  warnings: string[];
};

type ReturnMatrix = {
  tickers: string[];
  dates: string[];
  returns: number[][];
};

function clampWeight(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function sanitizePortfolioAssets(inputs: PortfolioAssetInput[]): SanitizedAssets {
  const grouped = new Map<string, number>();
  const warnings: string[] = [];

  for (const asset of inputs) {
    const ticker = asset.ticker.trim().toUpperCase();
    if (!ticker) continue;
    grouped.set(ticker, (grouped.get(ticker) ?? 0) + clampWeight(asset.weight));
  }

  const assets = [...grouped.entries()].map(([ticker, weight]) => ({ ticker, weight }));
  const inputWeightTotal = assets.reduce((sum, asset) => sum + asset.weight, 0);

  if (!assets.length) {
    return {
      assets: [],
      inputWeightTotal: 0,
      weightsNormalized: false,
      warnings: ["Add at least one asset to build a portfolio."],
    };
  }

  if (assets.length === 1) {
    return {
      assets: [{ ticker: assets[0].ticker, weight: 1 }],
      inputWeightTotal,
      weightsNormalized: inputWeightTotal !== 100,
      warnings:
        inputWeightTotal !== 100
          ? ["Weights were normalized to 100% automatically."]
          : [],
    };
  }

  const positiveTotal = assets.reduce((sum, asset) => sum + asset.weight, 0);
  if (positiveTotal <= 0) {
    const equalWeight = 1 / assets.length;
    warnings.push("Weights were missing, so equal weights were applied.");
    return {
      assets: assets.map((asset) => ({ ticker: asset.ticker, weight: equalWeight })),
      inputWeightTotal,
      weightsNormalized: true,
      warnings,
    };
  }

  const weightsNormalized = Math.abs(positiveTotal - 100) > 0.5;
  if (weightsNormalized) {
    warnings.push("Weights did not sum to 100%, so they were normalized automatically.");
  }

  return {
    assets: assets.map((asset) => ({
      ticker: asset.ticker,
      weight: asset.weight / positiveTotal,
    })),
    inputWeightTotal,
    weightsNormalized,
    warnings,
  };
}

function buildReturnMatrix(
  priceSeriesByTicker: Record<string, HistoricalClosePoint[]>,
  tickers: string[],
): ReturnMatrix {
  const dateSets = tickers.map((ticker) => new Set(priceSeriesByTicker[ticker].map((point) => point.date)));
  const intersection = [...dateSets[0]].filter((date) => dateSets.every((set) => set.has(date))).sort();

  const alignedRows = tickers.map((ticker) => {
    const priceMap = new Map(priceSeriesByTicker[ticker].map((point) => [point.date, point.close]));
    return intersection.map((date) => priceMap.get(date) ?? null);
  });

  const returnDates: string[] = [];
  const returns: number[][] = [];

  for (let index = 1; index < intersection.length; index += 1) {
    const row = alignedRows.map((prices) => {
      const previous = prices[index - 1];
      const current = prices[index];
      if (previous === null || current === null || previous <= 0 || current <= 0) {
        return NaN;
      }
      return current / previous - 1;
    });

    if (row.some((value) => Number.isNaN(value))) {
      continue;
    }

    returnDates.push(intersection[index]);
    returns.push(row);
  }

  return {
    tickers,
    dates: returnDates,
    returns,
  };
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function covariance(valuesA: number[], valuesB: number[]) {
  if (valuesA.length < 2 || valuesB.length < 2) return 0;
  const meanA = mean(valuesA);
  const meanB = mean(valuesB);
  let total = 0;
  for (let index = 0; index < valuesA.length; index += 1) {
    total += (valuesA[index] - meanA) * (valuesB[index] - meanB);
  }
  return total / (valuesA.length - 1);
}

function annualizeExpectedReturns(returnMatrix: ReturnMatrix) {
  return returnMatrix.tickers.map((_, columnIndex) =>
    mean(returnMatrix.returns.map((row) => row[columnIndex])) * 252,
  );
}

function annualizeCovarianceMatrix(returnMatrix: ReturnMatrix) {
  return returnMatrix.tickers.map((_, rowIndex) =>
    returnMatrix.tickers.map((__, columnIndex) => {
      const seriesA = returnMatrix.returns.map((row) => row[rowIndex]);
      const seriesB = returnMatrix.returns.map((row) => row[columnIndex]);
      return covariance(seriesA, seriesB) * 252;
    }),
  );
}

function portfolioMetrics(weights: number[], expectedReturns: number[], covarianceMatrix: number[][], riskFreeRate: number) {
  const portfolioReturn = weights.reduce(
    (sum, weight, index) => sum + weight * expectedReturns[index],
    0,
  );

  let variance = 0;
  for (let rowIndex = 0; rowIndex < weights.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < weights.length; columnIndex += 1) {
      variance += weights[rowIndex] * weights[columnIndex] * covarianceMatrix[rowIndex][columnIndex];
    }
  }

  const risk = Math.sqrt(Math.max(variance, 0));
  const sharpe = risk > 0 ? (portfolioReturn - riskFreeRate) / risk : 0;

  return {
    risk,
    return: portfolioReturn,
    sharpe,
  };
}

function buildWeightMap(tickers: string[], weights: number[]) {
  return Object.fromEntries(tickers.map((ticker, index) => [ticker, Number(weights[index].toFixed(4))]));
}

function simulateRandomPortfolios(
  tickers: string[],
  expectedReturns: number[],
  covarianceMatrix: number[][],
  riskFreeRate: number,
  simulationCount: number,
) {
  const portfolios: (PortfolioPoint & { weights: number[] })[] = [];

  for (let simulation = 0; simulation < simulationCount; simulation += 1) {
    const randomWeights = tickers.map(() => Math.random());
    const total = randomWeights.reduce((sum, value) => sum + value, 0);
    const normalizedWeights = randomWeights.map((value) => value / total);
    const metrics = portfolioMetrics(normalizedWeights, expectedReturns, covarianceMatrix, riskFreeRate);

    portfolios.push({
      ...metrics,
      type: "random",
      weights: normalizedWeights,
    });
  }

  return portfolios;
}

function approximateEfficientFrontier(randomPortfolios: (PortfolioPoint & { weights: number[] })[]) {
  const sorted = [...randomPortfolios].sort((a, b) => a.risk - b.risk);
  const frontier: PortfolioPoint[] = [];
  let bestReturn = Number.NEGATIVE_INFINITY;

  for (const point of sorted) {
    if (point.return > bestReturn) {
      bestReturn = point.return;
      frontier.push({
        risk: point.risk,
        return: point.return,
        sharpe: point.sharpe,
        type: "frontier",
      });
    }
  }

  return frontier;
}

function buildCmlPoints(
  tangency: TangencyPortfolio | null,
  userRisk: number,
  riskFreeRate: number,
) {
  if (!tangency || tangency.risk <= 0) return [];

  const maxRisk = Math.max(tangency.risk * 1.3, userRisk * 1.15, 0.12);
  const slope = (tangency.return - riskFreeRate) / tangency.risk;

  return Array.from({ length: 28 }, (_, index) => {
    const risk = (maxRisk / 27) * index;
    return {
      risk,
      return: riskFreeRate + slope * risk,
      sharpe: tangency.sharpe,
      type: "cml" as const,
    };
  });
}

function interpretPortfolio(params: {
  assetCount: number;
  userPortfolio: TangencyPortfolio;
  tangencyPortfolio: TangencyPortfolio | null;
  riskFreeRate: number;
  warnings: string[];
}) {
  const { assetCount, userPortfolio, tangencyPortfolio, riskFreeRate, warnings } = params;

  if (warnings.length && warnings[0]?.includes("Add at least one asset")) {
    return "Add a few assets first to generate a portfolio efficiency view.";
  }

  if (assetCount === 1) {
    return "This view has only one asset, so the full efficient frontier and Capital Market Line are not very meaningful yet.";
  }

  if (!tangencyPortfolio) {
    return "We need more overlapping price history before we can estimate an efficient region reliably.";
  }

  const cmlReturnAtUserRisk =
    riskFreeRate + ((tangencyPortfolio.return - riskFreeRate) / tangencyPortfolio.risk) * userPortfolio.risk;

  if (userPortfolio.return >= cmlReturnAtUserRisk - 0.005) {
    return "Your portfolio is close to the efficient region, which suggests a fairly strong risk-return tradeoff for this asset mix.";
  }

  if (userPortfolio.return < cmlReturnAtUserRisk - 0.02) {
    return "Your portfolio is below the Capital Market Line, which may mean you are taking more risk than necessary for the return you are getting.";
  }

  return "Your portfolio is in the investable region, but there may be room to improve its risk-return balance.";
}

// MVP note:
// The efficient frontier and tangency portfolio are approximated from random long-only portfolios.
// To upgrade later, replace the random simulation step with a proper optimizer while keeping the return shape unchanged.
export function analyzePortfolioCml(
  inputs: PortfolioAssetInput[],
  priceSeriesByTicker: Record<string, HistoricalClosePoint[]>,
  options?: {
    riskFreeRate?: number;
    simulationCount?: number;
  },
): CmlAnalysisResult {
  const riskFreeRate = options?.riskFreeRate ?? DEFAULT_RISK_FREE_RATE;
  const simulationCount = options?.simulationCount ?? DEFAULT_SIMULATION_COUNT;
  const sanitized = sanitizePortfolioAssets(inputs);
  const warnings = [...sanitized.warnings];

  if (!sanitized.assets.length) {
    const emptyPoint = { risk: 0, return: riskFreeRate, sharpe: 0, type: "risk_free" as const };
    return {
      randomPortfolios: [],
      efficientFrontier: [],
      cml: [],
      riskFreePoint: emptyPoint,
      tangencyPortfolio: null,
      userPortfolio: { risk: 0, return: riskFreeRate, sharpe: 0, weights: {} },
      summary: {
        riskFreeRate,
        interpretation: interpretPortfolio({
          assetCount: 0,
          userPortfolio: { risk: 0, return: riskFreeRate, sharpe: 0, weights: {} },
          tangencyPortfolio: null,
          riskFreeRate,
          warnings,
        }),
        alignedObservations: 0,
        warnings,
        weightsNormalized: sanitized.weightsNormalized,
        inputWeightTotal: sanitized.inputWeightTotal,
      },
    };
  }

  const availableAssets = sanitized.assets.filter((asset) => (priceSeriesByTicker[asset.ticker] ?? []).length > 0);
  if (availableAssets.length !== sanitized.assets.length) {
    warnings.push("Some assets were skipped because price history was unavailable.");
  }

  const returnMatrix =
    availableAssets.length > 0
      ? buildReturnMatrix(
          priceSeriesByTicker,
          availableAssets.map((asset) => asset.ticker),
        )
      : { tickers: [], dates: [], returns: [] };

  if (returnMatrix.returns.length < MIN_OBSERVATIONS_FOR_CML) {
    warnings.push("Fewer than 30 overlapping observations were available, so the chart may be unstable.");
  }

  const expectedReturns = annualizeExpectedReturns(returnMatrix);
  const covarianceMatrix = annualizeCovarianceMatrix(returnMatrix);
  const userWeights = availableAssets.map((asset) => asset.weight);
  const userMetrics = portfolioMetrics(userWeights, expectedReturns, covarianceMatrix, riskFreeRate);
  const userPortfolio = {
    ...userMetrics,
    weights: buildWeightMap(returnMatrix.tickers, userWeights),
  };

  let randomPortfolios: PortfolioPoint[] = [];
  let efficientFrontier: PortfolioPoint[] = [];
  let tangencyPortfolio: TangencyPortfolio | null = null;
  let cml: PortfolioPoint[] = [];

  if (availableAssets.length >= 2 && returnMatrix.returns.length >= MIN_OBSERVATIONS_FOR_CML) {
    const simulated = simulateRandomPortfolios(
      returnMatrix.tickers,
      expectedReturns,
      covarianceMatrix,
      riskFreeRate,
      simulationCount,
    );

    randomPortfolios = simulated.map((point) => ({
      risk: point.risk,
      return: point.return,
      sharpe: point.sharpe,
      type: "random",
    }));
    efficientFrontier = approximateEfficientFrontier(simulated);

    const tangencyCandidate = simulated.reduce((best, current) =>
      current.sharpe > best.sharpe ? current : best,
    );

    tangencyPortfolio = {
      risk: tangencyCandidate.risk,
      return: tangencyCandidate.return,
      sharpe: tangencyCandidate.sharpe,
      weights: buildWeightMap(returnMatrix.tickers, tangencyCandidate.weights),
    };

    cml = buildCmlPoints(tangencyPortfolio, userPortfolio.risk, riskFreeRate);
  }

  const riskFreePoint: PortfolioPoint = {
    risk: 0,
    return: riskFreeRate,
    sharpe: 0,
    type: "risk_free",
  };

  return {
    randomPortfolios,
    efficientFrontier,
    cml,
    riskFreePoint,
    tangencyPortfolio,
    userPortfolio: {
      risk: userPortfolio.risk,
      return: userPortfolio.return,
      sharpe: userPortfolio.sharpe,
      weights: userPortfolio.weights,
    },
    summary: {
      riskFreeRate,
      interpretation: interpretPortfolio({
        assetCount: availableAssets.length,
        userPortfolio: {
          risk: userPortfolio.risk,
          return: userPortfolio.return,
          sharpe: userPortfolio.sharpe,
          weights: userPortfolio.weights,
        },
        tangencyPortfolio,
        riskFreeRate,
        warnings,
      }),
      alignedObservations: returnMatrix.returns.length,
      warnings,
      weightsNormalized: sanitized.weightsNormalized,
      inputWeightTotal: sanitized.inputWeightTotal,
    },
  };
}
