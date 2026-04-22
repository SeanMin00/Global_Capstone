"use client";

import { createContext, useContext } from "react";
import type { TourScope, TourStep } from "./tourSteps";

export type TourStartOptions = {
  force?: boolean;
  scope?: TourScope;
};

export type TourContextValue = {
  steps: TourStep[];
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  activeScope: TourScope;
  start: (options?: TourStartOptions) => void;
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
