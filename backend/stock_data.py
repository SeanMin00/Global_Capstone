from __future__ import annotations

from typing import Any

import yfinance as yf
from fastapi import HTTPException
from yfinance.exceptions import YFRateLimitError

VALID_PERIODS = {"1d", "5d", "1mo", "6mo", "1y", "max"}
VALID_INTERVALS = {"5m", "30m", "1d", "1wk"}


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


def get_quote_payload(ticker: str) -> dict[str, Any]:
    symbol = normalize_ticker(ticker)
    stock = yf.Ticker(symbol)
    history = _history_or_404(stock, period="5d", interval="1d")
    info = _safe_info(stock)
    fast_info = _safe_fast_info(stock)

    close_series = history["Close"].dropna()
    latest_close = _safe_float(close_series.iloc[-1]) if not close_series.empty else None
    previous_history_close = _safe_float(close_series.iloc[-2]) if len(close_series) > 1 else latest_close

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
        or history.attrs.get("currency")
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
    stock = yf.Ticker(symbol)
    history = _history_or_404(stock, period=validated_period, interval=validated_interval).reset_index()

    timestamp_column = "Datetime" if "Datetime" in history.columns else "Date"
    data_points: list[dict[str, Any]] = []

    for row in history.to_dict(orient="records"):
        timestamp = row.get(timestamp_column)
        data_points.append(
            {
                "date": _serialize_timestamp(timestamp),
                "open": _safe_float(row.get("Open")),
                "high": _safe_float(row.get("High")),
                "low": _safe_float(row.get("Low")),
                "close": _safe_float(row.get("Close")),
                "volume": _safe_int(row.get("Volume")),
            }
        )

    return {
        "ticker": symbol,
        "period": validated_period,
        "interval": validated_interval,
        "data": data_points,
    }
