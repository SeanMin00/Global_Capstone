from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import yfinance as yf
from fastapi import HTTPException
from yfinance.exceptions import YFRateLimitError

VALID_PERIODS = {"1d", "5d", "1mo", "6mo", "1y", "max"}
VALID_INTERVALS = {"5m", "30m", "1d", "1wk"}
CHART_CACHE_TTL_SECONDS = int(os.getenv("STOCK_CHART_CACHE_TTL_SECONDS", str(60 * 60 * 6)))
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
STOOQ_DAILY_URL = "https://stooq.com/q/d/l/"
YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GlobalCapstoneMVP/1.0)",
    "Accept": "application/json",
}
_chart_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def normalize_ticker(ticker: str) -> str:
    normalized = ticker.strip().upper()
    if not normalized:
        raise HTTPException(status_code=400, detail="Ticker is required.")
    return normalized


def validate_chart_request(period: str, interval: str) -> tuple[str, str]:
    normalized_period = period.strip().lower()
    normalized_interval = interval.strip().lower()

    if normalized_period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported period: {period}. Use one of {sorted(VALID_PERIODS)}.",
        )

    if normalized_interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported interval: {interval}. Use one of {sorted(VALID_INTERVALS)}.",
        )

    return normalized_period, normalized_interval


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _serialize_timestamp(value: Any) -> str:
    if value is None:
        return ""

    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()

    if hasattr(value, "tzinfo") and value.tzinfo is not None and hasattr(value, "replace"):
        value = value.replace(tzinfo=None)

    if hasattr(value, "isoformat"):
        return value.isoformat(timespec="minutes")

    return str(value)


def _serialize_unix_timestamp(value: Any) -> str:
    try:
        return datetime.fromtimestamp(int(value), timezone.utc).replace(tzinfo=None).isoformat(timespec="minutes")
    except (TypeError, ValueError, OSError, OverflowError):
        return ""


def _safe_info(stock: yf.Ticker) -> dict[str, Any]:
    try:
        info = stock.info
        return info if isinstance(info, dict) else {}
    except Exception:
        return {}


def _safe_fast_info(stock: yf.Ticker) -> dict[str, Any]:
    try:
        fast_info = stock.fast_info
        return dict(fast_info.items()) if fast_info else {}
    except Exception:
        return {}


def _history_or_404(stock: yf.Ticker, *, period: str, interval: str):
    try:
        history = stock.history(period=period, interval=interval, auto_adjust=False, actions=False)
    except YFRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail="Yahoo Finance rate limit reached. Try again in a little while.",
        ) from exc

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No market data found for ticker '{stock.ticker}'.",
        )
    return history


def _yahoo_chart_points(symbol: str, *, period: str, interval: str) -> list[dict[str, Any]]:
    """Fallback to Yahoo's chart JSON endpoint when yfinance returns an empty frame.

    Render/free hosting environments can occasionally receive empty yfinance
    frames even for valid tickers. This keeps the MVP on Yahoo Finance data while
    avoiding a total portfolio-chart failure.
    """
    try:
        response = httpx.get(
            YAHOO_CHART_URL.format(symbol=symbol),
            params={
                "range": period,
                "interval": interval,
                "includePrePost": "false",
                "events": "div,splits",
            },
            headers=YAHOO_HEADERS,
            timeout=12.0,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    result = ((payload.get("chart") or {}).get("result") or [None])[0]
    if not isinstance(result, dict):
        return []

    timestamps = result.get("timestamp") or []
    quote = (((result.get("indicators") or {}).get("quote") or [None])[0]) or {}
    if not timestamps or not isinstance(quote, dict):
        return []

    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    points: list[dict[str, Any]] = []
    for index, timestamp in enumerate(timestamps):
        close = _safe_float(closes[index] if index < len(closes) else None)
        if close is None:
            continue

        points.append(
            {
                "date": _serialize_unix_timestamp(timestamp),
                "open": _safe_float(opens[index] if index < len(opens) else None),
                "high": _safe_float(highs[index] if index < len(highs) else None),
                "low": _safe_float(lows[index] if index < len(lows) else None),
                "close": close,
                "volume": _safe_int(volumes[index] if index < len(volumes) else None),
            }
        )

    return points


def _cache_key(*parts: str) -> str:
    return "::".join(parts)


def _get_cached_payload(key: str) -> dict[str, Any] | None:
    cached = _chart_cache.get(key)
    if not cached:
        return None

    expires_at, payload = cached
    if expires_at <= time.time():
        _chart_cache.pop(key, None)
        return None
    return payload


def _set_cached_payload(key: str, payload: dict[str, Any]) -> dict[str, Any]:
    _chart_cache[key] = (time.time() + CHART_CACHE_TTL_SECONDS, payload)
    return payload


def _get_stale_cached_payload(key: str) -> dict[str, Any] | None:
    cached = _chart_cache.get(key)
    return cached[1] if cached else None


def _stooq_symbol(symbol: str) -> str:
    normalized = symbol.upper()
    overrides = {
        "005930.KS": "005930.KR",
    }
    if normalized in overrides:
        return overrides[normalized]
    if "." in normalized:
        return normalized.replace(".", ".").lower()
    return f"{normalized.lower()}.us"


def _period_cutoff(period: str) -> datetime | None:
    now = datetime.now(timezone.utc)
    if period == "1d":
        return now - timedelta(days=7)
    if period == "5d":
        return now - timedelta(days=14)
    if period == "1mo":
        return now - timedelta(days=45)
    if period == "6mo":
        return now - timedelta(days=210)
    if period == "1y":
        return now - timedelta(days=380)
    return None


def _weekly_points(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    weekly: dict[tuple[int, int], dict[str, Any]] = {}
    for point in points:
        try:
            parsed = datetime.fromisoformat(point["date"])
        except (TypeError, ValueError):
            continue
        iso_year, iso_week, _ = parsed.isocalendar()
        weekly[(iso_year, iso_week)] = point
    return list(weekly.values())


def _stooq_chart_points(symbol: str, *, period: str, interval: str) -> list[dict[str, Any]]:
    if interval not in {"1d", "1wk"}:
        return []

    try:
        response = httpx.get(
            STOOQ_DAILY_URL,
            params={"s": _stooq_symbol(symbol), "i": "d"},
            headers=YAHOO_HEADERS,
            timeout=12.0,
        )
        response.raise_for_status()
    except Exception:
        return []

    lines = [line.strip() for line in response.text.splitlines() if line.strip()]
    if len(lines) <= 1 or "No data" in response.text:
        return []

    cutoff = _period_cutoff(period)
    points: list[dict[str, Any]] = []
    for row in lines[1:]:
        columns = row.split(",")
        if len(columns) < 6:
            continue

        date_value, open_value, high_value, low_value, close_value, volume_value = columns[:6]
        try:
            parsed_date = datetime.fromisoformat(date_value).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if cutoff and parsed_date < cutoff:
            continue

        close = _safe_float(close_value)
        if close is None:
            continue

        points.append(
            {
                "date": date_value,
                "open": _safe_float(open_value),
                "high": _safe_float(high_value),
                "low": _safe_float(low_value),
                "close": close,
                "volume": _safe_int(volume_value),
            }
        )

    if interval == "1wk":
        return _weekly_points(points)
    return points


def _fallback_chart_points(symbol: str, *, period: str, interval: str) -> list[dict[str, Any]]:
    return _yahoo_chart_points(symbol, period=period, interval=interval) or _stooq_chart_points(
        symbol,
        period=period,
        interval=interval,
    )


def get_quote_payload(ticker: str) -> dict[str, Any]:
    symbol = normalize_ticker(ticker)
    stock = yf.Ticker(symbol)
    fallback_points: list[dict[str, Any]] = []
    try:
        history = _history_or_404(stock, period="5d", interval="1d")
    except HTTPException as exc:
        if exc.status_code not in {404, 429}:
            raise
        history = None
        fallback_points = _fallback_chart_points(symbol, period="5d", interval="1d")

    info = _safe_info(stock)
    fast_info = _safe_fast_info(stock)

    if history is not None:
        close_series = history["Close"].dropna()
        latest_close = _safe_float(close_series.iloc[-1]) if not close_series.empty else None
        previous_history_close = _safe_float(close_series.iloc[-2]) if len(close_series) > 1 else latest_close
        currency_from_history = history.attrs.get("currency")
    else:
        close_values = [point["close"] for point in fallback_points if point.get("close") is not None]
        latest_close = _safe_float(close_values[-1]) if close_values else None
        previous_history_close = _safe_float(close_values[-2]) if len(close_values) > 1 else latest_close
        currency_from_history = "USD" if symbol.isalpha() else None

    current_price = _safe_float(fast_info.get("lastPrice")) or latest_close
    previous_close = _safe_float(fast_info.get("previousClose")) or previous_history_close or current_price

    if current_price is None or previous_close is None:
        raise HTTPException(
            status_code=404,
            detail=f"Quote fields are unavailable for ticker '{symbol}'.",
        )

    day_change = round(current_price - previous_close, 4)
    day_change_pct = round((day_change / previous_close) * 100, 4) if previous_close else 0.0

    company_name = (
        info.get("longName")
        or info.get("shortName")
        or info.get("displayName")
        or symbol
    )

    currency = (
        info.get("currency")
        or fast_info.get("currency")
        or currency_from_history
        or None
    )
    exchange = (
        info.get("fullExchangeName")
        or info.get("exchange")
        or fast_info.get("exchange")
        or None
    )

    return {
        "ticker": symbol,
        "company_name": company_name,
        "current_price": round(current_price, 4),
        "previous_close": round(previous_close, 4),
        "day_change": day_change,
        "day_change_pct": day_change_pct,
        "currency": currency,
        "exchange": exchange,
    }


def get_chart_payload(ticker: str, *, period: str, interval: str) -> dict[str, Any]:
    symbol = normalize_ticker(ticker)
    validated_period, validated_interval = validate_chart_request(period, interval)
    cache_key = _cache_key("single", symbol, validated_period, validated_interval)
    cached = _get_cached_payload(cache_key)
    if cached:
        return cached

    data_points: list[dict[str, Any]] = []

    stock = yf.Ticker(symbol)
    try:
        history = _history_or_404(stock, period=validated_period, interval=validated_interval).reset_index()
        timestamp_column = "Datetime" if "Datetime" in history.columns else "Date"

        for row in history.to_dict(orient="records"):
            timestamp = row.get(timestamp_column)
            close = _safe_float(row.get("Close"))
            if close is None:
                continue
            data_points.append(
                {
                    "date": _serialize_timestamp(timestamp),
                    "open": _safe_float(row.get("Open")),
                    "high": _safe_float(row.get("High")),
                    "low": _safe_float(row.get("Low")),
                    "close": close,
                    "volume": _safe_int(row.get("Volume")),
                }
            )
    except HTTPException as exc:
        if exc.status_code not in {404, 429}:
            raise

    if not data_points:
        data_points = _fallback_chart_points(symbol, period=validated_period, interval=validated_interval)

    if not data_points:
        stale = _get_stale_cached_payload(cache_key)
        if stale:
            return stale
        raise HTTPException(status_code=404, detail=f"No market data found for ticker '{symbol}'.")

    return _set_cached_payload(cache_key, {
        "ticker": symbol,
        "period": validated_period,
        "interval": validated_interval,
        "data": data_points,
    })


def get_batch_chart_payload(tickers: list[str], *, period: str, interval: str) -> dict[str, Any]:
    normalized_tickers = list(dict.fromkeys(normalize_ticker(ticker) for ticker in tickers if ticker.strip()))
    if not normalized_tickers:
        raise HTTPException(status_code=400, detail="At least one ticker is required.")

    validated_period, validated_interval = validate_chart_request(period, interval)
    cache_key = _cache_key("batch", ",".join(sorted(normalized_tickers)), validated_period, validated_interval)
    cached = _get_cached_payload(cache_key)
    if cached:
        return cached

    try:
        history = yf.download(
            tickers=normalized_tickers,
            period=validated_period,
            interval=validated_interval,
            auto_adjust=False,
            actions=False,
            group_by="ticker",
            threads=False,
            progress=False,
        )
    except YFRateLimitError:
        history = None
    except Exception:
        history = None

    if history is not None and history.empty:
        history = None

    batch_data: dict[str, list[dict[str, Any]]] = {}
    unavailable: list[str] = []

    if history is not None and len(normalized_tickers) == 1:
        symbol = normalized_tickers[0]
        history_frame = history.reset_index()
        timestamp_column = "Datetime" if "Datetime" in history_frame.columns else "Date"
        points = [
            {
                "date": _serialize_timestamp(row.get(timestamp_column)),
                "close": _safe_float(row.get("Close")),
            }
            for row in history_frame.to_dict(orient="records")
            if _safe_float(row.get("Close")) is not None
        ]
        if points:
            batch_data[symbol] = points
        else:
            unavailable.append(symbol)
    elif history is not None:
        for symbol in normalized_tickers:
            try:
                symbol_history = history[symbol].reset_index()
            except Exception:
                unavailable.append(symbol)
                continue

            timestamp_column = "Datetime" if "Datetime" in symbol_history.columns else "Date"
            points = [
                {
                    "date": _serialize_timestamp(row.get(timestamp_column)),
                    "close": _safe_float(row.get("Close")),
                }
                for row in symbol_history.to_dict(orient="records")
                if _safe_float(row.get("Close")) is not None
            ]

            if points:
                batch_data[symbol] = points
            else:
                unavailable.append(symbol)

    missing_after_batch = [symbol for symbol in normalized_tickers if symbol not in batch_data]
    if missing_after_batch:
        for index, symbol in enumerate(missing_after_batch):
            try:
                single_payload = get_chart_payload(symbol, period=validated_period, interval=validated_interval)
                points = [
                    {
                        "date": point["date"],
                        "close": point["close"],
                    }
                    for point in single_payload["data"]
                    if point.get("close") is not None
                ]
                if points:
                    batch_data[symbol] = points
                    unavailable = [ticker for ticker in unavailable if ticker != symbol]
                else:
                    unavailable.append(symbol)
            except HTTPException:
                unavailable.append(symbol)

            if index < len(missing_after_batch) - 1:
                time.sleep(0.35)

    if not batch_data:
        stale = _get_stale_cached_payload(cache_key)
        if stale:
            return stale
        raise HTTPException(status_code=404, detail="No market data was returned for the requested tickers.")

    unavailable = list(dict.fromkeys(unavailable))
    payload = {
        "tickers": normalized_tickers,
        "period": validated_period,
        "interval": validated_interval,
        "data": batch_data,
        "unavailable": unavailable,
    }
    return _set_cached_payload(cache_key, payload)
