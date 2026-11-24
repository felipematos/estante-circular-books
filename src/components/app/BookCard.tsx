import { Link } from "@tanstack/react-router";
import { brl, daysLeft } from "@/lib/format";
import { Avatar, Cover } from "./Cover";
import { cn } from "@/lib/utils";

export type ListingRow = {
  id: string; title: string; author?: string; price_cents: number; weight_g: number; cover_path: string;
  seller_name: string; expires_at: string; created_at: string; seller_cep_prefix?: string;
};

export function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const d = daysLeft(expiresAt);
  const tone = d <= 7 ? "bg-background text-warning" : d >= 25 ? "bg-background text-foreground" : "bg-primary text-primary-foreground";
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>Expira em {d}d</span>;
}

export function BookCard({ l, shipping }: { l: ListingRow; shipping?: number | null }) {
  return (
    <Link to="/livro/$id" params={{ id: l.id }} className="group block focus-visible:outline-none">
      <div className="relative">
        <Cover path={l.cover_path} id={l.id} alt={`Capa de ${l.title}`} className="aspect-[3/4] rounded-[20px] ring-primary group-focus-visible:ring-2" />
        <div className="absolute left-2.5 top-2.5"><ExpiryBadge expiresAt={l.expires_at} /></div>
      </div>
      <p className="mt-2.5 text-lg font-extrabold text-foreground">{brl(l.price_cents)}</p>
      <p className="line-clamp-2 text-sm text-foreground">{l.title}</p>
      {l.author && <p className="truncate text-xs text-muted-foreground">{l.author}</p>}
      <p className="mt-0.5 text-xs font-medium text-primary">{l.weight_g}g | {shipping != null ? `Frete calculado ${brl(shipping)}` : "Frete a calcular"}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Avatar name={l.seller_name} /> {l.seller_name}</p>
    </Link>
  );
}
