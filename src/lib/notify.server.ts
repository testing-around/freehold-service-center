import { SHOP } from "@/data/shop";

export type NotifyState = "not_configured" | "held" | "sent" | "failed";

type Alert = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  when: string;
};

function configured(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export async function notifyShop(alert: Alert): Promise<{ email: NotifyState; sms: NotifyState }> {
  const emailReady = configured(["RESEND_API_KEY", "RESEND_FROM"]);
  const smsReady = configured(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"]);
  const live = process.env.NOTIFY_LIVE === "yes";
  const text = `${SHOP.name} request ${alert.id}: ${alert.vehicle}. ${alert.name} ${alert.phone}. Wants ${alert.when}. Not an approved appointment.`;

  return {
    email: await sendEmail(emailReady, live, alert, text),
    sms: await sendSms(smsReady, live, text),
  };
}

async function sendEmail(ready: boolean, live: boolean, alert: Alert, text: string): Promise<NotifyState> {
  if (!ready) return "not_configured";
  if (!live) return "held";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [SHOP.email],
        subject: `New request ${alert.id}`,
        text,
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

async function sendSms(ready: boolean, live: boolean, text: string): Promise<NotifyState> {
  if (!ready) return "not_configured";
  if (!live) return "held";
  try {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const body = new URLSearchParams({
      To: SHOP.alertPhoneTel,
      From: process.env.TWILIO_FROM ?? "",
      Body: text,
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
