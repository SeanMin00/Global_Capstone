"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { TOUR_COMPLETION_KEY, type TourStep } from "./tourSteps";
import { TourContext } from "./useTour";

type Props = {
  children: ReactNode;
  steps: TourStep[];
  onStepChange?: (step: TourStep) => void;
};

export default function TourProvider({ children, steps, onStepChange }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const completed = window.localStorage.getItem(TOUR_COMPLETION_KEY) === "true";

    if (!completed && steps.length > 0) {
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [steps]);

  useEffect(() => {
    if (!isActive) return;

    const currentStep = steps[currentStepIndex];
    if (currentStep) {
      onStepChange?.(currentStep);
    }
  }, [currentStepIndex, isActive, onStepChange, steps]);

  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
        setIsActive(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive]);

  const value = useMemo(
    () => ({
      steps,
      isActive,
      currentStepIndex,
      currentStep: steps[currentStepIndex] ?? null,
      start(force = false) {
        if (force) {
          window.localStorage.removeItem(TOUR_COMPLETION_KEY);
        }
        setCurrentStepIndex(0);
        setIsActive(true);
      },
      next() {
        setCurrentStepIndex((current) => {
          if (current >= steps.length - 1) {
            window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
            setIsActive(false);
            return current;
          }
          return current + 1;
        });
      },
      skip() {
        window.localStorage.setItem(TOUR_COMPLETION_KEY, "true");
        setIsActive(false);
      },
    }),
    [currentStepIndex, isActive, steps],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
