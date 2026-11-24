import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, Shell } from "@/components/app/Shell";
import { Avatar, Cover } from "@/components/app/Cover";
import { ExpiryBadge } from "@/components/app/BookCard";
import { brl, errMsg } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/livro/$id")({
  head: () => ({
    meta: [
      { title: "Livro usado à venda · Sebo Livre" },
      { name: "description", content: "Veja preço, peso e vendedor deste livro usado." },
      { property: "og:title", content: "Livro usado à venda · Sebo Livre" },
      { property: "og:description", content: "Veja preço, peso e vendedor deste livro usado." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"buy" | "chat" | null>(null);
  const q = useQuery({
    queryKey: ["listing", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const requireLogin = () => {
    if (user) return false;
    navigate({ to: "/auth", search: { redirect: `/livro/${id}` } });
    return true;
  };
  const buy = async () => {
    if (requireLogin()) return;
    setBusy("buy");
    const { data, error } = await supabase.rpc("create_order", { _listing_id: id });
    setBusy(null);
    if (error) {
      toast.error(errMsg(error));
      if (error.message.includes("endereço")) navigate({ to: "/perfil" });
      return;
    }
    navigate({ to: "/pedidos/$id", params: { id: data as string } });
  };
  const chat = async () => {
    if (requireLogin()) return;
    setBusy("chat");
    const { data, error } = await supabase.rpc("start_conversation", { _listing_id: id });
    setBusy(null);
    if (error) return void toast.error(errMsg(error));
    navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  if (q.isLoading) return <Shell title="Livro" back><Loading /></Shell>;
  const l = q.data;
  if (!l) return <Shell title="Livro" back><Empty title="Anúncio indisponível" text="Este livro foi vendido ou o anúncio expirou." action={{ to: "/", label: "Ver outros livros" }} /></Shell>;
  const own = user?.id === l.seller_id;
  const available = l.status === "active" && new Date(l.expires_at) > new Date();

  return (
    <Shell title="Livro" back>
      <div className="relative">
        <Cover path={l.cover_path} id={l.id} alt={`Capa de ${l.title}`} className="mx-auto aspect-[3/4] w-full max-w-[320px] rounded-[20px]" />
        {available && <div className="absolute left-3 top-3"><ExpiryBadge expiresAt={l.expires_at} /></div>}
      </div>
      <p className="mt-5 text-3xl font-extrabold text-foreground">{brl(l.price_cents)}</p>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{l.title}</h2>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Avatar name={l.seller_name} /> Vendido por {l.seller_name}</p>

      <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-muted p-4 text-sm">
        <Truck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-semibold text-foreground">{l.weight_g}g</p>
          <p className="text-muted-foreground">Cotação de frete ainda indisponível. Após a compra, combine o envio com o vendedor pelo chat.</p>
        </div>
      </div>

      {own ? (
        <div className="mt-6 grid gap-3">
          <Link to="/anuncios/$id/editar" params={{ id: l.id }} className="rounded-full bg-primary py-4 text-center font-bold text-primary-foreground">Editar anúncio</Link>
          <Link to="/meus-anuncios" className="text-center text-sm font-semibold text-primary">Ver meus anúncios</Link>
        </div>
      ) : available ? (
        <div className="mt-6 grid gap-3">
          <button disabled={!!busy} onClick={buy} className="rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:opacity-60">
            {busy === "buy" ? "Reservando…" : "Comprar"}
          </button>
          <button disabled={!!busy} onClick={chat} className="flex items-center justify-center gap-2 rounded-full border border-border py-3.5 font-semibold text-foreground disabled:opacity-60">
            <MessageSquare className="size-4" aria-hidden /> {busy === "chat" ? "Abrindo…" : "Conversar com o vendedor"}
          </button>
        </div>
      ) : (
        <p className="mt-6 rounded-[20px] bg-muted p-4 text-center text-sm text-muted-foreground">Este livro não está mais disponível.</p>
      )}
    </Shell>
  );
}
