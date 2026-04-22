"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  filterTourStepsByScope,
  TOUR_COMPLETION_KEY,
  TOUR_PENDING_KEY,
  type TourScope,
  type TourStep,
} from "./tourSteps";
import { TourContext, type TourStartOptions } from "./useTour";

type Props = {
  children: ReactNode;
  steps: TourStep[];
  onStepChange?: (step: TourStep) => void;
};

export default function TourProvider({ children, steps, onStepChange }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeScope, setActiveScope] = useState<TourScope>("full");

  useEffect(() => {
    const pendingTour = window.localStorage.getItem(TOUR_PENDING_KEY);

    if (!pendingTour) {
      return;
    }

    window.localStorage.removeItem(TOUR_PENDING_KEY);

    try {
      const parsed = JSON.parse(pendingTour) as { force?: boolean; scope?: TourScope };
      const nextScope = parsed.scope ?? "full";
      const completed = window.localStorage.getItem(TOUR_COMPLETION_KEY) === "true";

      if (nextScope === "full" && !parsed.force && completed) {
        return;
      }

      if (parsed.force) {
        window.localStorage.removeItem(TOUR_COMPLETION_KEY);
      }

      setActiveScope(nextScope);
      setCurrentStepIndex(0);
      setIsActive(true);
    } catch {
      setActiveScope("full");
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [steps]);

  const activeSteps = useMemo(() => filterTourStepsByScope(steps, activeScope), [activeScope, steps]);

  useEffect(() => {
    if (!isActive) return;

    const currentStep = activeSteps[currentStepIndex];
    if (currentStep) {
      onStepChange?.(currentStep);
    }
  }, [activeSteps, currentStepIndex, isActive, onStepChange]);

  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeScope === "full") {
          window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
        }
        setIsActive(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeScope, isActive]);

  const value = useMemo(
    () => ({
      steps: activeSteps,
      isActive,
      currentStepIndex,
      currentStep: activeSteps[currentStepIndex] ?? null,
      activeScope,
      start(options: TourStartOptions = {}) {
        const force = options.force ?? false;
        const scope = options.scope ?? "full";

        if (scope === "full" && force) {
          window.localStorage.removeItem(TOUR_COMPLETION_KEY);
        }
        setActiveScope(scope);
        setCurrentStepIndex(0);
        setIsActive(true);
      },
      next() {
        setCurrentStepIndex((current) => {
          if (current >= activeSteps.length - 1) {
            if (activeScope === "full") {
              window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
            }
            setIsActive(false);
            return current;
          }
          return current + 1;
        });
      },
      skip() {
        if (activeScope === "full") {
          window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
        }
        setIsActive(false);
      },
    }),
    [activeScope, activeSteps, currentStepIndex, isActive],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
