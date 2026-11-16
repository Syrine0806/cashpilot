import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { ThemeToggle } from "../theme/theme-toggle";
import { Avatar } from "../ui/avatar";

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="truncate text-xs text-nav-muted">{email}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="grid size-8 place-items-center rounded-lg text-nav-muted transition-colors hover:bg-nav-raised hover:text-white" title="Se déconnecter">
            <LogOut className="size-4" aria-hidden />
            <span className="sr-only">Se déconnecter</span>
          </button>
        </form>
      </div>
      <ThemeToggle />
    </div>
  );
}
