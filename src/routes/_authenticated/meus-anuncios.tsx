import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, ErrorBox, Loading, Shell } from "@/components/app/Shell";
import { Cover } from "@/components/app/Cover";
import { brl, daysLeft, errMsg } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/meus-anuncios")({
  head: () => ({ meta: [{ title: "Meus anúncios · Sebo Livre" }, { name: "description", content: "Renove, edite ou pause seus anúncios." }, { property: "og:title", content: "Meus anúncios · Sebo Livre" }, { property: "og:description", content: "Gerencie seus anúncios." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Mine,
});

function Mine() {
  const { user } = useSession();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-listings", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const act = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    const { error } = await fn();
    if (error) return void toast.error(errMsg(error));
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["listings"] });
  };

  return (
    <Shell title="Meus anúncios" back>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox message="Não foi possível carregar." onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <Empty title="Você ainda não anunciou" text="Fotografe a capa, informe preço e peso e pronto." action={{ to: "/vender", label: "Anunciar um livro" }} />
      ) : (
        <ul className="grid gap-3">
          {q.data.map((l) => {
            const expired = new Date(l.expires_at) <= new Date();
            const label = l.status === "sold" ? "Vendido" : l.status === "paused" ? "Pausado" : expired ? "Expirado" : `Expira em ${daysLeft(l.expires_at)}d`;
            return (
              <li key={l.id} className="flex gap-3 rounded-[20px] border border-border p-3">
                <Link to="/livro/$id" params={{ id: l.id }} className="w-20 shrink-0"><Cover path={l.cover_path} id={l.id} alt="" className="aspect-[3/4] rounded-[14px]" /></Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{l.title}</p>
                  <p className="text-sm font-bold text-foreground">{brl(l.price_cents)} <span className="font-normal text-muted-foreground">· {l.weight_g}g</span></p>
                  <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", l.status === "active" && !expired ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground", expired && l.status === "active" && "text-warning")}>{label}</span>
                  {l.status !== "sold" && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <button onClick={() => act(() => supabase.rpc("renew_listing", { _id: l.id }), "Renovado por mais 30 dias")} className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">Renovar 30 dias</button>
                      <Link to="/anuncios/$id/editar" params={{ id: l.id }} className="rounded-full border border-border px-3 py-1.5 text-foreground">Editar</Link>
                      <button onClick={() => act(() => supabase.from("listings").update({ status: l.status === "paused" ? "active" : "paused" }).eq("id", l.id), l.status === "paused" ? "Anúncio reativado" : "Anúncio pausado")} className="rounded-full border border-border px-3 py-1.5 text-foreground">{l.status === "paused" ? "Reativar" : "Pausar"}</button>
                      <button onClick={() => { if (confirm("Excluir este anúncio?")) act(() => supabase.from("listings").delete().eq("id", l.id), "Anúncio excluído"); }} className="rounded-full px-3 py-1.5 text-destructive">Excluir</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
