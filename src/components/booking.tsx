import { useMemo, useState, type ReactNode } from "react";
import {
  ISSUES,
  LIGHTS,
  MAKES,
  POPULAR_MAKES,
  REACH,
  SHOP,
  SLOTS,
  YEARS,
  labelFor,
  modelsFor,
} from "@/data/shop";
import { isSunday, prettyPhone, todayISO, useGarage } from "@/lib/garage-store";
import { submitRequest, type ShopRequest } from "@/lib/requests";

type Draft = {
  make: string;
  year: string;
  model: string;
  modelCustom: string;
  mileage: string;
  mileageUnsure: boolean;
  issues: string[];
  lights: string[];
  followups: Record<string, string>;
  note: string;
  photos: string[];
  name: string;
  phone: string;
  email: string;
  reach: "" | "call" | "text" | "email";
  appointmentDate: string;
  appointmentTime: string;
};

const EMPTY: Draft = {
  make: "",
  year: "",
  model: "",
  modelCustom: "",
  mileage: "",
  mileageUnsure: false,
  issues: [],
  lights: [],
  followups: {},
  note: "",
  photos: [],
  name: "",
  phone: "",
  email: "",
  reach: "",
  appointmentDate: "",
  appointmentTime: "",
};

function modelName(draft: Draft) {
  return draft.model === "Other" || draft.make === "Other" ? draft.modelCustom.trim() : draft.model;
}

function stepsFor(draft: Draft) {
  const steps = ["welcome", "make", "year", "model", "mileage", "issues", "lights"];
  if (draft.issues.includes("brakes")) steps.push("brakes");
  if (draft.issues.includes("start")) steps.push("start");
  if (draft.lights.includes("cel")) steps.push("cel");
  if (draft.issues.some((id) => id === "engine" || id === "exhaust" || id === "susp")) steps.push("noise");
  steps.push("photos", "name", "phone", "email", "reach", "date", "time", "review");
  return steps;
}

function toggle(current: string[], id: string, exclusive: string[]) {
  if (exclusive.includes(id)) return [id];
  const next = current.filter((item) => !exclusive.includes(item));
  return next.includes(id) ? next.filter((item) => item !== id) : [...next, id];
}

async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function Booking() {
  const addLocal = useGarage((state) => state.add);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<ShopRequest | null>(null);
  const steps = useMemo(() => stepsFor(draft), [draft]);
  const step = steps[Math.min(index, steps.length - 1)];
  const models = modelsFor(draft.make);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
    setError("");
  }

  function problem() {
    if (step === "make" && !draft.make) return "Pick the make, or Other.";
    if (step === "year" && !draft.year) return "Pick the year.";
    if (step === "model" && !modelName(draft)) return "Pick the model, or type it.";
    if (step === "mileage" && !draft.mileageUnsure && !/^\d{1,7}$/.test(draft.mileage.replace(/,/g, ""))) {
      return "Mileage, or Not sure.";
    }
    if (step === "issues" && draft.issues.length === 0) return "Check what’s wrong, or Not sure.";
    if (step === "lights" && draft.lights.length === 0) return "Check the lights that are on, none, or not sure.";
    if (step === "brakes" && !draft.followups.brakes) return "Front, rear, both, or not sure.";
    if (step === "start" && !draft.followups.start) return "What does it do when you turn the key?";
    if (step === "cel" && !draft.followups.cel) return "Steady, flashing, or not sure.";
    if (step === "noise" && !draft.followups.noise) return "When do you hear it?";
    if (step === "name" && draft.name.trim().length < 2) return "Name so the counter knows who to ask for.";
    if (step === "phone") {
      const digits = draft.phone.replace(/\D/g, "");
      if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) return "A 10-digit phone number.";
    }
    if (step === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return "An email for the written time.";
    if (step === "reach" && !draft.reach) return "How should the shop answer?";
    if (step === "date" && (!draft.appointmentDate || draft.appointmentDate < todayISO() || isSunday(draft.appointmentDate))) {
      return "A Monday–Saturday date that hasn’t passed.";
    }
    if (step === "time" && !draft.appointmentTime) return "Pick a time the bay is open.";
    return "";
  }

  function next() {
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const nextPhotos = [...draft.photos];
    for (const file of Array.from(files)) {
      if (nextPhotos.length >= 3) break;
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await shrink(file);
      if (dataUrl.startsWith("data:image/jpeg") && dataUrl.length < 900_000) nextPhotos.push(dataUrl);
    }
    patch({ photos: nextPhotos });
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await submitRequest({
        data: {
          year: draft.year,
          make: draft.make === "Other" ? "Other" : draft.make,
          model: modelName(draft),
          mileage: draft.mileage.replace(/,/g, ""),
          mileageUnsure: draft.mileageUnsure,
          lights: draft.lights,
          issues: draft.issues,
          followups: draft.followups,
          note: draft.note,
          name: draft.name,
          phone: prettyPhone(draft.phone),
          email: draft.email.trim(),
          reach: draft.reach,
          appointmentDate: draft.appointmentDate,
          appointmentTime: draft.appointmentTime,
          photos: draft.photos,
        },
      });
      addLocal({
        id: saved.id,
        createdAt: saved.createdAt,
        year: saved.year,
        make: saved.make,
        model: saved.model,
        mileage: saved.mileage,
        mileageUnsure: saved.mileageUnsure,
        lights: saved.lights,
        issues: saved.issues,
        note: saved.note,
        name: saved.name,
        phone: saved.phone,
        email: saved.email,
        reach: saved.reach === "text" || saved.reach === "email" ? saved.reach : "call",
        timing: `${saved.appointmentDate} ${saved.appointmentTime}`,
        status: saved.status,
      });
      setSent(saved);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The shop did not get that.";
      setError(message || "The shop did not get that. Nothing was confirmed.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    const alerts =
      sent.notifyEmail === "sent" || sent.notifySms === "sent"
        ? "The shop alert went out."
        : "Saved on the shop’s desk. Text and email alerts are not connected, so no message was sent.";
    return (
      <div className="rise rounded-lg border border-line bg-surface p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Request in</p>
        <h3 className="display mt-2 text-6xl">{sent.id}</h3>
        <p className="mt-3 text-base">
          {sent.year} {sent.make} {sent.model} is waiting on the counter. This is not an appointment until{" "}
          {SHOP.name} approves a time.
        </p>
        <p className="mt-3 text-sm text-muted">{alerts}</p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setDraft(EMPTY);
            setIndex(0);
          }}
          className="mt-6 inline-flex min-h-12 items-center rounded-full border border-line px-5 text-sm font-semibold"
        >
          Send another car
        </button>
      </div>
    );
  }

  return (
    <form
      className="rise rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "review") void submit();
        else next();
      }}
    >
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          {step === "welcome" ? "Freehold Service Center" : `Question ${index} of ${steps.length - 1}`}
        </p>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary" style={{ width: `${(index / (steps.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="mt-5">
        {step === "welcome" ? (
          <div>
            <h3 className="display text-5xl sm:text-6xl">Let’s get your vehicle taken care of.</h3>
            <p className="mt-3 max-w-md text-base text-muted">
              Tell us about your car, and we’ll help you with the next steps.
            </p>
          </div>
        ) : null}
        {step === "make" ? (
          <Choice title="Who made the car?">
            <div className="flex flex-wrap gap-2">
              {POPULAR_MAKES.map((make) => (
                <Chip key={make} pressed={draft.make === make} onClick={() => patch({ make, model: "", modelCustom: "" })}>
                  {make}
                </Chip>
              ))}
            </div>
            <select
              className={fieldClass}
              value={draft.make}
              aria-label="All makes"
              onChange={(event) => patch({ make: event.target.value, model: "", modelCustom: "" })}
            >
              <option value="">All makes</option>
              {MAKES.map((make) => (
                <option key={make.name} value={make.name}>
                  {make.name}
                </option>
              ))}
            </select>
          </Choice>
        ) : null}
        {step === "year" ? (
          <Choice title="What year is it?">
            <select className={fieldClass} value={draft.year} aria-label="Year" onChange={(event) => patch({ year: event.target.value })}>
              <option value="">Select year</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Choice>
        ) : null}
        {step === "model" ? (
          <Choice title={draft.make === "Other" ? "What is it?" : `Which ${draft.make}?`}>
            {draft.make !== "Other" ? (
              <div className="flex flex-wrap gap-2">
                {models.map((model) => (
                  <Chip key={model} pressed={draft.model === model} onClick={() => patch({ model })}>
                    {model}
                  </Chip>
                ))}
                <Chip pressed={draft.model === "Other"} onClick={() => patch({ model: "Other" })}>
                  Other
                </Chip>
              </div>
            ) : null}
            {draft.make === "Other" || draft.model === "Other" ? (
              <input
                className={fieldClass}
                value={draft.modelCustom}
                placeholder="Type the model"
                onChange={(event) => patch({ modelCustom: event.target.value })}
              />
            ) : null}
          </Choice>
        ) : null}
        {step === "mileage" ? (
          <Choice title="About how many miles?">
            <input
              className={fieldClass}
              inputMode="numeric"
              disabled={draft.mileageUnsure}
              placeholder="84200"
              value={draft.mileage}
              onChange={(event) => patch({ mileage: event.target.value.replace(/[^\d]/g, "") })}
            />
            <Chip pressed={draft.mileageUnsure} onClick={() => patch({ mileageUnsure: !draft.mileageUnsure, mileage: "" })}>
              Not sure
            </Chip>
          </Choice>
        ) : null}
        {step === "issues" ? (
          <Choice title="What do you want looked at?">
            <p className="text-sm text-muted">Not sure is a real answer. This does not diagnose the car.</p>
            <div className="flex flex-wrap gap-2">
              {ISSUES.map((issue) => (
                <Chip
                  key={issue.id}
                  pressed={draft.issues.includes(issue.id)}
                  onClick={() => patch({ issues: toggle(draft.issues, issue.id, ["unsure"]) })}
                >
                  {issue.label}
                </Chip>
              ))}
            </div>
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-bg px-3 py-3 text-base outline-none focus:border-primary"
              maxLength={500}
              placeholder="Anything else the tech should know"
              value={draft.note}
              onChange={(event) => patch({ note: event.target.value })}
            />
          </Choice>
        ) : null}
        {step === "lights" ? (
          <Choice title="Anything lit on the dash?">
            <div className="flex flex-wrap gap-2">
              {LIGHTS.map((light) => (
                <Chip
                  key={light.id}
                  pressed={draft.lights.includes(light.id)}
                  onClick={() => patch({ lights: toggle(draft.lights, light.id, ["none", "unsure"]) })}
                >
                  {light.label}
                </Chip>
              ))}
            </div>
          </Choice>
        ) : null}
        {step === "brakes" ? (
          <Choice title="Where are the brakes acting up?">
            <Options
              value={draft.followups.brakes}
              options={["Front", "Rear", "Both", "Not sure"]}
              onPick={(value) => patch({ followups: { ...draft.followups, brakes: value } })}
            />
          </Choice>
        ) : null}
        {step === "start" ? (
          <Choice title="What happens when you try to start it?">
            <Options
              value={draft.followups.start}
              options={["Clicks", "Cranks but won’t fire", "Nothing at all", "Starts then dies", "Not sure"]}
              onPick={(value) => patch({ followups: { ...draft.followups, start: value } })}
            />
          </Choice>
        ) : null}
        {step === "cel" ? (
          <Choice title="How is the check engine light behaving?">
            <Options
              value={draft.followups.cel}
              options={["Steady", "Flashing", "Not sure"]}
              onPick={(value) => patch({ followups: { ...draft.followups, cel: value } })}
            />
          </Choice>
        ) : null}
        {step === "noise" ? (
          <Choice title="When do you notice the noise?">
            <Options
              value={draft.followups.noise}
              options={["Idle", "While driving", "Braking", "Over bumps", "Not sure"]}
              onPick={(value) => patch({ followups: { ...draft.followups, noise: value } })}
            />
          </Choice>
        ) : null}
        {step === "photos" ? (
          <Choice title="Photos help. They’re optional.">
            <input
              type="file"
              accept="image/*"
              multiple
              aria-label="Photos of the problem"
              onChange={(event) => void addPhotos(event.target.files)}
            />
            <div className="flex gap-2">
              {draft.photos.map((photo) => (
                <img key={photo.slice(-24)} src={photo} alt="" className="h-20 w-20 rounded-md object-cover" />
              ))}
            </div>
            <p className="text-sm text-muted">Up to three. Skip if you don’t have one.</p>
          </Choice>
        ) : null}
        {step === "name" ? (
          <Choice title="What’s your name?">
            <input className={fieldClass} autoComplete="name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
          </Choice>
        ) : null}
        {step === "phone" ? (
          <Choice title="Phone number?">
            <input className={fieldClass} autoComplete="tel" inputMode="tel" value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} />
          </Choice>
        ) : null}
        {step === "email" ? (
          <Choice title="Email?">
            <input className={fieldClass} autoComplete="email" inputMode="email" value={draft.email} onChange={(event) => patch({ email: event.target.value })} />
            <p className="text-sm text-muted">No account. This email is enough for the shop to write you back.</p>
          </Choice>
        ) : null}
        {step === "reach" ? (
          <Choice title="How should we answer?">
            <div className="grid gap-2">
              {REACH.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={draft.reach === item.id}
                  onClick={() => patch({ reach: item.id })}
                  className={`min-h-14 rounded-md border px-3 text-left ${draft.reach === item.id ? "border-primary bg-primary text-bg" : "border-line bg-bg"}`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`text-xs ${draft.reach === item.id ? "text-bg/80" : "text-muted"}`}>{item.hint}</span>
                </button>
              ))}
            </div>
          </Choice>
        ) : null}
        {step === "date" ? (
          <Choice title="What day were you hoping for?">
            <input className={fieldClass} type="date" min={todayISO()} value={draft.appointmentDate} onChange={(event) => patch({ appointmentDate: event.target.value })} />
            <p className="text-sm text-muted">Monday through Saturday. Sunday the bay is closed. This is a request, not a hold.</p>
          </Choice>
        ) : null}
        {step === "time" ? (
          <Choice title="What time?">
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((slot) => (
                <Chip key={slot} pressed={draft.appointmentTime === slot} onClick={() => patch({ appointmentTime: slot })}>
                  {slot}
                </Chip>
              ))}
            </div>
          </Choice>
        ) : null}
        {step === "review" ? (
          <Choice title="Look it over, then send it.">
            <dl className="grid gap-2 text-sm">
              <Row label="Vehicle" value={`${draft.year} ${draft.make} ${modelName(draft)}`} />
              <Row label="Mileage" value={draft.mileageUnsure ? "Not sure" : `${Number(draft.mileage).toLocaleString()} mi`} />
              <Row label="Looking at" value={draft.issues.map((id) => labelFor(ISSUES, id)).join(", ")} />
              <Row label="Lights" value={draft.lights.map((id) => labelFor(LIGHTS, id)).join(", ")} />
              {draft.followups.brakes ? <Row label="Brakes" value={draft.followups.brakes} /> : null}
              {draft.followups.start ? <Row label="Starting" value={draft.followups.start} /> : null}
              {draft.followups.cel ? <Row label="Check engine" value={draft.followups.cel} /> : null}
              {draft.followups.noise ? <Row label="Noise" value={draft.followups.noise} /> : null}
              <Row label="Hoping for" value={`${draft.appointmentDate} · ${draft.appointmentTime}`} />
              <Row label="Reach" value={`${draft.name} · ${draft.reach}`} />
              <Row label="Photos" value={draft.photos.length ? String(draft.photos.length) : "None"} />
            </dl>
            <p className="text-sm text-muted">No price until someone has eyes on it. Sending this does not book the bay.</p>
          </Choice>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-primary" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setError("");
            setIndex((value) => Math.max(0, value - 1));
          }}
          className="min-h-12 rounded-full px-4 text-sm font-semibold disabled:text-muted"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {step === "welcome" ? "Get started" : step === "photos" ? "Continue" : step === "review" ? (busy ? "Sending" : "Send the request") : "Continue"}
        </button>
      </div>
    </form>
  );
}

const fieldClass = "h-12 w-full rounded-md border border-line bg-bg px-3 text-base text-fg outline-none focus:border-primary";

function Choice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-4">
      <h3 className="display text-4xl sm:text-5xl">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium ${pressed ? "border-primary bg-primary text-bg" : "border-line bg-bg text-fg"}`}
    >
      {children}
    </button>
  );
}

function Options({ value, options, onPick }: { value?: string; options: string[]; onPick: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option} pressed={value === option} onClick={() => onPick(option)}>
          {option}
        </Chip>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
