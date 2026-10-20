import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { format } from "date-fns";
import { SHOP } from "@/data/shop";

export type Reach = "call" | "text" | "email";
export type RequestStatus = "pending" | "approved" | "declined";

export type ServiceRequest = {
  id: string;
  createdAt: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  mileageUnsure: boolean;
  lights: string[];
  issues: string[];
  note: string;
  name: string;
  phone: string;
  email: string;
  reach: Reach;
  timing: string;
  status: RequestStatus;
  arrivalDate?: string;
  arrivalTime?: string;
  declineNote?: string;
  decidedAt?: string;
};

type GarageState = {
  requests: ServiceRequest[];
  activeId: string | null;
  add: (request: ServiceRequest) => void;
  update: (id: string, patch: Partial<ServiceRequest>) => void;
  setActive: (id: string | null) => void;
};

export const useGarage = create<GarageState>()(
  persist(
    (set) => ({
      requests: [],
      activeId: null,
      add: (request) =>
        set((state) => ({
          requests: [request, ...state.requests],
          activeId: request.id,
        })),
      update: (id, patch) =>
        set((state) => ({
          requests: state.requests.map((request) =>
            request.id === id ? { ...request, ...patch } : request,
          ),
        })),
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: "frs-requests-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export function hydrateGarage() {
  void useGarage.persist.rehydrate();
}

export function ticketId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "FRS-";
  for (let i = 0; i < 4; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function prettyPhone(phone: string) {
  const d = digits(phone);
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (n.length !== 10) return phone;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

export function e164(phone: string) {
  const d = digits(phone);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}

export function whenLabel(date?: string, time?: string) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return `${date} at ${time}`;
  return `${format(parsed, "EEEE, MMMM d")} at ${time}`;
}

export function customerMessage(request: ServiceRequest) {
  const vehicle = `${request.year} ${request.make} ${request.model}`.trim();
  if (request.status === "approved" && request.arrivalDate && request.arrivalTime) {
    const when = whenLabel(request.arrivalDate, request.arrivalTime);
    return {
      title: `${SHOP.name} — you're on the book`,
      body: `${SHOP.name}: You're set for ${when}. ${SHOP.street}, Freehold. Ticket ${request.id} · ${vehicle}. Call ${SHOP.phoneDisplay} if you need to move it.`,
    };
  }
  if (request.status === "declined") {
    const extra = request.declineNote?.trim() ? ` ${request.declineNote.trim()}` : "";
    return {
      title: `${SHOP.name} — ${request.id}`,
      body: `${SHOP.name}: We can't take ticket ${request.id} for that time.${extra} Call ${SHOP.phoneDisplay} and we'll find another slot. ${SHOP.street}, Freehold.`,
    };
  }
  const channel = request.reach === "email" ? "email" : request.reach === "text" ? "text" : "call";
  return {
    title: `Request ${request.id} is at the counter`,
    body: `We have your ${vehicle}. Ticket ${request.id}. Freehold Service Center will ${channel} you to set a time. ${SHOP.phoneDisplay}.`,
  };
}

export function smsHref(phone: string, body: string) {
  const number = e164(phone);
  const apple = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const sep = apple ? "&" : "?";
  return `sms:${number}${sep}body=${encodeURIComponent(body)}`;
}

export function mailHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isSunday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.getDay() === 0;
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
