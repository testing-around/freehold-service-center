import assert from "node:assert/strict";
import test from "node:test";
import { buildContactLinks, contactRequestSchema, normalizeUsPhone } from "./contact-request.ts";

const draft = {
  name: "Test Customer",
  phone: "(202) 555-0143",
  email: "",
  reply: "call" as const,
  vehicle: "2018 Toyota Camry",
  message: "Please discuss a brake inspection.",
};
const shop = {
  name: "Freehold Service Center",
  phoneTel: "+17323330886",
  email: "freeholdservicecenter@gmail.com",
};

test("accepts U.S. formatting and rejects invalid callback numbers", () => {
  assert.equal(normalizeUsPhone("(202) 555-0143"), "+12025550143");
  assert.equal(normalizeUsPhone("+1 202 555 0143"), "+12025550143");
  assert.equal(normalizeUsPhone("123"), null);
  assert.equal(contactRequestSchema.safeParse({ ...draft, phone: "123" }).success, false);
});

test("email is optional for phone replies and required for email replies", () => {
  assert.equal(contactRequestSchema.safeParse(draft).success, true);
  assert.equal(contactRequestSchema.safeParse({ ...draft, reply: "email" }).success, false);
  assert.equal(
    contactRequestSchema.safeParse({ ...draft, reply: "email", email: "customer@example.com" })
      .success,
    true,
  );
  assert.equal(contactRequestSchema.safeParse({ ...draft, email: "not-an-email" }).success, false);
});

test("each reply preference reaches the shop with the correct contact details", () => {
  for (const reply of ["call", "whatsapp", "email"] as const) {
    const request = contactRequestSchema.parse({
      ...draft,
      reply,
      email: reply === "email" ? "customer@example.com" : "",
    });
    const links = buildContactLinks(request, shop);
    const whatsapp = new URL(links.whatsapp);
    assert.equal(whatsapp.origin, "https://wa.me");
    assert.equal(whatsapp.pathname, "/17323330886");
    const message = whatsapp.searchParams.get("text")!;
    assert.match(message, /Test Customer/);
    assert.match(message, /\+12025550143/);
    assert.match(
      message,
      reply === "call"
        ? /Please call me back/
        : reply === "whatsapp"
          ? /Please reply on WhatsApp/
          : /Please email me at customer@example.com/,
    );
    const email = new URL(links.email);
    assert.equal(email.protocol, "mailto:");
    assert.equal(email.pathname, shop.email);
    assert.equal(email.searchParams.get("body"), message);
  }
});

test("customer punctuation stays inside the message and cannot alter recipients", () => {
  const request = contactRequestSchema.parse({
    ...draft,
    name: "A & B",
    message: "Noise? A&B #brakes + check",
  });
  const links = buildContactLinks(request, shop);
  assert.match(new URL(links.whatsapp).searchParams.get("text")!, /Noise\? A&B #brakes \+ check/);
  assert.equal(new URL(links.email).searchParams.has("bcc"), false);
  assert.equal(
    contactRequestSchema.safeParse({ ...draft, name: "Name\r\nBcc: stranger@example.com" }).success,
    false,
  );
});
