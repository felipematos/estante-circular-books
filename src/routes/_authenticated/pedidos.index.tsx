import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, ErrorBox, Loading, Shell } from "@/components/app/Shell";
import { Cover } from "@/components/app/Cover";
import { brl, ORDER_STATUS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({ meta: [{ title: "Compras e vendas · Sebo Livre" }, { name: "description", content: "Acompanhe seus pedidos." }, { property: "og:title", content: "Compras e vendas · Sebo Livre" }, { property: "og:description", content: "Acompanhe seus pedidos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Orders,
});

function Orders() {
  const { user } = useSession();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const q = useQuery({
    queryKey: ["orders", user?.id, tab], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,title,cover_path,price_cents,status,created_at,payout_status")
        .eq(tab === "buy" ? "buyer_id" : "seller_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <Shell title="Compras e vendas" back>
      <div className="mb-4 grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
        {([["buy", "Compras"], ["sell", "Vendas"]] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cn("rounded-full py-2.5 text-sm font-semibold", tab === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox message="Não foi possível carregar." onRetry={() => q.refetch()} /> : !q.data?.length ? (
        tab === "buy" ? <Empty title="Nenhuma compra ainda" action={{ to: "/", label: "Ver livros" }} /> : <Empty title="Nenhuma venda ainda" action={{ to: "/vender", label: "Anunciar um livro" }} />
      ) : (
        <ul className="grid gap-3">
          {q.data.map((o) => (
            <li key={o.id}>
              <Link to="/pedidos/$id" params={{ id: o.id }} className="flex gap-3 rounded-[20px] border border-border p-3">
                <Cover path={o.cover_path} id={o.id} alt="" className="aspect-[3/4] w-16 shrink-0 rounded-[14px]" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{o.title}</p>
                  <p className="text-sm font-bold text-foreground">{brl(o.price_cents)}</p>
                  <p className="text-xs text-muted-foreground">{ORDER_STATUS[o.status]} · {new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
