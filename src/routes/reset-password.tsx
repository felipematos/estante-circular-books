import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/app/Shell";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha · Sebo Livre" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha · Sebo Livre" },
      { property: "og:description", content: "Defina uma nova senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return void toast.error("A senha precisa de ao menos 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return void toast.error(errMsg(error));
    toast.success("Senha atualizada");
    navigate({ to: "/perfil" });
  };
  return (
    <Shell title="Nova senha" nav={false}>
      <form onSubmit={save} className="grid gap-3">
        <input type="password" autoComplete="new-password" aria-label="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} className="rounded-full bg-muted px-5 py-3.5 outline-none ring-primary focus:ring-2" />
        <button className="rounded-full bg-primary py-4 font-bold text-primary-foreground">Salvar senha</button>
      </form>
    </Shell>
  );
}
