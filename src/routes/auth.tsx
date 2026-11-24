import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Shell } from "@/components/app/Shell";
import { useSession } from "@/lib/session";
import { errMsg } from "@/lib/format";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/perfil");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({ redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta · Sebo Livre" },
      { name: "description", content: "Entre para comprar e vender livros usados." },
      { property: "og:title", content: "Entrar · Sebo Livre" },
      { property: "og:description", content: "Entre para comprar e vender livros usados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").max(72),
  name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem("sebo:redirect");
      navigate({ to: safe(redirect ?? sessionStorage.getItem("sebo:redirect") ?? undefined), replace: true });
    }
  }, [user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) return void toast.error(p.error.issues[0]?.message ?? "Dados inválidos");
    if (mode === "up" && (form.name.trim().length < 3)) return void toast.error("Informe seu nome completo");
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.password })
      : await supabase.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: window.location.origin, data: { full_name: form.name.trim() } } });
    setBusy(false);
    if (res.error) return void toast.error(res.error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : errMsg(res.error));
    if (mode === "up" && !res.data.session) setSent(true);
  };

  const social = async (provider: "google" | "lovable") => {
    if (redirect) sessionStorage.setItem("sebo:redirect", redirect);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar. Tente novamente.");
  };

  const forgot = async () => {
    const email = form.email.trim();
    if (!z.string().email().safeParse(email).success) return void toast.error("Digite seu e-mail acima primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return void toast.error(errMsg(error));
    toast.success("Enviamos um link para redefinir sua senha.");
  };

  if (sent) {
    return (
      <Shell title="Confirme seu e-mail" nav={false}>
        <p className="text-muted-foreground">Enviamos um link de confirmação para <b className="text-foreground">{form.email}</b>. Abra-o para ativar sua conta.</p>
      </Shell>
    );
  }

  const input = "w-full rounded-full bg-muted px-5 py-3.5 text-base text-foreground outline-none ring-primary focus:ring-2";
  return (
    <Shell title={mode === "in" ? "Entrar" : "Criar conta"} back>
      <p className="-mt-2 mb-5 text-sm text-muted-foreground">Uma conta serve para comprar e vender.</p>
      <div className="grid gap-3">
        <button type="button" onClick={() => social("google")} className="flex items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-[#FFFFFF] py-3 text-sm font-medium text-[#1F1F1F]">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </button>
        <button type="button" onClick={() => social("lovable")} className="flex items-center justify-center gap-2.5 rounded-full border border-border py-3 text-sm font-medium text-foreground">
          <LovableMark className="size-[18px]" /> Continue with Lovable
        </button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou com e-mail<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="grid gap-3">
        {mode === "up" && (
          <label className="grid gap-1.5 text-sm text-muted-foreground">Nome completo
            <input className={input} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
        )}
        <label className="grid gap-1.5 text-sm text-muted-foreground">E-mail
          <input className={input} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="grid gap-1.5 text-sm text-muted-foreground">Senha
          <input className={input} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button disabled={busy} className="mt-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      {mode === "in" && <button type="button" onClick={forgot} className="mt-3 w-full text-sm text-muted-foreground underline">Esqueci minha senha</button>}
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm font-semibold text-primary">
        {mode === "in" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </Shell>
  );
}
