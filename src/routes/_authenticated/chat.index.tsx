import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empty, ErrorBox, Loading, Shell } from "@/components/app/Shell";
import { Avatar } from "@/components/app/Cover";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({ meta: [{ title: "Chat · Sebo Livre" }, { name: "description", content: "Conversas com compradores e vendedores." }, { property: "og:title", content: "Chat · Sebo Livre" }, { property: "og:description", content: "Suas conversas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChatList,
});

function ChatList() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["conversations", user?.id], enabled: !!user, refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <Shell title="Chat">
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox message="Não foi possível carregar." onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <Empty title="Nenhuma conversa" text="Abra um livro e toque em “Conversar com o vendedor”." action={{ to: "/", label: "Ver livros" }} />
      ) : (
        <ul className="divide-y divide-border">
          {q.data.map((c) => {
            const other = c.buyer_id === user?.id ? c.seller_name : c.buyer_name;
            return (
              <li key={c.id}>
                <Link to="/chat/$id" params={{ id: c.id }} className="flex items-center gap-3 py-3.5">
                  <Avatar name={other} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{other}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.listing_title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString("pt-BR")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
