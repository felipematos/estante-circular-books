import { BookOpen } from "lucide-react";
import { coverUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const tints = ["bg-cover-1", "bg-cover-2", "bg-cover-3", "bg-cover-4"];
export function tintFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
}

export function Cover({ path, id, alt, className }: { path?: string | null; id: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", tintFor(id), className)}>
      {path ? (
        <img src={coverUrl(path)} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <BookOpen className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50" aria-hidden />
      )}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-ink-foreground">
      {initials}
    </span>
  );
}
