import { createFileRoute } from "@tanstack/react-router";
import { Vitrine } from "@/components/app/Vitrine";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar livros usados · Sebo Livre" },
      { name: "description", content: "Pesquise livros usados por título entre os anúncios ativos." },
      { property: "og:title", content: "Buscar livros usados · Sebo Livre" },
      { property: "og:description", content: "Pesquise livros usados por título." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Vitrine autoFocus />,
});
