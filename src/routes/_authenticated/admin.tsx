import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, Shell } from "@/components/app/Shell";
import { brl, computeFees, errMsg, ORDER_STATUS, parseCents } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Repasses · Sebo Livre" }, { name: "description", content: "Gestão de pagamentos e repasses." }, { property: "og:title", content: "Repasses · Sebo Livre" }, { property: "og:description", content: "Gestão de repasses." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Admin,
});

function Admin() {
  const { user } = useSession();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-orders", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (!isAdmin) return null;
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <Shell title="Repasses" back><Loading /></Shell>;
  if (!q.data) return <Shell title="Repasses" back><Empty title="Acesso restrito" text="Esta área é só para a administração do app." /></Shell>;
  const paid = q.data.filter((o) => o.status !== "pending_payment" && o.status !== "cancelled");
  const commission = paid.reduce((s, o) => s + o.platform_fee_cents, 0);
  const owed = paid.filter((o) => o.payout_status === "pending").reduce((s, o) => s + computeFees(o.price_cents, o.gateway_fee_cents).net, 0);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  return (
    <Shell title="Repasses" back>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] bg-primary-soft p-4"><p className="text-xs text-accent-foreground">Comissão (20%)</p><p className="text-lg font-extrabold text-foreground">{brl(commission)}</p></div>
        <div className="rounded-[20px] bg-muted p-4"><p className="text-xs text-muted-foreground">A repassar</p><p className="text-lg font-extrabold text-foreground">{brl(owed)}</p></div>
      </div>
      <ul className="mt-5 grid gap-3">
        {q.data.map((o) => <AdminRow key={o.id} o={o} onDone={refresh} />)}
      </ul>
    </Shell>
  );
}

function AdminRow({ o, onDone }: { o: any; onDone: () => void }) {
  const [fee, setFee] = useState(o.gateway_fee_cents != null ? (o.gateway_fee_cents / 100).toFixed(2).replace(".", ",") : "");
  const [pix, setPix] = useState<string | null>(null);
  const fees = computeFees(o.price_cents, fee ? parseCents(fee) : o.gateway_fee_cents);
  const run = async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; if (error) return void toast.error(errMsg(error)); toast.success("Atualizado"); onDone(); };
  const showPix = async () => {
    const { data, error } = await supabase.rpc("admin_payout_info", { _seller_id: o.seller_id });
    if (error) return void toast.error(errMsg(error));
    const r = data?.[0];
    setPix(r ? `${r.store_name || r.full_name} · ${r.document} · Pix: ${r.pix_key}` : "Sem dados");
  };
  return (
    <li className="rounded-[20px] border border-border p-4 text-sm">
      <div className="flex justify-between gap-2"><p className="truncate font-semibold text-foreground">{o.title}</p><p className="font-bold text-foreground">{brl(o.price_cents)}</p></div>
      <p className="text-xs text-muted-foreground">{ORDER_STATUS[o.status]} · {new Date(o.created_at).toLocaleDateString("pt-BR")} · repasse {o.payout_status === "paid" ? "feito" : "pendente"}</p>
      <p className="mt-2 text-muted-foreground">Comissão {brl(fees.platform)} · Líquido vendedor <b className="text-foreground">{brl(fees.net)}</b></p>
      {o.status === "pending_payment" && <button onClick={() => run(supabase.rpc("update_order_status", { _order_id: o.id, _status: "paid" }))} className="mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Marcar como pago (manual)</button>}
      {o.payout_status === "pending" && o.status !== "pending_payment" && o.status !== "cancelled" && (
        <div className="mt-3 grid gap-2">
          <button onClick={showPix} className="justify-self-start text-xs font-semibold text-primary">Ver dados de repasse</button>
          {pix && <p className="rounded-xl bg-muted p-2 text-xs text-foreground">{pix}</p>}
          <div className="flex gap-2">
            <input aria-label="Custo real do gateway (R$)" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Custo gateway R$" className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2 outline-none ring-primary focus:ring-2" />
            <button onClick={() => run(supabase.rpc("mark_payout", { _order_id: o.id, _gateway_fee_cents: parseCents(fee) }))} className="rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground">Repasse feito</button>
          </div>
        </div>
      )}
    </li>
  );
}
