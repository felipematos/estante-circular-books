import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, Shell } from "@/components/app/Shell";
import { ListingForm } from "@/components/app/ListingForm";

export const Route = createFileRoute("/_authenticated/anuncios/$id/editar")({
  head: () => ({ meta: [{ title: "Editar anúncio · Sebo Livre" }, { name: "description", content: "Edite seu anúncio de livro usado." }, { property: "og:title", content: "Editar anúncio · Sebo Livre" }, { property: "og:description", content: "Edite seu anúncio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["listing-edit", id], queryFn: async () => (await supabase.from("listings").select("id,title,price_cents,weight_g,cover_path,status").eq("id", id).maybeSingle()).data });
  return (
    <Shell title="Editar anúncio" back>
      {q.isLoading ? <Loading /> : !q.data ? <Empty title="Anúncio não encontrado" /> : q.data.status === "sold" ? <Empty title="Este livro já foi vendido" text="Anúncios vendidos não podem ser editados." /> : <ListingForm initial={q.data} />}
    </Shell>
  );
}
