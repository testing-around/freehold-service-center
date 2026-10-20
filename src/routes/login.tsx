import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SHOP } from "@/data/shop";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{SHOP.name}</p>
        <h1 className="display mt-2 text-5xl">Sign in</h1>
        <p className="mt-3 text-sm text-muted">
          Customers sign in so a request stays on their account. The counter uses {SHOP.email}.
        </p>
        {authEnabled ? (
          <div className="mt-6 grid gap-2">
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
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is off.</p>
        )}
      </div>
    </main>
  );
}
