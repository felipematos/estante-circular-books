import { createFileRoute } from "@tanstack/react-router";
import { Vitrine } from "@/components/app/Vitrine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sebo Livre · Livros usados perto de você" },
      { name: "description", content: "Encontre livros usados anunciados por leitores e sebos, com anúncios ativos por 30 dias." },
      { property: "og:title", content: "Sebo Livre · Livros usados perto de você" },
      { property: "og:description", content: "Encontre livros usados anunciados por leitores e sebos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Vitrine />,
});
