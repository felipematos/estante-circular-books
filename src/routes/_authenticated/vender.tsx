import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/app/Shell";
import { ListingForm } from "@/components/app/ListingForm";

export const Route = createFileRoute("/_authenticated/vender")({
  head: () => ({ meta: [{ title: "Novo Anúncio · Sebo Livre" }, { name: "description", content: "Anuncie um livro usado com foto da capa, preço e peso." }, { property: "og:title", content: "Novo Anúncio · Sebo Livre" }, { property: "og:description", content: "Anuncie um livro usado." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <Shell title="Novo Anúncio" back><ListingForm /></Shell>,
});
