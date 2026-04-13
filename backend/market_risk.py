from __future__ import annotations

import asyncio
import math
import os
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

import httpx
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series/observations"
RISK_COUNTRY_ORDER = ["KR", "JP", "CN", "TW", "DE", "UK", "FR", "US"]
GLOBAL_BENCHMARK_SYMBOL = "SPY"
GLOBAL_BENCHMARK_NAME = "SPDR S&P 500 ETF Trust"
VIX_SERIES_ID = "VIXCLS"


@dataclass(frozen=True)
class CountryMarketConfig:
    iso_code: str
    country_name: str
    region_group: str
    currency_code: str
    market_symbol: str
    market_name: str
    benchmark_symbol: str
    benchmark_name: str
    fx_pair_code: str | None = None
    fx_from_symbol: str | None = None
    fx_to_symbol: str | None = None


COUNTRY_CONFIGS: dict[str, CountryMarketConfig] = {
    "KR": CountryMarketConfig(
        iso_code="KR",
        country_name="South Korea",
        region_group="ASIA",
        currency_code="KRW",
        market_symbol="EWY",
        market_name="iShares MSCI South Korea ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDKRW",
        fx_from_symbol="USD",
        fx_to_symbol="KRW",
    ),
    "JP": CountryMarketConfig(
        iso_code="JP",
        country_name="Japan",
        region_group="ASIA",
        currency_code="JPY",
        market_symbol="EWJ",
        market_name="iShares MSCI Japan ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDJPY",
        fx_from_symbol="USD",
        fx_to_symbol="JPY",
    ),
    "CN": CountryMarketConfig(
        iso_code="CN",
        country_name="China",
        region_group="ASIA",
        currency_code="CNY",
        market_symbol="MCHI",
        market_name="iShares MSCI China ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDCNY",
        fx_from_symbol="USD",
        fx_to_symbol="CNY",
    ),
    "TW": CountryMarketConfig(
        iso_code="TW",
        country_name="Taiwan",
        region_group="ASIA",
        currency_code="TWD",
        market_symbol="EWT",
        market_name="iShares MSCI Taiwan ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDTWD",
        fx_from_symbol="USD",
        fx_to_symbol="TWD",
    ),
    "DE": CountryMarketConfig(
        iso_code="DE",
        country_name="Germany",
        region_group="EU",
        currency_code="EUR",
        market_symbol="EWG",
        market_name="iShares MSCI Germany ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDEUR",
        fx_from_symbol="USD",
        fx_to_symbol="EUR",
    ),
    "UK": CountryMarketConfig(
        iso_code="UK",
        country_name="United Kingdom",
        region_group="EU",
        currency_code="GBP",
        market_symbol="EWU",
        market_name="iShares MSCI United Kingdom ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDGBP",
        fx_from_symbol="USD",
        fx_to_symbol="GBP",
    ),
    "FR": CountryMarketConfig(
        iso_code="FR",
        country_name="France",
        region_group="EU",
        currency_code="EUR",
        market_symbol="EWQ",
        market_name="iShares MSCI France ETF",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
        fx_pair_code="USDEUR",
        fx_from_symbol="USD",
        fx_to_symbol="EUR",
    ),
    "US": CountryMarketConfig(
        iso_code="US",
        country_name="United States",
        region_group="US",
        currency_code="USD",
        market_symbol="SPY",
        market_name="SPDR S&P 500 ETF Trust",
        benchmark_symbol=GLOBAL_BENCHMARK_SYMBOL,
        benchmark_name=GLOBAL_BENCHMARK_NAME,
    ),
}


def alpha_vantage_api_key() -> str:
    return os.getenv("ALPHA_VANTAGE_API_KEY", "")


def fred_api_key() -> str:
    return os.getenv("FRED_API_KEY", "")


def market_risk_ready() -> bool:
    return bool(alpha_vantage_api_key())


def alpha_vantage_outputsize() -> str:
    return os.getenv("ALPHA_VANTAGE_OUTPUTSIZE", "compact")


def is_alpha_vantage_rate_limited(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    text = " ".join(str(value) for value in payload.values()).lower()
    return "1 request per second" in text or "rate limit" in text or "please consider spreading out" in text


def risk_level(score: float) -> str:
    if score >= 65:
        return "high"
    if score >= 35:
        return "moderate"
    return "low"


def annualized_volatility(returns: list[float], window: int) -> float | None:
    sample = returns[-window:]
    if len(sample) < window:
        return None

    mean = sum(sample) / len(sample)
    variance = sum((value - mean) ** 2 for value in sample) / (len(sample) - 1)
    return math.sqrt(variance) * math.sqrt(252)


def covariance(a: list[float], b: list[float]) -> float:
    mean_a = sum(a) / len(a)
    mean_b = sum(b) / len(b)
    return sum((x - mean_a) * (y - mean_b) for x, y in zip(a, b, strict=False)) / (len(a) - 1)


def variance(values: list[float]) -> float:
    mean_value = sum(values) / len(values)
    return sum((value - mean_value) ** 2 for value in values) / (len(values) - 1)


def compute_beta(asset_returns: list[float], benchmark_returns: list[float], window: int = 60) -> float | None:
    asset_sample = asset_returns[-window:]
    benchmark_sample = benchmark_returns[-window:]
    if len(asset_sample) < window or len(benchmark_sample) < window:
        return None

    benchmark_variance = variance(benchmark_sample)
    if benchmark_variance == 0:
        return None

    return covariance(asset_sample, benchmark_sample) / benchmark_variance


def compute_cumulative_return(returns: list[float], window: int = 60) -> float | None:
    sample = returns[-window:]
    if len(sample) < window:
        return None
    return math.exp(sum(sample)) - 1


def normalized_score(value: float | None, floor: float, ceiling: float) -> float:
    if value is None:
        return 0.0
    clipped = max(floor, min(value, ceiling))
    return round(((clipped - floor) / (ceiling - floor)) * 100, 2)


def build_explanation(
    *,
    score: float,
    level: str,
    realized_vol_30d: float | None,
    beta_60d: float | None,
    fx_vol_30d: float | None,
    vix_close: float | None,
    country_code: str,
) -> str:
    drivers: list[str] = []
    if realized_vol_30d is not None:
        drivers.append(f"30d realized vol {realized_vol_30d:.2%}")
    if beta_60d is not None:
        drivers.append(f"beta {beta_60d:.2f}")
    if country_code != "US" and fx_vol_30d is not None:
        drivers.append(f"FX vol {fx_vol_30d:.2%}")

    context = ""
    if vix_close is not None:
        if vix_close >= 25:
            context = f" Global stress context is elevated with VIX at {vix_close:.2f}."
        else:
            context = f" Global stress context is moderate with VIX at {vix_close:.2f}."

    joined_drivers = ", ".join(drivers) if drivers else "insufficient inputs"
    return f"{country_code} is currently {level} risk ({score:.1f}/100), driven by {joined_drivers}.{context}"


def country_weights(country_code: str) -> dict[str, float]:
    if country_code == "US":
        return {"volatility": 0.625, "beta": 0.375, "fx": 0.0}
    return {"volatility": 0.5, "beta": 0.3, "fx": 0.2}


def extract_sorted_daily_series(raw_series: dict[str, Any], adjusted: bool = True) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for day, values in sorted(raw_series.items()):
        adjusted_close = values.get("5. adjusted close") if adjusted else values.get("4. close")
        output.append(
            {
                "trade_date": date.fromisoformat(day),
                "open": float(values["1. open"]),
                "high": float(values["2. high"]),
                "low": float(values["3. low"]),
                "close": float(values["4. close"]),
                "adjusted_close": float(adjusted_close or values["4. close"]),
                "volume": int(float(values.get("6. volume", values.get("5. volume", 0)) or 0)),
                "raw_payload": values,
            }
        )
    return output


def extract_sorted_fx_series(raw_series: dict[str, Any]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for day, values in sorted(raw_series.items()):
        output.append(
            {
                "trade_date": date.fromisoformat(day),
                "open": float(values["1. open"]),
                "high": float(values["2. high"]),
                "low": float(values["3. low"]),
                "close": float(values["4. close"]),
                "raw_payload": values,
            }
        )
    return output


def compute_log_returns(points: list[tuple[date, float]]) -> dict[date, float]:
    returns: dict[date, float] = {}
    for previous, current in zip(points, points[1:], strict=False):
        previous_date, previous_value = previous
        current_date, current_value = current
        if previous_value <= 0 or current_value <= 0:
            continue
        returns[current_date] = math.log(current_value / previous_value)
    return returns


def align_returns(series_a: dict[date, float], series_b: dict[date, float]) -> tuple[list[date], list[float], list[float]]:
    common_dates = sorted(set(series_a).intersection(series_b))
    aligned_a = [series_a[trade_date] for trade_date in common_dates]
    aligned_b = [series_b[trade_date] for trade_date in common_dates]
    return common_dates, aligned_a, aligned_b


async def fetch_alpha_vantage_daily(
    client: httpx.AsyncClient,
    *,
    symbol: str,
    adjusted: bool = False,
) -> list[dict[str, Any]]:
    params = {
        "function": "TIME_SERIES_DAILY_ADJUSTED" if adjusted else "TIME_SERIES_DAILY",
        "symbol": symbol,
        "outputsize": alpha_vantage_outputsize(),
        "apikey": alpha_vantage_api_key(),
    }
    for attempt in range(3):
        response = await client.get(ALPHA_VANTAGE_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        raw_series = payload.get("Time Series (Daily)")
        if isinstance(raw_series, dict):
            return extract_sorted_daily_series(raw_series, adjusted=adjusted)
        if adjusted and isinstance(payload, dict) and "premium" in str(payload).lower():
            return await fetch_alpha_vantage_daily(client, symbol=symbol, adjusted=False)
        if is_alpha_vantage_rate_limited(payload) and attempt < 2:
            await asyncio.sleep(1.25 * (attempt + 1))
            continue
        raise ValueError(f"Alpha Vantage did not return daily series for {symbol}: {payload}")
    raise ValueError(f"Alpha Vantage did not return daily series for {symbol}")


async def fetch_alpha_vantage_fx(
    client: httpx.AsyncClient,
    *,
    from_symbol: str,
    to_symbol: str,
) -> list[dict[str, Any]]:
    params = {
        "function": "FX_DAILY",
        "from_symbol": from_symbol,
        "to_symbol": to_symbol,
        "outputsize": alpha_vantage_outputsize(),
        "apikey": alpha_vantage_api_key(),
    }
    for attempt in range(3):
        response = await client.get(ALPHA_VANTAGE_URL, params=params)
        response.raise_for_status()
        payload = response.json()
        raw_series = payload.get("Time Series FX (Daily)")
        if isinstance(raw_series, dict):
            return extract_sorted_fx_series(raw_series)
        if is_alpha_vantage_rate_limited(payload) and attempt < 2:
            await asyncio.sleep(1.25 * (attempt + 1))
            continue
        raise ValueError(f"Alpha Vantage did not return FX series for {from_symbol}/{to_symbol}: {payload}")
    raise ValueError(f"Alpha Vantage did not return FX series for {from_symbol}/{to_symbol}")


async def fetch_fred_latest_vix(client: httpx.AsyncClient) -> float | None:
    if not fred_api_key():
        return None

    response = await client.get(
        FRED_SERIES_URL,
        params={
            "series_id": VIX_SERIES_ID,
            "api_key": fred_api_key(),
            "file_type": "json",
            "sort_order": "desc",
            "limit": 10,
        },
    )
    response.raise_for_status()
    payload = response.json()
    observations = payload.get("observations", [])
    for observation in observations:
        value = observation.get("value")
        if value and value != ".":
            return float(value)
    return None


def upsert_reference_data(conn: Any) -> None:
    country_rows = [
        (
            config.iso_code,
            config.country_name,
            config.region_group,
            config.currency_code,
        )
        for config in COUNTRY_CONFIGS.values()
    ]
    mapping_rows = [
        (
            config.iso_code,
            config.market_symbol,
            config.market_name,
            config.benchmark_symbol,
            config.benchmark_name,
            config.fx_pair_code,
            config.fx_from_symbol,
            config.fx_to_symbol,
        )
        for config in COUNTRY_CONFIGS.values()
    ]

    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.countries (
              iso_code,
              country_name,
              region_group,
              currency_code
            )
            values (%s, %s, %s, %s)
            on conflict (iso_code) do update set
              country_name = excluded.country_name,
              region_group = excluded.region_group,
              currency_code = excluded.currency_code
            """,
            country_rows,
        )
        cur.executemany(
            """
            insert into public.country_market_mapping (
              country_code,
              market_symbol,
              market_name,
              benchmark_symbol,
              benchmark_name,
              fx_pair_code,
              fx_from_symbol,
              fx_to_symbol
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (country_code, market_symbol) do update set
              market_name = excluded.market_name,
              benchmark_symbol = excluded.benchmark_symbol,
              benchmark_name = excluded.benchmark_name,
              fx_pair_code = excluded.fx_pair_code,
              fx_from_symbol = excluded.fx_from_symbol,
              fx_to_symbol = excluded.fx_to_symbol
            """,
            mapping_rows,
        )


def upsert_price_series(conn: Any, symbol: str, rows: list[dict[str, Any]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.raw_price_data (
              symbol,
              trade_date,
              open_price,
              high_price,
              low_price,
              close_price,
              adjusted_close,
              volume,
              provider,
              raw_payload
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, 'alpha_vantage', %s)
            on conflict (symbol, trade_date) do update set
              open_price = excluded.open_price,
              high_price = excluded.high_price,
              low_price = excluded.low_price,
              close_price = excluded.close_price,
              adjusted_close = excluded.adjusted_close,
              volume = excluded.volume,
              raw_payload = excluded.raw_payload,
              fetched_at = timezone('utc', now())
            """,
            [
                (
                    symbol,
                    row["trade_date"],
                    row["open"],
                    row["high"],
                    row["low"],
                    row["close"],
                    row["adjusted_close"],
                    row["volume"],
                    Jsonb(row["raw_payload"]),
                )
                for row in rows
            ],
        )


def upsert_fx_series(conn: Any, pair_code: str, from_symbol: str, to_symbol: str, rows: list[dict[str, Any]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.raw_fx_data (
              pair_code,
              from_symbol,
              to_symbol,
              trade_date,
              open_rate,
              high_rate,
              low_rate,
              close_rate,
              provider,
              raw_payload
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, 'alpha_vantage', %s)
            on conflict (pair_code, trade_date) do update set
              open_rate = excluded.open_rate,
              high_rate = excluded.high_rate,
              low_rate = excluded.low_rate,
              close_rate = excluded.close_rate,
              raw_payload = excluded.raw_payload,
              fetched_at = timezone('utc', now())
            """,
            [
                (
                    pair_code,
                    from_symbol,
                    to_symbol,
                    row["trade_date"],
                    row["open"],
                    row["high"],
                    row["low"],
                    row["close"],
                    Jsonb(row["raw_payload"]),
                )
                for row in rows
            ],
        )


def latest_trade_date(series: list[dict[str, Any]]) -> date | None:
    return series[-1]["trade_date"] if series else None


def build_market_risk_record(
    *,
    config: CountryMarketConfig,
    market_series: list[dict[str, Any]],
    benchmark_series: list[dict[str, Any]],
    fx_series: list[dict[str, Any]] | None,
    vix_close: float | None,
) -> dict[str, Any]:
    market_points = [(row["trade_date"], row["adjusted_close"]) for row in market_series]
    benchmark_points = [(row["trade_date"], row["adjusted_close"]) for row in benchmark_series]
    market_returns = compute_log_returns(market_points)
    benchmark_returns = compute_log_returns(benchmark_points)
    _, aligned_market_returns, aligned_benchmark_returns = align_returns(market_returns, benchmark_returns)

    realized_vol_30d = annualized_volatility(aligned_market_returns, 30)
    beta_60d = compute_beta(aligned_market_returns, aligned_benchmark_returns, window=60)
    market_return_60d = compute_cumulative_return(aligned_market_returns, 60)
    benchmark_return_60d = compute_cumulative_return(aligned_benchmark_returns, 60)

    fx_vol_30d: float | None = None
    if fx_series:
        fx_points = [(row["trade_date"], row["close"]) for row in fx_series]
        fx_returns = compute_log_returns(fx_points)
        fx_return_values = [fx_returns[trade_date] for trade_date in sorted(fx_returns)]
        fx_vol_30d = annualized_volatility(fx_return_values, 30)

    volatility_component = normalized_score(realized_vol_30d, 0.0, 0.60)
    beta_component = normalized_score(beta_60d, 0.0, 2.0)
    fx_component = normalized_score(fx_vol_30d, 0.0, 0.25) if config.iso_code != "US" else 0.0
    weights = country_weights(config.iso_code)

    market_risk_score = round(
        volatility_component * weights["volatility"]
        + beta_component * weights["beta"]
        + fx_component * weights["fx"],
        2,
    )
    level = risk_level(market_risk_score)
    as_of_date = latest_trade_date(market_series) or datetime.now(UTC).date()
    explanation = build_explanation(
        score=market_risk_score,
        level=level,
        realized_vol_30d=realized_vol_30d,
        beta_60d=beta_60d,
        fx_vol_30d=fx_vol_30d,
        vix_close=vix_close,
        country_code=config.iso_code,
    )

    return {
        "country": config.country_name,
        "iso_code": config.iso_code,
        "as_of_date": as_of_date,
        "market_risk_score": market_risk_score,
        "risk_level": level,
        "component_scores": {
            "volatility": volatility_component,
            "beta": beta_component,
            "fx_risk": fx_component,
        },
        "raw_metrics": {
            "realized_vol_30d": realized_vol_30d,
            "beta_60d": beta_60d,
            "fx_vol_30d": fx_vol_30d,
            "market_return_60d": market_return_60d,
            "benchmark_return_60d": benchmark_return_60d,
            "vix_close": vix_close,
        },
        "weights": weights,
        "data_sources": [
            "Alpha Vantage TIME_SERIES_DAILY",
            "Alpha Vantage FX_DAILY" if config.fx_pair_code else "No FX series for US",
            "FRED VIXCLS" if vix_close is not None else "FRED VIXCLS not configured",
        ],
        "last_updated_at": datetime.now(UTC).isoformat(),
        "short_explanation": explanation,
    }


def upsert_market_risk_scores(conn: Any, scores: list[dict[str, Any]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.market_risk_scores (
              country_code,
              as_of_date,
              market_risk_score,
              risk_level,
              volatility_component_score,
              beta_component_score,
              fx_component_score,
              realized_vol_30d,
              beta_60d,
              fx_vol_30d,
              benchmark_return_60d,
              market_return_60d,
              vix_close,
              weights,
              raw_metrics,
              data_sources,
              explanation
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (country_code, as_of_date) do update set
              market_risk_score = excluded.market_risk_score,
              risk_level = excluded.risk_level,
              volatility_component_score = excluded.volatility_component_score,
              beta_component_score = excluded.beta_component_score,
              fx_component_score = excluded.fx_component_score,
              realized_vol_30d = excluded.realized_vol_30d,
              beta_60d = excluded.beta_60d,
              fx_vol_30d = excluded.fx_vol_30d,
              benchmark_return_60d = excluded.benchmark_return_60d,
              market_return_60d = excluded.market_return_60d,
              vix_close = excluded.vix_close,
              weights = excluded.weights,
              raw_metrics = excluded.raw_metrics,
              data_sources = excluded.data_sources,
              explanation = excluded.explanation,
              updated_at = timezone('utc', now())
            """,
            [
                (
                    score["iso_code"],
                    score["as_of_date"],
                    score["market_risk_score"],
                    score["risk_level"],
                    score["component_scores"]["volatility"],
                    score["component_scores"]["beta"],
                    score["component_scores"]["fx_risk"],
                    score["raw_metrics"]["realized_vol_30d"],
                    score["raw_metrics"]["beta_60d"],
                    score["raw_metrics"]["fx_vol_30d"],
                    score["raw_metrics"]["benchmark_return_60d"],
                    score["raw_metrics"]["market_return_60d"],
                    score["raw_metrics"]["vix_close"],
                    Jsonb(score["weights"]),
                    Jsonb(score["raw_metrics"]),
                    Jsonb(score["data_sources"]),
                    score["short_explanation"],
                )
                for score in scores
            ],
        )


async def refresh_market_risk_pipeline(conn: Any) -> dict[str, Any]:
    if not market_risk_ready():
        raise RuntimeError("ALPHA_VANTAGE_API_KEY is not configured.")

    upsert_reference_data(conn)

    async with httpx.AsyncClient(timeout=30.0) as client:
        benchmark_series = await fetch_alpha_vantage_daily(client, symbol=GLOBAL_BENCHMARK_SYMBOL)
        await asyncio.sleep(1.1)

        market_series_by_symbol: dict[str, list[dict[str, Any]]] = {
            GLOBAL_BENCHMARK_SYMBOL: benchmark_series
        }
        fx_series_by_pair: dict[str, list[dict[str, Any]]] = {}

        for config in COUNTRY_CONFIGS.values():
            if config.market_symbol not in market_series_by_symbol:
                market_series_by_symbol[config.market_symbol] = await fetch_alpha_vantage_daily(
                    client,
                    symbol=config.market_symbol,
                )
                await asyncio.sleep(1.1)
            if (
                config.fx_pair_code
                and config.fx_from_symbol
                and config.fx_to_symbol
                and config.fx_pair_code not in fx_series_by_pair
            ):
                fx_series_by_pair[config.fx_pair_code] = await fetch_alpha_vantage_fx(
                    client,
                    from_symbol=config.fx_from_symbol,
                    to_symbol=config.fx_to_symbol,
                )
                await asyncio.sleep(1.1)

        vix_close = await fetch_fred_latest_vix(client)

    for symbol, series in market_series_by_symbol.items():
        upsert_price_series(conn, symbol, series)

    for config in COUNTRY_CONFIGS.values():
        if config.fx_pair_code and config.fx_pair_code in fx_series_by_pair:
            upsert_fx_series(
                conn,
                config.fx_pair_code,
                config.fx_from_symbol or "",
                config.fx_to_symbol or "",
                fx_series_by_pair[config.fx_pair_code],
            )

    scores = [
        build_market_risk_record(
            config=config,
            market_series=market_series_by_symbol[config.market_symbol],
            benchmark_series=market_series_by_symbol[config.benchmark_symbol],
            fx_series=fx_series_by_pair.get(config.fx_pair_code) if config.fx_pair_code else None,
            vix_close=vix_close,
        )
        for config in (COUNTRY_CONFIGS[code] for code in RISK_COUNTRY_ORDER)
    ]
    upsert_market_risk_scores(conn, scores)

    return {
        "status": "ok",
        "countries_processed": len(scores),
        "symbols_loaded": sorted(market_series_by_symbol.keys()),
        "fx_pairs_loaded": sorted(fx_series_by_pair.keys()),
        "latest_as_of_date": max(score["as_of_date"] for score in scores).isoformat(),
    }


def load_market_risk_scores(conn: Any, country_code: str | None = None) -> list[dict[str, Any]]:
    order_case = " ".join(
        [f"when '{code}' then {index}" for index, code in enumerate(RISK_COUNTRY_ORDER, start=1)]
    )
    query = """
        with latest_dates as (
          select country_code, max(as_of_date) as max_as_of_date
          from public.market_risk_scores
          group by country_code
        )
        select
          s.country_code,
          c.country_name,
          s.as_of_date,
          s.market_risk_score,
          s.risk_level,
          s.volatility_component_score,
          s.beta_component_score,
          s.fx_component_score,
          s.realized_vol_30d,
          s.beta_60d,
          s.fx_vol_30d,
          s.market_return_60d,
          s.benchmark_return_60d,
          s.vix_close,
          s.weights,
          s.raw_metrics,
          s.data_sources,
          s.explanation,
          s.updated_at
        from public.market_risk_scores s
        join latest_dates latest
          on latest.country_code = s.country_code
         and latest.max_as_of_date = s.as_of_date
        join public.countries c
          on c.iso_code = s.country_code
    """
    params: tuple[Any, ...] = ()
    if country_code:
        query += " where s.country_code = %s"
        params = (country_code,)
    query += f" order by case s.country_code {order_case} else 999 end"

    with conn.cursor(row_factory=dict_row) as cur:
        rows = cur.execute(query, params).fetchall()

    output: list[dict[str, Any]] = []
    for row in rows:
        output.append(
            {
                "country": row["country_name"],
                "iso_code": row["country_code"],
                "market_risk_score": float(row["market_risk_score"]),
                "risk_level": row["risk_level"],
                "component_scores": {
                    "volatility": float(row["volatility_component_score"]),
                    "beta": float(row["beta_component_score"]),
                    "fx_risk": float(row["fx_component_score"]),
                },
                "raw_metrics": {
                    "realized_vol_30d": float(row["realized_vol_30d"]) if row["realized_vol_30d"] is not None else None,
                    "beta_60d": float(row["beta_60d"]) if row["beta_60d"] is not None else None,
                    "fx_vol_30d": float(row["fx_vol_30d"]) if row["fx_vol_30d"] is not None else None,
                    "market_return_60d": float(row["market_return_60d"]) if row["market_return_60d"] is not None else None,
                    "benchmark_return_60d": float(row["benchmark_return_60d"]) if row["benchmark_return_60d"] is not None else None,
                    "vix_close": float(row["vix_close"]) if row["vix_close"] is not None else None,
                },
                "data_source_used": row["data_sources"],
                "weights": row["weights"],
                "as_of_date": row["as_of_date"].isoformat(),
                "last_updated_timestamp": row["updated_at"].isoformat(),
                "short_explanation": row["explanation"],
            }
        )
    return output
