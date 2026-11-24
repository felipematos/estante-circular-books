import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, ChevronRight, LogOut, Package, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loading, Shell } from "@/components/app/Shell";
import { useSession } from "@/lib/session";
import { errMsg, maskCep } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isTestPayments } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil · Sebo Livre" }, { name: "description", content: "Seus dados de comprador e vendedor." }, { property: "og:title", content: "Perfil · Sebo Livre" }, { property: "og:description", content: "Seus dados de comprador e vendedor." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Profile,
});

const empty = { full_name: "", phone: "", account_type: "pf", document: "", store_name: "", pix_key: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" };
type Form = typeof empty;

function missing(f: Form) {
  const m: string[] = [];
  if (digits(f.phone).length < 10) m.push("telefone");
  if (digits(f.cep).length !== 8) m.push("CEP");
  if (!f.street) m.push("rua");
  if (!f.number) m.push("número");
  if (!f.city) m.push("cidade");
  if (f.state.length !== 2) m.push("UF");
  if (![11, 14].includes(digits(f.document).length)) m.push(f.account_type === "pf" ? "CPF" : "CNPJ");
  if (!f.pix_key) m.push("chave Pix");
  if (f.account_type === "pj" && !f.store_name) m.push("nome da loja");
  return m;
}
function digits(v: string) { return v.replace(/\D/g, ""); }
function validCpf(c: string) {
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}
function validCnpj(c: string) {
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n: number) => { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * w[i]!; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

const L = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("grid gap-1.5 text-sm text-muted-foreground", className)}>{label}{children}</label>
);

function Profile() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const q = useQuery({
    queryKey: ["profile-full", user?.id], enabled: !!user,
    queryFn: async () => {
      const [{ data: p, error }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
      ]);
      if (error) throw error;
      return { p, admin: !!admin };
    },
  });
  useEffect(() => { if (q.data?.p) { const { id: _i, is_seller: _s, created_at: _c, updated_at: _u, ...rest } = q.data.p; setF({ ...empty, ...rest }); } }, [q.data]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const lookupCep = async (cep: string) => {
    const d = digits(cep);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json());
      if (r.erro) return void toast.error("CEP não encontrado");
      setF((p) => ({ ...p, street: r.logradouro || p.street, district: r.bairro || p.district, city: r.localidade || p.city, state: r.uf || p.state }));
    } catch { /* manual entry still works */ }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 3) return void toast.error("Informe seu nome completo");
    const doc = digits(f.document);
    // Preview/test mode accepts fictitious documents (length still enforced) so the flow can be tried.
    if (doc && !isTestPayments() && !(f.account_type === "pf" ? validCpf(doc) : validCnpj(doc))) return void toast.error(f.account_type === "pf" ? "CPF inválido" : "CNPJ inválido");
    if (f.cep && digits(f.cep).length !== 8) return void toast.error("CEP inválido");
    if (f.state && !/^[A-Za-z]{2}$/.test(f.state)) return void toast.error("UF deve ter 2 letras");
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v).trim().slice(0, 200)])) as Form;
    clean.state = clean.state.toUpperCase();
    const { data, error } = await supabase.from("profiles").update(clean).eq("id", user!.id).select("is_seller").single();
    setSaving(false);
    if (error) return void toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["profile"] });
    q.refetch();
    if (data.is_seller) return void toast.success("Cadastro salvo. Você já pode anunciar!");
    const miss = missing(clean);
    toast.success(miss.length ? `Cadastro salvo. Para vender, falta: ${miss.join(", ")}.` : "Cadastro salvo.");
  };

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (q.isLoading) return <Shell title="Perfil"><Loading /></Shell>;
  const isSeller = q.data?.p?.is_seller;
  const input = "w-full rounded-full bg-muted px-5 py-3.5 text-base text-foreground outline-none ring-primary focus:ring-2";

  return (
    <Shell title="Perfil">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">{user?.email}</p>
      <nav className="grid gap-2">
        {[
          { to: "/meus-anuncios", label: "Meus anúncios", Icon: BookOpen },
          { to: "/pedidos", label: "Compras e vendas", Icon: Package },
          ...(q.data?.admin ? [{ to: "/admin", label: "Repasses (admin)", Icon: ShieldCheck }] : []),
        ].map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-[20px] bg-muted px-4 py-3.5 font-semibold text-foreground">
            <Icon className="size-5 text-primary" aria-hidden /> <span className="flex-1">{label}</span> <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <form onSubmit={save} className="mt-6 grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">Seus dados</h2>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isSeller ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground")}>
            {isSeller ? "Vendedor habilitado" : "Comprador"}
          </span>
        </div>
        <L label="Nome completo"><input className={input} autoComplete="name" value={f.full_name} onChange={set("full_name")} /></L>
        <L label="Telefone / WhatsApp"><input className={input} inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="(11) 90000-0000" /></L>

        <h3 className="mt-2 font-bold text-foreground">Endereço de entrega</h3>
        <L label="CEP"><input className={input} inputMode="numeric" value={f.cep} onChange={(e) => setF({ ...f, cep: maskCep(e.target.value) })} onBlur={(e) => lookupCep(e.target.value)} placeholder="00000-000" /></L>
        <L label="Rua"><input className={input} autoComplete="address-line1" value={f.street} onChange={set("street")} /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Número"><input className={input} value={f.number} onChange={set("number")} /></L>
          <L label="Complemento"><input className={input} value={f.complement} onChange={set("complement")} /></L>
        </div>
        <L label="Bairro"><input className={input} value={f.district} onChange={set("district")} /></L>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <L label="Cidade"><input className={input} value={f.city} onChange={set("city")} /></L>
          <L label="UF"><input className={input} maxLength={2} value={f.state} onChange={set("state")} /></L>
        </div>

        <h3 className="mt-2 font-bold text-foreground">Para vender</h3>
        <p className="-mt-2 text-xs text-muted-foreground">Estes dados ficam privados: compradores veem apenas seu primeiro nome ou o nome da loja.</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de vendedor">
          {[{ v: "pf", l: "Pessoa física" }, { v: "pj", l: "Loja / sebo" }].map(({ v, l }) => (
            <button key={v} type="button" role="radio" aria-checked={f.account_type === v} onClick={() => setF({ ...f, account_type: v })}
              className={cn("rounded-full border py-3 text-sm font-semibold", f.account_type === v ? "border-ink bg-ink text-ink-foreground" : "border-border text-foreground")}>{l}</button>
          ))}
        </div>
        {f.account_type === "pj" && <L label="Nome da loja"><input className={input} value={f.store_name} onChange={set("store_name")} /></L>}
        <L label={f.account_type === "pf" ? "CPF" : "CNPJ"}><input className={input} inputMode="numeric" value={f.document} onChange={set("document")} /></L>
        <L label="Chave Pix para repasses"><input className={input} value={f.pix_key} onChange={set("pix_key")} /></L>

        <button disabled={saving} className="mt-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Salvar cadastro"}</button>
      </form>

      <button type="button" onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-muted-foreground">
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
    </Shell>
  );
}
