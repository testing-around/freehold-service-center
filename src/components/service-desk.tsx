import { useEffect, useState } from "react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ISSUES, LIGHTS, SHOP, SLOTS, labelFor } from "@/data/shop";
import { customerMessage, isSunday, mailHref, smsHref, todayISO, whenLabel, type ServiceRequest } from "@/lib/garage-store";
import { listDesk, readPhotos, updateDesk, type ShopRequest } from "@/lib/requests";

const FILTERS = ["pending", "approved", "declined"] as const;

export function ServiceDesk({ onClose }: { onClose: () => void }) {
  const { user, isPending } = useCurrentUserState();
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("9:00 AM");
  const [declineNote, setDeclineNote] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [photos, setPhotos] = useState<{ id: string; dataUrl: string }[]>([]);
  const [formError, setFormError] = useState("");

  const open = requests.find((request) => request.id === openId) ?? null;
  const isStaff = user?.primaryEmail?.toLowerCase() === SHOP.email.toLowerCase();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isStaff) return;
    let cancel = false;
    listDesk({ data: { status: filter, q: search } })
      .then((rows) => {
        if (!cancel) {
          setRequests(rows);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "The desk didn’t load.");
      });
    return () => {
      cancel = true;
    };
  }, [isStaff, filter, search]);

  useEffect(() => {
    if (!openId) {
      setPhotos([]);
      return;
    }
    const current = requests.find((request) => request.id === openId);
    if (current) {
      setStaffNote(current.staffNote);
      setDeclineNote(current.declineNote);
      if (current.appointmentDate) setDate(current.appointmentDate);
      if (current.appointmentTime) setTime(current.appointmentTime);
    }
    let cancel = false;
    readPhotos({ data: openId })
      .then((rows) => {
        if (!cancel) setPhotos(rows);
      })
      .catch(() => {
        if (!cancel) setPhotos([]);
      });
    return () => {
      cancel = true;
    };
    // Refreshing the list must not wipe a note the counter is still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  async function approve(request: ShopRequest) {
    if (!date || !time || isSunday(date) || date < todayISO()) {
      setFormError("Pick a Monday–Saturday day that hasn’t passed, and a time.");
      return;
    }
    setFormError("");
    const saved = await updateDesk({
      data: { id: request.id, status: "approved", arrivalDate: date, arrivalTime: time, declineNote: "" },
    });
    setRequests((current) => current.map((item) => (item.id === saved.id ? saved : item)).filter((item) => item.status === filter));
  }

  async function decline(request: ShopRequest) {
    const saved = await updateDesk({
      data: { id: request.id, status: "declined", declineNote: declineNote.trim() },
    });
    setRequests((current) => current.filter((item) => item.id !== saved.id || saved.status === filter));
  }

  async function saveNote(request: ShopRequest) {
    const saved = await updateDesk({ data: { id: request.id, staffNote } });
    setRequests((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg text-fg">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Counter</p>
            <h2 className="display text-5xl">Service desk</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">
            Close
          </button>
        </div>

        {isPending ? <p className="mt-8 text-sm text-muted">Checking the counter…</p> : null}
        {!isPending && !user ? (
          <div className="mt-8 grid max-w-sm gap-3">
            <p>Sign in with the shop account to see requests. Customers don’t use this desk.</p>
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-bg"
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        ) : null}
        {!isPending && user && !isStaff ? (
          <p className="mt-8 max-w-md text-base">
            {user.primaryEmail ?? "This account"} isn’t the shop counter. Sign in with {SHOP.email} to review requests.
          </p>
        ) : null}

        {isStaff ? (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`min-h-11 rounded-full border px-3 text-sm font-semibold capitalize ${filter === item ? "border-primary bg-primary text-bg" : "border-line"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, car, ticket"
                className="h-11 flex-1 rounded-md border border-line bg-surface px-3 text-base outline-none focus:border-primary"
              />
            </div>
            {error ? <p className="mt-4 text-sm text-primary">{error}</p> : null}
            <ul className="mt-4 grid gap-3">
              {requests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(request.id === openId ? null : request.id)}
                    className="w-full rounded-lg border border-line bg-surface p-4 text-left"
                  >
                    <span className="display text-3xl">{request.id}</span>
                    <span className="mt-1 block text-sm">
                      {request.year} {request.make} {request.model} · {request.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {request.photoCount} photo{request.photoCount === 1 ? "" : "s"} · wants {request.appointmentDate} {request.appointmentTime}
                    </span>
                  </button>
                </li>
              ))}
              {requests.length === 0 ? <li className="text-sm text-muted">Nothing in {filter}.</li> : null}
            </ul>
            {open ? (
              <article className="mt-4 rounded-lg border border-line bg-surface p-4">
                <h3 className="text-lg font-semibold">
                  {open.name} · {open.phone}
                </h3>
                <p className="text-sm text-muted">{open.email}</p>
                <p className="mt-3 text-sm">
                  Lights: {open.lights.map((id) => labelFor(LIGHTS, id)).join(", ") || "—"}
                </p>
                <p className="text-sm">Looking at: {open.issues.map((id) => labelFor(ISSUES, id)).join(", ")}</p>
                {Object.keys(open.followups).length ? (
                  <p className="text-sm text-muted">{Object.entries(open.followups).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
                ) : null}
                {open.note ? <p className="mt-2 text-sm">{open.note}</p> : null}
                <div className="mt-3 flex gap-2">
                  {photos.map((photo) => (
                    <img key={photo.id} src={photo.dataUrl} alt="Customer photo of the problem" className="h-24 w-24 rounded-md object-cover" />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-semibold" href={`tel:${open.phone}`}>
                    Call
                  </a>
                  <a
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-semibold"
                    href={smsHref(open.phone, customerMessage(asLegacy(open)).body)}
                  >
                    Open a text
                  </a>
                  <a
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-semibold"
                    href={mailHref(open.email, open.id, customerMessage(asLegacy(open)).body)}
                  >
                    Open email
                  </a>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Shop alert when it came in: email {open.notifyEmail}, text {open.notifySms}. The links above only open your phone — they are not the alert.
                </p>
                <label className="mt-4 block text-sm">
                  Internal note
                  <textarea
                    className="mt-1 min-h-20 w-full rounded-md border border-line bg-bg px-3 py-2"
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                  />
                </label>
                <button type="button" onClick={() => void saveNote(open)} className="mt-2 min-h-11 text-sm font-semibold text-primary">
                  Save note
                </button>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="date" min={todayISO()} value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-md border border-line bg-bg px-3" />
                  <select value={time} onChange={(event) => setTime(event.target.value)} className="h-12 rounded-md border border-line bg-bg px-3">
                    {SLOTS.map((slot) => (
                      <option key={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                {formError ? <p className="mt-2 text-sm text-primary">{formError}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void approve(open)} className="min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-bg">
                    Approve {whenLabel(date, time) || "this time"}
                  </button>
                  <button type="button" onClick={() => void decline(open)} className="min-h-12 rounded-full border border-line px-5 text-sm font-semibold">
                    Decline
                  </button>
                </div>
                <label className="mt-3 block text-sm">
                  If you decline, say why
                  <input className="mt-1 h-12 w-full rounded-md border border-line bg-bg px-3" value={declineNote} onChange={(event) => setDeclineNote(event.target.value)} />
                </label>
              </article>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function asLegacy(request: ShopRequest): ServiceRequest {
  return {
    id: request.id,
    createdAt: request.createdAt,
    year: request.year,
    make: request.make,
    model: request.model,
    mileage: request.mileage,
    mileageUnsure: request.mileageUnsure,
    lights: request.lights,
    issues: request.issues,
    note: request.note,
    name: request.name,
    phone: request.phone,
    email: request.email,
    reach: request.reach === "text" || request.reach === "email" ? request.reach : "call",
    timing: `${request.appointmentDate} ${request.appointmentTime}`,
    status: request.status,
    arrivalDate: request.arrivalDate,
    arrivalTime: request.arrivalTime,
    declineNote: request.declineNote,
    decidedAt: request.decidedAt,
  };
}
