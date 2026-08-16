import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { VinylMark } from "@/components/machine/Mark";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex justify-center">
          <span className="relative inline-flex size-14 items-center justify-center">
            <span className="spectrum-ring absolute inset-0 rounded-full" />
            <span className="absolute inset-0.5 rounded-full bg-bg" />
            <VinylMark className="relative size-12" />
          </span>
        </div>
        <div className="text-center">
          <p className="font-display text-xl tracking-wide">{BRAND.name.toUpperCase()}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Optional. The kit runs on this device either way.
          </p>
        </div>
        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="panel"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted">Sign-in is disabled.</p>
        )}
        <div className="text-center">
          <Link to="/" className="inline-block text-sm text-muted hover:text-fg">
            Back to the kit
          </Link>
        </div>
      </div>
    </main>
  );
}
