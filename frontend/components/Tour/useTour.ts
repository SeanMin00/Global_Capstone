"use client";

import { createContext, useContext } from "react";
import type { TourStep } from "./tourSteps";

export type TourContextValue = {
  steps: TourStep[];
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  start: (force?: boolean) => void;
  next: () => void;
  skip: () => void;
};

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const context = useContext(TourContext);

  if (!context) {
    throw new Error("useTour must be used within a TourProvider.");
  }

  return context;
}
