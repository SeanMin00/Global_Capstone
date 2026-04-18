"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTour } from "./useTour";

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TooltipPosition = {
  top: number;
  left: number;
};

const VIEWPORT_PADDING = 16;
const TOOLTIP_GAP = 18;
const FALLBACK_TOOLTIP_WIDTH = 320;
const FALLBACK_TOOLTIP_HEIGHT = 220;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildPlacementOrder(preferred: "top" | "bottom" | "left" | "right") {
  if (preferred === "top") return ["top", "bottom", "right", "left"] as const;
  if (preferred === "bottom") return ["bottom", "top", "right", "left"] as const;
  if (preferred === "left") return ["left", "right", "bottom", "top"] as const;
  return ["right", "left", "bottom", "top"] as const;
}

function computeTooltipPosition(
  rect: SpotlightRect | null,
  preferred: "top" | "bottom" | "left" | "right",
  viewport: { width: number; height: number },
  size: { width: number; height: number },
): TooltipPosition {
  if (!rect) {
    return {
      top: Math.max(32, viewport.height / 2 - size.height / 2),
      left: Math.max(32, viewport.width / 2 - size.width / 2),
    };
  }

  const placements = buildPlacementOrder(preferred);

  for (const placement of placements) {
    let top = rect.top;
    let left = rect.left;

    if (placement === "top") {
      top = rect.top - size.height - TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - size.width / 2;
    } else if (placement === "bottom") {
      top = rect.top + rect.height + TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - size.width / 2;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - size.height / 2;
      left = rect.left - size.width - TOOLTIP_GAP;
    } else {
      top = rect.top + rect.height / 2 - size.height / 2;
      left = rect.left + rect.width + TOOLTIP_GAP;
    }

    const fitsHorizontally =
      left >= VIEWPORT_PADDING && left + size.width <= viewport.width - VIEWPORT_PADDING;
    const fitsVertically =
      top >= VIEWPORT_PADDING && top + size.height <= viewport.height - VIEWPORT_PADDING;

    if (fitsHorizontally && fitsVertically) {
      return { top, left };
    }
  }

  return {
    top: clamp(rect.top + rect.height + TOOLTIP_GAP, VIEWPORT_PADDING, viewport.height - size.height - VIEWPORT_PADDING),
    left: clamp(rect.left + rect.width / 2 - size.width / 2, VIEWPORT_PADDING, viewport.width - size.width - VIEWPORT_PADDING),
  };
}

function isTargetComfortablyVisible(targetRect: DOMRect, viewport: { width: number; height: number }) {
  return (
    targetRect.top >= 80 &&
    targetRect.left >= VIEWPORT_PADDING &&
    targetRect.bottom <= viewport.height - 80 &&
    targetRect.right <= viewport.width - VIEWPORT_PADDING
  );
}

export default function TourOverlay() {
  const { currentStep, currentStepIndex, isActive, next, skip, steps } = useTour();
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const maskId = useId();

  useEffect(() => {
    if (!isActive || !currentStep) return;

    let pollId: number | null = null;
    let scrollTimeoutId: number | null = null;
    let shouldKeepPolling = true;
    let hasScrolledForStep = false;

    const syncTarget = () => {
      const target = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

      const nextViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setViewport(nextViewport);

      if (!target) {
        setSpotlightRect(null);
        return false;
      }

      const targetRect = target.getBoundingClientRect();

      if (!hasScrolledForStep && !isTargetComfortablyVisible(targetRect, nextViewport)) {
        hasScrolledForStep = true;
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

        if (scrollTimeoutId) {
          window.clearTimeout(scrollTimeoutId);
        }

        scrollTimeoutId = window.setTimeout(() => {
          syncTarget();
        }, 420);
      }

      const padding = currentStep.spotlightPadding ?? 12;
      setSpotlightRect({
        top: Math.max(0, targetRect.top - padding),
        left: Math.max(0, targetRect.left - padding),
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      });

      return true;
    };

    const beginPolling = () => {
      if (!shouldKeepPolling) return;
      const found = syncTarget();
      if (!found) {
        pollId = window.setTimeout(beginPolling, 140);
      }
    };

    beginPolling();

    const handleUpdate = () => {
      syncTarget();
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      shouldKeepPolling = false;
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      if (pollId) window.clearTimeout(pollId);
      if (scrollTimeoutId) window.clearTimeout(scrollTimeoutId);
    };
  }, [currentStep, isActive]);

  const tooltipPosition = useMemo(() => {
    const size = {
      width: tooltipRef.current?.offsetWidth ?? FALLBACK_TOOLTIP_WIDTH,
      height: tooltipRef.current?.offsetHeight ?? FALLBACK_TOOLTIP_HEIGHT,
    };

    return computeTooltipPosition(
      spotlightRect,
      currentStep?.position ?? "bottom",
      viewport,
      size,
    );
  }, [currentStep?.position, spotlightRect, viewport]);

  if (!isActive || !currentStep) return null;

  return (
    <div className="tour-overlay" onClick={skip}>
      <svg className="tour-overlay-mask" width={viewport.width} height={viewport.height} aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width={viewport.width} height={viewport.height} fill="white" />
            {spotlightRect ? (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          width={viewport.width}
          height={viewport.height}
          fill="rgba(0,0,0,0.72)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {spotlightRect ? (
        <div
          className="tour-spotlight-ring"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      ) : null}

      <div
        ref={tooltipRef}
        className="tour-tooltip-card"
        style={tooltipPosition}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tour-tooltip-content">
          <strong>{currentStep.title}</strong>
          <p>{currentStep.description}</p>
        </div>

        <div className="tour-progress-row">
          <span>{currentStepIndex + 1}/{steps.length}</span>
          <div className="tour-dots">
            {steps.map((step, index) => (
              <span
                key={`${step.targetSelector}-${index}`}
                className={`tour-dot ${index === currentStepIndex ? "active" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-skip-button" onClick={skip}>
            건너뛰기
          </button>
          <button type="button" className="tour-next-button" onClick={next}>
            {currentStepIndex === steps.length - 1 ? "시작하기" : "다음 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
