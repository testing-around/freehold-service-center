import { z } from "zod";

export function normalizeUsPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export const contactRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter your name.")
      .max(80)
      .regex(/^[^\r\n\u0000-\u001f]+$/, "Please enter your name on one line."),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => normalizeUsPhone(value) !== null,
        "Please enter a 10-digit U.S. phone number.",
      )
      .transform((value) => normalizeUsPhone(value)!),
    email: z.union([z.literal(""), z.email("Please enter a valid email address.")]),
    reply: z.enum(["call", "whatsapp", "email"]),
    vehicle: z.string().trim().max(120, "Please keep vehicle details under 120 characters."),
    message: z.string().trim().max(1000, "Please keep your message under 1,000 characters."),
  })
  .superRefine((request, context) => {
    if (request.reply === "email" && !request.email) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please enter an email address so the shop can reply.",
      });
    }
  });

export type ContactRequestInput = z.input<typeof contactRequestSchema>;
export type ContactRequest = z.output<typeof contactRequestSchema>;

export const REPLY_LABELS = {
  call: "Call me back",
  whatsapp: "Reply on WhatsApp",
  email: "Reply by email",
} as const;

export function formatContactMessage(request: ContactRequest, shopName: string): string {
  const preference =
    request.reply === "call"
      ? `Please call me back at ${request.phone}.`
      : request.reply === "whatsapp"
        ? `Please reply on WhatsApp at ${request.phone}.`
        : `Please email me at ${request.email}.`;
  return [
    `Hello ${shopName}, I'd like to request help with my vehicle.`,
    "",
    `Name: ${request.name}`,
    `Phone: ${request.phone}`,
    ...(request.email ? [`Email: ${request.email}`] : []),
    `Preferred reply: ${REPLY_LABELS[request.reply]}`,
    preference,
    ...(request.vehicle ? [`Vehicle: ${request.vehicle}`] : []),
    ...(request.message ? ["", `What I need help with: ${request.message}`] : []),
    "",
    "Please contact me to discuss the repair and availability. This is a request, not a confirmed appointment.",
  ].join("\n");
}

export function buildContactLinks(
  request: ContactRequest,
  shop: { name: string; phoneTel: string; email: string },
) {
  const phone = normalizeUsPhone(shop.phoneTel);
  if (!phone) throw new Error("The shop contact number is invalid.");
  const body = formatContactMessage(request, shop.name);
  return {
    whatsapp: `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(body)}`,
    email: `mailto:${shop.email}?subject=${encodeURIComponent(`Vehicle repair request — ${request.name}`)}&body=${encodeURIComponent(body)}`,
  };
}
