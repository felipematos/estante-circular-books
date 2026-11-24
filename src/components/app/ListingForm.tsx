import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, CircleCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { brl, computeFees, coverUrl, errMsg } from "@/lib/format";
import { prepareCover } from "@/lib/image";
import { Loading } from "./Shell";

type Initial = { id: string; title: string; price_cents: number; weight_g: number; cover_path: string };

export function ListingForm({ initial }: { initial?: Initial }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cents, setCents] = useState(initial?.price_cents ?? 0);
  const [weight, setWeight] = useState(initial ? String(initial.weight_g) : "");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(initial ? coverUrl(initial.cover_path) : null);
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("is_seller").eq("id", user!.id).maybeSingle()).data,
  });
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = async (f?: File) => {
    if (!f) return;
    setProcessing(true);
    try {
      const b = await prepareCover(f);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      setErrors((e) => ({ ...e, cover: "" }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fees = computeFees(cents);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseInt(weight, 10);
    const errs: Record<string, string> = {};
    if (!preview) errs["cover"] = "Fotografe a capa do livro";
    if (title.trim().length < 2) errs["title"] = "Informe o título do livro";
    if (cents < 100) errs["price"] = "O preço mínimo é R$ 1,00";
    if (cents > 1_000_000) errs["price"] = "O preço máximo é R$ 10.000,00";
    if (!w || w < 20 || w > 10000) errs["weight"] = "Informe o peso entre 20 g e 10.000 g";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      let cover_path = initial?.cover_path ?? "";
      if (blob) {
        cover_path = `${user!.id}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("covers").upload(cover_path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
      }
      const values = { title: title.trim(), price_cents: cents, weight_g: w, cover_path };
      const res = initial
        ? await supabase.from("listings").update(values).eq("id", initial.id).select("id").single()
        : await supabase.from("listings").insert({ ...values, seller_id: user!.id }).select("id").single();
      if (res.error) throw res.error;
      if (blob && initial?.cover_path) await supabase.storage.from("covers").remove([initial.cover_path]);
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(initial ? "Anúncio atualizado" : "Anúncio publicado! Ele fica ativo por 30 dias.");
      navigate({ to: "/livro/$id", params: { id: res.data.id } });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (profile.isLoading) return <Loading />;
  if (!initial && profile.data && !profile.data.is_seller) {
    return (
      <div className="rounded-[20px] bg-muted p-6 text-center">
        <p className="font-bold text-foreground">Complete seu cadastro de vendedor</p>
        <p className="mt-1 text-sm text-muted-foreground">Precisamos de CPF ou CNPJ, telefone, endereço e chave Pix para repassar suas vendas.</p>
        <Link to="/perfil" className="mt-4 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Completar cadastro</Link>
      </div>
    );
  }

  const field = "w-full rounded-full bg-muted px-5 py-4 text-base text-foreground outline-none ring-primary focus:bg-background focus:ring-2";
  const Err = ({ k }: { k: string }) => (errors[k] ? <p role="alert" className="mt-1.5 text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex gap-4 rounded-[20px] border-2 border-dashed border-border p-3.5">
        <div className="relative aspect-[3/4] w-[42%] overflow-hidden rounded-[14px] bg-cover-1">
          {preview ? <img src={preview} alt="Capa fotografada" className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-xs tracking-[0.2em] text-muted-foreground">CAPA</span>}
          {processing && <span className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="size-5 animate-spin text-primary" /></span>}
        </div>
        <div className="flex flex-col justify-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Fotografar capa" className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Camera className="size-5" aria-hidden />
          </button>
          <p className="font-bold text-foreground">Fotografar capa</p>
          {preview && (
            <button type="button" onClick={() => fileRef.current?.click()} className="self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground">Refazer foto</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <Err k="cover" />

      <label className="mt-6 block text-sm text-muted-foreground" htmlFor="title">Título do livro</label>
      <input id="title" className={`${field} mt-2`} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Torto Arado — Itamar Vieira Junior" />
      <Err k="title" />

      <label className="mt-6 block text-sm text-muted-foreground" htmlFor="price">Preço de venda (R$)</label>
      <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-primary px-5 py-3.5">
        <span className="text-muted-foreground">R$</span>
        <input id="price" inputMode="numeric" className="w-full bg-transparent text-lg font-bold text-foreground outline-none"
          value={cents ? (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
          onChange={(e) => setCents(Math.min(1_000_000, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)))} placeholder="0,00" />
      </div>
      <Err k="price" />

      <div className="mt-3 rounded-[20px] bg-muted p-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Taxa da plataforma (20%)</span><span className="text-foreground">-{brl(fees.platform)}</span></div>
        <div className="mt-2.5 flex justify-between gap-3 text-muted-foreground"><span>Custos do gateway de pagamento</span><span className="text-right text-foreground">conforme a tarifa real</span></div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-bold text-foreground">Você recebe líquido</span>
          <span className="rounded-full bg-primary px-4 py-1.5 font-bold text-primary-foreground">até {brl(fees.net)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">O custo do gateway é descontado do líquido quando o pagamento é aprovado; você vê o valor exato no pedido.</p>
      </div>

      <label className="mt-6 block text-sm text-muted-foreground" htmlFor="weight">Peso do livro (g)</label>
      <div className="mt-2 flex items-center rounded-full bg-muted px-5 py-4 ring-primary focus-within:ring-2">
        <input id="weight" inputMode="numeric" className="w-full bg-transparent text-base text-foreground outline-none" value={weight} onChange={(e) => setWeight(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="340" />
        <span className="text-muted-foreground">g</span>
      </div>
      <Err k="weight" />

      <p className="mt-4 flex gap-2.5 rounded-[20px] bg-primary-soft p-4 text-sm text-accent-foreground">
        <CircleCheck className="size-5 shrink-0" aria-hidden />
        Seu anúncio ficará ativo por 30 dias na busca, com renovação em 1 clique.
      </p>

      <button disabled={busy || processing} className="mt-5 w-full rounded-full bg-primary py-4.5 text-lg font-bold text-primary-foreground disabled:opacity-60" style={{ paddingBlock: "1.1rem" }}>
        {busy ? "Publicando…" : initial ? "Salvar alterações" : "Publicar Anúncio"}
      </button>
    </form>
  );
}
