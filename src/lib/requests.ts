import { createServerFn } from "@tanstack/react-start";
import { SHOP, SLOTS } from "@/data/shop";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isSunday, todayISO } from "@/lib/garage-store";

export type NotifyState = "not_configured" | "held" | "sent" | "failed";

export type ShopRequest = {
  id: string;
  createdAt: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  mileageUnsure: boolean;
  lights: string[];
  issues: string[];
  followups: Record<string, string>;
  note: string;
  name: string;
  phone: string;
  email: string;
  reach: string;
  appointmentDate: string;
  appointmentTime: string;
  status: "pending" | "approved" | "declined";
  arrivalDate: string;
  arrivalTime: string;
  declineNote: string;
  staffNote: string;
  decidedAt: string;
  notifyEmail: NotifyState;
  notifySms: NotifyState;
  photoCount: number;
};

type Photo = { id: string; dataUrl: string };

type SubmitInput = {
  year: string;
  make: string;
  model: string;
  mileage: string;
  mileageUnsure: boolean;
  lights: string[];
  issues: string[];
  followups: Record<string, string>;
  note: string;
  name: string;
  phone: string;
  email: string;
  reach: string;
  appointmentDate: string;
  appointmentTime: string;
  photos: string[];
};

const STAFF = SHOP.email.toLowerCase();

function ticketId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "FRS-";
  for (let i = 0; i < 4; i += 1) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asMap(value: unknown): Record<string, string> {
  const source = typeof value === "string" ? safeParse(value) : value;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function rowToRequest(row: Record<string, unknown>): ShopRequest {
  const status = row.status === "approved" || row.status === "declined" ? row.status : "pending";
  return {
    id: String(row.id),
    createdAt: String(row.created_at ?? ""),
    year: String(row.year ?? ""),
    make: String(row.make ?? ""),
    model: String(row.model ?? ""),
    mileage: String(row.mileage ?? ""),
    mileageUnsure: Boolean(row.mileage_unsure),
    lights: asList(row.lights),
    issues: asList(row.issues),
    followups: asMap(row.followups),
    note: String(row.note ?? ""),
    name: String(row.customer_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    reach: String(row.reach ?? ""),
    appointmentDate: String(row.appointment_date ?? ""),
    appointmentTime: String(row.appointment_time ?? ""),
    status,
    arrivalDate: String(row.arrival_date ?? ""),
    arrivalTime: String(row.arrival_time ?? ""),
    declineNote: String(row.decline_note ?? ""),
    staffNote: String(row.staff_note ?? ""),
    decidedAt: String(row.decided_at ?? ""),
    notifyEmail: asNotify(row.notify_email),
    notifySms: asNotify(row.notify_sms),
    photoCount: Number(row.photo_count ?? 0),
  };
}

function asNotify(value: unknown): NotifyState {
  if (value === "held" || value === "sent" || value === "failed" || value === "not_configured") return value;
  return "not_configured";
}

async function staffEmail(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId} limit 1`;
  return (rows[0]?.email ?? "").toLowerCase();
}

async function requireStaff(userId: string) {
  const email = await staffEmail(userId);
  if (email !== STAFF) throw new Error("Not the shop counter");
}

function cleanPhotos(photos: string[]) {
  return photos
    .filter((photo) => photo.startsWith("data:image/jpeg;base64,") && photo.length < 900_000)
    .slice(0, 3);
}

function validateSubmit(input: SubmitInput) {
  if (!input.year || !input.make || !input.model.trim()) throw new Error("Vehicle is incomplete.");
  if (!input.mileageUnsure && !/^\d{1,7}$/.test(input.mileage)) throw new Error("Mileage is missing.");
  if (input.lights.length === 0 || input.issues.length === 0) throw new Error("Lights and the problem are required.");
  if (input.name.trim().length < 2) throw new Error("Name is required.");
  const digits = input.phone.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) throw new Error("Phone is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new Error("Email is required.");
  if (!["call", "text", "email"].includes(input.reach)) throw new Error("Pick how to reach you.");
  if (!input.appointmentDate || input.appointmentDate < todayISO() || isSunday(input.appointmentDate)) {
    throw new Error("Pick a Monday–Saturday date that hasn’t passed.");
  }
  if (!SLOTS.includes(input.appointmentTime as (typeof SLOTS)[number])) throw new Error("Pick a time the bay is open.");
}

const WALK_IN = "walk-in";

export const submitRequest = createServerFn({ method: "POST" })
  .validator((input: SubmitInput) => input)
  .handler(async ({ data }) => {
    validateSubmit(data);
    const sql = await getSql();
    const photos = cleanPhotos(data.photos ?? []);
    let id = ticketId();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await sql<{ id: string }>`select id from service_requests where id = ${id} limit 1`;
      if (existing.length === 0) break;
      id = ticketId();
    }
    await sql`
      insert into service_requests (
        id, user_id, year, make, model, mileage, mileage_unsure, lights, issues, followups, note,
        customer_name, phone, email, reach, appointment_date, appointment_time
      ) values (
        ${id}, ${WALK_IN}, ${data.year}, ${data.make}, ${data.model.trim()},
        ${data.mileageUnsure ? "" : data.mileage}, ${data.mileageUnsure},
        ${JSON.stringify(data.lights)}, ${JSON.stringify(data.issues)}, ${JSON.stringify(data.followups ?? {})},
        ${data.note.trim().slice(0, 500)}, ${data.name.trim()}, ${data.phone.trim()}, ${data.email.trim()},
        ${data.reach}, ${data.appointmentDate}, ${data.appointmentTime}
      )
    `;
    for (const [index, photo] of photos.entries()) {
      await sql`
        insert into request_photos (id, request_id, user_id, data_url)
        values (${`${id}-${index}`}, ${id}, ${WALK_IN}, ${photo})
      `;
    }
    const { notifyShop } = await import("@/lib/notify.server");
    const notice = await notifyShop({
      id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      vehicle: `${data.year} ${data.make} ${data.model}`.trim(),
      when: `${data.appointmentDate} ${data.appointmentTime}`,
    });
    await sql`
      update service_requests set notify_email = ${notice.email}, notify_sms = ${notice.sms} where id = ${id}
    `;
    const rows = await sql<Record<string, unknown>>`
      select r.*, (select count(*) from request_photos p where p.request_id = r.id) as photo_count
      from service_requests r where r.id = ${id}
    `;
    return rowToRequest(rows[0]);
  });

export const listMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select r.*, (select count(*) from request_photos p where p.request_id = r.id) as photo_count
      from service_requests r
      where r.user_id = ${context.userId}
      order by r.created_at desc
    `;
    return rows.map(rowToRequest);
  });

export const listDesk = createServerFn({ method: "POST" })
  .validator((input: { status: string; q: string }) => ({
    status: input.status === "approved" || input.status === "declined" ? input.status : "pending",
    q: (input.q ?? "").trim().slice(0, 80),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const rows = await sql<Record<string, unknown>>`
      select r.*, (select count(*) from request_photos p where p.request_id = r.id) as photo_count
      from service_requests r
      where r.status = ${data.status}
        and (
          ${data.q} = ''
          or r.id ilike ${like}
          or r.customer_name ilike ${like}
          or r.make ilike ${like}
          or r.model ilike ${like}
          or r.phone ilike ${like}
        )
      order by r.created_at desc
      limit 100
    `;
    return rows.map(rowToRequest);
  });

export const updateDesk = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      status?: "approved" | "declined" | "pending";
      arrivalDate?: string;
      arrivalTime?: string;
      declineNote?: string;
      staffNote?: string;
    }) => input,
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (data.status === "approved") {
      if (!data.arrivalDate || !data.arrivalTime) throw new Error("Pick the day and the time.");
      if (isSunday(data.arrivalDate) || data.arrivalDate < todayISO()) throw new Error("That day is closed or already passed.");
      if (!SLOTS.includes(data.arrivalTime as (typeof SLOTS)[number])) throw new Error("Pick an open time.");
    }
    const sql = await getSql();
    const decided = data.status === "approved" || data.status === "declined" ? new Date().toISOString() : null;
    await sql`
      update service_requests set
        status = coalesce(${data.status ?? null}, status),
        arrival_date = coalesce(${data.arrivalDate ?? null}, arrival_date),
        arrival_time = coalesce(${data.arrivalTime ?? null}, arrival_time),
        decline_note = coalesce(${data.declineNote ?? null}, decline_note),
        staff_note = coalesce(${data.staffNote ?? null}, staff_note),
        decided_at = coalesce(${decided}, decided_at)
      where id = ${data.id}
    `;
    const rows = await sql<Record<string, unknown>>`
      select r.*, (select count(*) from request_photos p where p.request_id = r.id) as photo_count
      from service_requests r where r.id = ${data.id}
    `;
    if (!rows[0]) throw new Error("Request not found");
    return rowToRequest(rows[0]);
  });

export const readPhotos = createServerFn({ method: "POST" })
  .validator((id: string) => id.trim())
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const owner = await sql<{ user_id: string }>`select user_id from service_requests where id = ${id} limit 1`;
    if (!owner[0]) return [] as Photo[];
    const email = await staffEmail(context.userId);
    if (owner[0].user_id !== context.userId && email !== STAFF) throw new Error("Not allowed");
    const photos = await sql<{ id: string; data_url: string }>`
      select id, data_url from request_photos where request_id = ${id} order by created_at
    `;
    return photos.map((photo) => ({ id: photo.id, dataUrl: photo.data_url }));
  });
