import { Link } from "@tanstack/react-router";
import { Home, Search, SquarePlus, MessageSquare, User } from "lucide-react";

const items = [
  { to: "/", label: "Início", Icon: Home, exact: true },
  { to: "/buscar", label: "Buscar", Icon: Search },
  { to: "/vender", label: "Vender", Icon: SquarePlus },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
  { to: "/perfil", label: "Perfil", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-3 z-40 mx-auto w-[calc(100%-2rem)] max-w-[420px]">
      <ul className="flex items-center justify-between rounded-full border border-border bg-background p-1.5 shadow-float">
        {items.map(({ to, label, Icon, ...rest }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:bg-primary-soft data-[status=active]:text-primary"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
