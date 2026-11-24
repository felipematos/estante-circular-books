import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ChevronDown, Clock, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookCard, type ListingRow } from "./BookCard";
import { Empty, ErrorBox, Shell } from "./Shell";
import { maskCep } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Sort = "perto" | "preco" | "recentes";
const CEP_KEY = "sebo:cep";

export function Vitrine({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<Sort>("perto");
  const [cep, setCep] = useState("");
  const [editingCep, setEditingCep] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCep(localStorage.getItem(CEP_KEY) ?? "");
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["listings", debounced, sort],
    queryFn: async () => {
      let req = supabase
        .from("listings")
        .select("id,title,author,price_cents,weight_g,cover_path,seller_name,expires_at,created_at,seller_cep_prefix")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(60);
      if (debounced) { const t = debounced.replace(/[%_,()*.]/g, " "); req = req.or(`title.ilike.%${t}%,author.ilike.%${t}%`); }
      req = sort === "preco" ? req.order("price_cents", { ascending: true }) : req.order("created_at", { ascending: false });
      const { data, error } = await req;
      if (error) throw error;
      return data as ListingRow[];
    },
  });

  const items = useMemo(() => {
    const list = query.data ?? [];
    const mine = cep.replace(/\D/g, "");
    if (sort !== "perto" || mine.length < 5) return list;
    const score = (p = "") => { let i = 0; while (i < 5 && p[i] === mine[i]) i++; return i; };
    return [...list].sort((a, b) => score(b.seller_cep_prefix) - score(a.seller_cep_prefix));
  }, [query.data, sort, cep]);

  const chips: { id: Sort; label: string; Icon: typeof MapPin }[] = [
    { id: "perto", label: "Perto de você", Icon: MapPin },
    { id: "preco", label: "Menor preço", Icon: ArrowDown },
    { id: "recentes", label: "Recém-anunciados", Icon: Clock },
  ];

  return (
    <Shell>
      <label className="flex items-center gap-3 rounded-full bg-muted px-5 py-3.5">
        <Search className="size-5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Buscar livros</span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="O que você quer ler hoje?"
          className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <MapPin className="size-4 text-primary" aria-hidden />
        <span className="text-muted-foreground">Entregar em:</span>
        {editingCep ? (
          <form
            onSubmit={(e) => { e.preventDefault(); localStorage.setItem(CEP_KEY, cep); setEditingCep(false); }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus inputMode="numeric" aria-label="CEP de entrega" value={cep}
              onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000"
              className="w-28 rounded-full border border-border px-3 py-1 font-bold outline-none focus:border-primary"
            />
            <button className="text-sm font-semibold text-primary">OK</button>
          </form>
        ) : (
          <button type="button" onClick={() => setEditingCep(true)} className="flex items-center gap-1 font-bold text-foreground">
            {cep || "informe o CEP"} <ChevronDown className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Ordenar">
        {chips.map(({ id, label, Icon }) => (
          <button
            key={id} type="button" role="radio" aria-checked={sort === id} onClick={() => setSort(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium",
              sort === id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-background text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <section className="mt-5" aria-live="polite">
        {query.isLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />)}
          </div>
        ) : query.isError ? (
          <ErrorBox message="Não foi possível carregar os anúncios." onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <Empty
            title={debounced ? `Nenhum livro para “${debounced}”` : "Nenhum livro anunciado ainda"}
            text={debounced ? "Tente outro título ou palavra." : "Seja o primeiro a anunciar um livro usado."}
            action={{ to: "/vender", label: "Anunciar um livro" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">{items.map((l) => <BookCard key={l.id} l={l} />)}</div>
        )}
      </section>
    </Shell>
  );
}
