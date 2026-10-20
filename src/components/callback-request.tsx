import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { SHOP } from "@/data/shop";
import {
  buildContactLinks,
  contactRequestSchema,
  REPLY_LABELS,
  type ContactRequest,
  type ContactRequestInput,
} from "@/lib/contact-request";

const EMPTY: ContactRequestInput = {
  name: "",
  phone: "",
  email: "",
  reply: "call",
  vehicle: "",
  message: "",
};
const fieldClass =
  "mt-2 min-h-12 w-full rounded-md border border-line bg-bg px-3 py-3 text-base text-fg";
const primaryLink =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-bg";
const secondaryLink =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-bg px-5 py-3 text-base font-semibold text-fg";

export function CallbackRequest() {
  const [draft, setDraft] = useState<ContactRequestInput>(EMPTY);
  const [prepared, setPrepared] = useState<ContactRequest | null>(null);
  const [error, setError] = useState("");
  const patch = (change: Partial<ContactRequestInput>) => {
    setDraft((current) => ({ ...current, ...change }));
    setError("");
  };

  if (prepared) {
    const links = buildContactLinks(prepared, SHOP);
    return (
      <section
        aria-labelledby="callback-ready"
        className="rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-8"
      >
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">One more step</p>
        <h2 id="callback-ready" className="display mt-3 text-3xl sm:text-4xl">
          Your message is ready.
        </h2>
        <p className="mt-4 text-base text-muted">
          Your request has not been sent yet. Open WhatsApp or your email app below, then send the
          prepared message to the shop.
        </p>
        <dl className="mt-5 grid gap-3 rounded-md bg-bg p-4 text-base">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="font-semibold">{prepared.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Reply preference</dt>
            <dd className="font-semibold">{REPLY_LABELS[prepared.reply]}</dd>
          </div>
          <div>
            <dt className="text-muted">Your phone</dt>
            <dd className="font-semibold">{prepared.phone}</dd>
          </div>
          {prepared.email ? (
            <div>
              <dt className="text-muted">Your email</dt>
              <dd className="break-words font-semibold">{prepared.email}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 grid gap-3">
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={primaryLink}
          >
            <MessageCircle className="size-5 shrink-0" aria-hidden="true" />
            Send via WhatsApp
          </a>
          <a href={links.email} className={secondaryLink}>
            <Mail className="size-5 shrink-0" aria-hidden="true" />
            Send via email
          </a>
        </div>
        <p className="mt-4 text-sm text-muted">
          The shop will review your message and contact you. An appointment is confirmed only after
          the shop agrees on a time.
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 text-sm font-semibold text-primary"
          onClick={() => setPrepared(null)}
        >
          Edit my request
        </button>
        <a
          href={`tel:${SHOP.phoneTel}`}
          className="mt-3 flex min-h-11 items-center gap-2 text-base font-semibold text-fg"
        >
          <Phone className="size-4" aria-hidden="true" />
          Or call {SHOP.phoneDisplay}
        </a>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="callback-title"
      className="rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-8"
    >
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Freehold Service Center
      </p>
      <h2 id="callback-title" className="display mt-3 text-3xl sm:text-4xl">
        Request a call or WhatsApp reply.
      </h2>
      <p className="mt-4 text-base text-muted">
        Tell us how to reach you and what your car needs. We’ll prepare a message for you to send to
        the shop.
      </p>
      <div className="mt-5 grid gap-2 border-b border-line pb-5">
        <a className={secondaryLink} href={`tel:${SHOP.phoneTel}`}>
          <Phone className="size-5 shrink-0" aria-hidden="true" />
          Call {SHOP.phoneDisplay}
        </a>
        <a className={secondaryLink} href={SHOP.whatsapp} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-5 shrink-0" aria-hidden="true" />
          Message on WhatsApp
        </a>
        <a className={secondaryLink} href={`mailto:${SHOP.email}`}>
          <Mail className="size-5 shrink-0" aria-hidden="true" />
          Email the shop
        </a>
      </div>
      <form
        className="mt-6 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          const result = contactRequestSchema.safeParse({ ...draft, email: draft.email.trim() });
          if (!result.success) {
            setError(result.error.issues[0]?.message || "Please check your details.");
            return;
          }
          setError("");
          setPrepared(result.data);
        }}
      >
        <label className="block text-base font-semibold" htmlFor="callback-name">
          Your name
          <input
            id="callback-name"
            name="name"
            className={fieldClass}
            autoComplete="name"
            maxLength={80}
            required
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="block text-base font-semibold" htmlFor="callback-phone">
          Your phone number
          <input
            id="callback-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className={fieldClass}
            autoComplete="tel"
            maxLength={24}
            required
            value={draft.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            aria-describedby="callback-phone-hint"
          />
          <span id="callback-phone-hint" className="mt-2 block text-sm font-normal text-muted">
            Use the number where you want a call or WhatsApp reply.
          </span>
        </label>
        <fieldset>
          <legend className="mb-3 text-base font-semibold">How should the shop reply?</legend>
          <div className="grid gap-2">
            {(["call", "whatsapp", "email"] as const).map((reply) => (
              <label
                key={reply}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-base font-semibold ${draft.reply === reply ? "border-primary bg-primary text-bg" : "border-line bg-bg text-fg"}`}
              >
                <input
                  type="radio"
                  name="reply"
                  value={reply}
                  checked={draft.reply === reply}
                  onChange={() => patch({ reply })}
                  className="size-4 shrink-0 accent-primary"
                />
                {REPLY_LABELS[reply]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-base font-semibold" htmlFor="callback-email">
          Your email{draft.reply === "email" ? "" : " (optional)"}
          <input
            id="callback-email"
            name="email"
            type="email"
            className={fieldClass}
            autoComplete="email"
            maxLength={254}
            required={draft.reply === "email"}
            value={draft.email}
            onChange={(event) => patch({ email: event.target.value })}
          />
        </label>
        <label className="block text-base font-semibold" htmlFor="callback-vehicle">
          Vehicle (optional)
          <input
            id="callback-vehicle"
            name="vehicle"
            className={fieldClass}
            placeholder="For example, 2018 Toyota Camry"
            maxLength={120}
            value={draft.vehicle}
            onChange={(event) => patch({ vehicle: event.target.value })}
          />
        </label>
        <label className="block text-base font-semibold" htmlFor="callback-message">
          What can we help with? (optional)
          <textarea
            id="callback-message"
            name="message"
            rows={4}
            className={fieldClass}
            maxLength={1000}
            value={draft.message}
            onChange={(event) => patch({ message: event.target.value })}
          />
        </label>
        {error ? (
          <p role="alert" className="text-base font-semibold text-primary">
            {error}
          </p>
        ) : null}
        <button type="submit" className={primaryLink}>
          Prepare my request
        </button>
        <p className="text-sm text-muted">
          Next, you’ll choose WhatsApp or email and send the message. This does not reserve an
          appointment.
        </p>
      </form>
    </section>
  );
}
