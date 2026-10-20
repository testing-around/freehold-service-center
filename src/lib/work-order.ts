import { create } from "zustand";
import type { Reach } from "@/lib/garage-store";

export type Draft = {
  year: string;
  make: string;
  model: string;
  modelCustom: string;
  mileage: string;
  mileageUnsure: boolean;
  lights: string[];
  issues: string[];
  note: string;
  name: string;
  phone: string;
  email: string;
  reach: Reach | "";
  timing: string;
};

export const EMPTY_DRAFT: Draft = {
  year: "",
  make: "",
  model: "",
  modelCustom: "",
  mileage: "",
  mileageUnsure: false,
  lights: [],
  issues: [],
  note: "",
  name: "",
  phone: "",
  email: "",
  reach: "",
  timing: "",
};

type WorkOrderState = {
  draft: Draft;
  step: number;
  parked: boolean;
  patch: (partial: Partial<Draft>) => void;
  setStep: (step: number) => void;
  setParked: (parked: boolean) => void;
  reset: () => void;
};

export function resolvedModel(draft: Draft) {
  return draft.model === "Other" || draft.make === "Other" ? draft.modelCustom.trim() : draft.model;
}

export function vehicleProblem(draft: Draft) {
  const model = resolvedModel(draft);
  if (!draft.year || !draft.make || !model) return "Year, make, and model — or Other if it isn’t listed.";
  if (!draft.mileageUnsure && !draft.mileage.trim()) return "Mileage, or mark Not sure.";
  if (!draft.mileageUnsure && !/^\d{1,7}$/.test(draft.mileage.replace(/,/g, ""))) {
    return "Mileage should be a number, like 84200.";
  }
  return "";
}

export function vehicleLabel(draft: Draft) {
  const model = resolvedModel(draft);
  if (!draft.year || !draft.make || !model) return "";
  return `${draft.year} ${draft.make} ${model}`;
}

export const useWorkOrder = create<WorkOrderState>((set) => ({
  draft: EMPTY_DRAFT,
  step: 0,
  parked: false,
  patch: (partial) =>
    set((state) => {
      const vehicleKeys = ["year", "make", "model", "modelCustom", "mileage", "mileageUnsure"] as const;
      const touchedVehicle = vehicleKeys.some((key) => key in partial);
      return {
        draft: { ...state.draft, ...partial },
        parked: touchedVehicle ? false : state.parked,
        step: touchedVehicle && state.parked ? 0 : state.step,
      };
    }),
  setStep: (step) => set({ step }),
  setParked: (parked) => set({ parked }),
  reset: () => set({ draft: EMPTY_DRAFT, step: 0, parked: false }),
}));
