import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { isTestPayments } from "@/lib/stripe";

export function Shell({ children, title, back, nav = true }: { children: ReactNode; title?: string; back?: boolean; nav?: boolean }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      {isTestPayments() && (
        <div className="bg-primary-soft px-4 py-1.5 text-center text-[11px] text-accent-foreground">
          Pagamentos em modo de teste: nenhum valor real é cobrado.
        </div>
      )}
      <main className="mx-auto w-full max-w-[480px] px-4 pb-32 pt-4">
        {title && (
          <header className="mb-5 flex items-center gap-3">
            {back && (
              <button
                type="button"
                aria-label="Voltar"
                onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
          </header>
        )}
        {children}
      </main>
      {nav && <BottomNav />}
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: { to: string; label: string } }) {
  return (
    <div className="rounded-[20px] bg-muted px-6 py-10 text-center">
      <p className="font-bold text-foreground">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && (
        <Link to={action.to} className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[20px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
