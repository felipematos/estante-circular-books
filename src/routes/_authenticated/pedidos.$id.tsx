import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, Shell } from "@/components/app/Shell";
import { Cover } from "@/components/app/Cover";
import { OrderCheckout } from "@/components/app/OrderCheckout";
import { brl, computeFees, errMsg, ORDER_STATUS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { paymentsConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  validateSearch: (s: Record<string, unknown>): { pago?: string | undefined } => ({ pago: typeof s["pago"] === "string" ? s["pago"] : undefined }),
  head: () => ({ meta: [{ title: "Pedido · Sebo Livre" }, { name: "description", content: "Detalhes e andamento do pedido." }, { property: "og:title", content: "Pedido · Sebo Livre" }, { property: "og:description", content: "Detalhes do pedido." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrderPage,
});

const steps = ["pending_payment", "paid", "shipped", "delivered"] as const;

function OrderPage() {
  const { id } = Route.useParams();
  const { pago } = Route.useSearch();
  const { user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [tracking, setTracking] = useState("");
  const q = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data,
    refetchInterval: (query) => (pago && query.state.data?.status === "pending_payment" ? 2500 : false),
  });
  const update = async (status: string, extra?: string) => {
    const { error } = await supabase.rpc("update_order_status", { _order_id: id, _status: status, ...(extra ? { _tracking: extra } : {}) });
    if (error) return void toast.error(errMsg(error));
    toast.success("Pedido atualizado");
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const chat = async () => {
    const o = q.data!;
    const { data, error } = await supabase.rpc("start_conversation", { _listing_id: o.listing_id });
    if (error) return void toast.error(errMsg(error));
    navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  if (q.isLoading) return <Shell title="Pedido" back><Loading /></Shell>;
  const o = q.data;
  if (!o) return <Shell title="Pedido" back><Empty title="Pedido não encontrado" /></Shell>;
  const isBuyer = o.buyer_id === user?.id;
  const isSeller = o.seller_id === user?.id;
  const fees = computeFees(o.price_cents, o.gateway_fee_cents);
  const stepIdx = steps.indexOf(o.status as (typeof steps)[number]);

  return (
    <Shell title="Pedido" back>
      <div className="flex gap-3">
        <Cover path={o.cover_path} id={o.id} alt={`Capa de ${o.title}`} className="aspect-[3/4] w-24 shrink-0 rounded-[14px]" />
        <div>
          <p className="font-semibold text-foreground">{o.title}</p>
          <p className="text-xl font-extrabold text-foreground">{brl(o.price_cents)}</p>
          <p className="text-sm text-muted-foreground">{o.weight_g}g · {ORDER_STATUS[o.status]}</p>
        </div>
      </div>

      {o.status !== "cancelled" && (
        <ol className="mt-5 grid grid-cols-4 gap-1 text-center text-[11px]" aria-label="Andamento">
          {["Pagamento", "Pago", "Enviado", "Entregue"].map((l, i) => (
            <li key={l} className={cn("flex flex-col items-center gap-1", i <= stepIdx ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("grid size-7 place-items-center rounded-full", i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted")}>{i < stepIdx || (i === stepIdx && i > 0) ? <Check className="size-4" /> : i + 1}</span>
              {l}
            </li>
          ))}
        </ol>
      )}

      {isBuyer && o.status === "pending_payment" && (
        <section className="mt-6">
          {pago ? (
            <p role="status" className="rounded-[20px] bg-primary-soft p-4 text-sm text-accent-foreground">Confirmando seu pagamento… isso leva alguns segundos.</p>
          ) : !paymentsConfigured() ? (
            <p className="rounded-[20px] bg-muted p-4 text-sm text-muted-foreground">Pagamentos ainda não estão disponíveis nesta versão do app.</p>
          ) : paying ? (
            <OrderCheckout orderId={o.id} />
          ) : (
            <>
              <div className="rounded-[20px] bg-muted p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Livro</span><span className="font-semibold text-foreground">{brl(o.price_cents)}</span></div>
                <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Frete</span><span className="text-right text-foreground">{o.shipping_cents != null ? brl(o.shipping_cents) : "Sem frete padrão · combine com o vendedor"}</span></div>
              </div>
              <button onClick={() => setPaying(true)} className="mt-4 w-full rounded-full bg-primary py-4 font-bold text-primary-foreground">Pagar {brl(o.price_cents + (o.shipping_cents ?? 0))}</button>
              <button onClick={() => { if (confirm("Cancelar este pedido? O livro volta para a vitrine.")) update("cancelled"); }} className="mt-2 w-full py-3 text-sm font-semibold text-muted-foreground">Cancelar pedido</button>
            </>
          )}
        </section>
      )}

      {isSeller && (
        <section className="mt-6 rounded-[20px] bg-muted p-4 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Taxa da plataforma (20%)</span><span className="text-foreground">-{brl(fees.platform)}</span></div>
          <div className="mt-2 flex justify-between text-muted-foreground"><span>Custos do gateway de pagamento</span><span className="text-foreground">{o.gateway_fee_cents == null ? "após o pagamento" : `-${brl(o.gateway_fee_cents)}`}</span></div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-bold text-foreground">Você recebe líquido</span>
            <span className="rounded-full bg-primary px-4 py-1.5 font-bold text-primary-foreground">{o.gateway_fee_cents == null ? "até " : ""}{brl(fees.net)}</span>
          </div>
          {o.shipping_cents != null && <p className="mt-2 text-xs text-muted-foreground">+ Frete pago pelo comprador: {brl(o.shipping_cents)} (repassado a você para o envio)</p>}
          <p className="mt-2 text-xs text-muted-foreground">Repasse: {o.payout_status === "paid" ? `feito em ${new Date(o.payout_at!).toLocaleDateString("pt-BR")}` : "pendente — feito via Pix após o pagamento ser aprovado"}</p>
        </section>
      )}

      {isSeller && (o.status === "paid" || o.status === "shipped") && (
        <section className="mt-4 rounded-[20px] border border-border p-4 text-sm">
          <p className="font-bold text-foreground">Enviar para</p>
          <p className="mt-1 text-muted-foreground">{o.buyer_name}{o.buyer_phone ? ` · ${o.buyer_phone}` : ""}<br />{o.ship_street}, {o.ship_number}{o.ship_complement ? ` - ${o.ship_complement}` : ""}<br />{o.ship_district} · {o.ship_city}/{o.ship_state} · CEP {o.ship_cep}</p>
          {o.status === "paid" && (
            <div className="mt-3 flex gap-2">
              <input aria-label="Código de rastreio" value={tracking} onChange={(e) => setTracking(e.target.value.slice(0, 40))} placeholder="Código de rastreio (opcional)" className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 outline-none ring-primary focus:ring-2" />
              <button onClick={() => update("shipped", tracking)} className="rounded-full bg-primary px-4 font-semibold text-primary-foreground">Enviado</button>
            </div>
          )}
        </section>
      )}

      {o.tracking_code && <p className="mt-4 text-sm text-muted-foreground">Rastreio: <b className="text-foreground">{o.tracking_code}</b></p>}
      {isBuyer && o.status === "shipped" && <button onClick={() => update("delivered")} className="mt-4 w-full rounded-full bg-primary py-4 font-bold text-primary-foreground">Recebi o livro</button>}

      {isBuyer && o.status !== "cancelled" && (
        <button onClick={chat} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3.5 font-semibold text-foreground"><MessageSquare className="size-4" /> Falar com o vendedor</button>
      )}
      {isSeller && <Link to="/chat" className="mt-4 block text-center text-sm font-semibold text-primary">Ver conversas</Link>}
    </Shell>
  );
}
