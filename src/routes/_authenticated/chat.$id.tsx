import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, Shell } from "@/components/app/Shell";
import { useSession } from "@/lib/session";
import { errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Conversa · Sebo Livre" }, { name: "description", content: "Converse sobre o livro e o envio." }, { property: "og:title", content: "Conversa · Sebo Livre" }, { property: "og:description", content: "Converse sobre o livro." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const conv = useQuery({ queryKey: ["conversation", id], queryFn: async () => (await supabase.from("conversations").select("*").eq("id", id).maybeSingle()).data });
  const msgs = useQuery({
    queryKey: ["messages", id], refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(500);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.data?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 1000) return void toast.error("Mensagem muito longa (máx. 1000 caracteres)");
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user!.id, body: text });
    setSending(false);
    if (error) return void toast.error(errMsg(error));
    setBody("");
    msgs.refetch();
  };

  if (conv.isLoading) return <Shell title="Conversa" back><Loading /></Shell>;
  const c = conv.data;
  if (!c) return <Shell title="Conversa" back><Empty title="Conversa não encontrada" /></Shell>;
  const other = c.buyer_id === user?.id ? c.seller_name : c.buyer_name;

  return (
    <Shell title={other} back nav={false}>
      <Link to="/livro/$id" params={{ id: c.listing_id }} className="-mt-3 mb-4 block truncate text-sm font-medium text-primary">{c.listing_title}</Link>
      <div className="grid gap-2 pb-24" aria-live="polite">
        {msgs.isLoading ? <Loading /> : !msgs.data?.length ? <p className="py-10 text-center text-sm text-muted-foreground">Envie a primeira mensagem. Não compartilhe senhas ou dados de cartão.</p> :
          msgs.data.map((m) => (
            <p key={m.id} className={cn("max-w-[80%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-sm", m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
              {m.body}
            </p>
          ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="fixed inset-x-0 bottom-3 mx-auto flex w-[calc(100%-2rem)] max-w-[448px] gap-2 rounded-full border border-border bg-background p-1.5 shadow-float">
        <input aria-label="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Escreva uma mensagem" className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none" />
        <button disabled={sending || !body.trim()} aria-label="Enviar" className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button>
      </form>
    </Shell>
  );
}
