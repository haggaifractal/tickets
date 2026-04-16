import { Bell, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 px-6 glass-effect border-b border-border flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center bg-input/50 backdrop-blur-sm rounded-lg border border-border px-3 py-1.5 w-full max-w-md focus-within:ring-1 focus-within:ring-ring transition-all">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input
          type="text"
          placeholder="Search tickets, assets, clients..."
          className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative hover:bg-muted/50 rounded-full">
          <Bell className="w-5 h-5 text-on-surface" />
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-background"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full border-none ring-1 ring-border shadow-sm p-0 focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-center overflow-hidden">
            <Avatar className="h-full w-full">
              <AvatarImage src={user?.photoURL || "https://github.com/shadcn.png"} alt="@user" />
              <AvatarFallback className="bg-primary/20 text-primary">
                {user?.displayName ? user.displayName.charAt(0) : "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-2" align="end">
            <div className="px-2 py-1.5 font-normal font-headline">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">
                  {user?.displayName || "Loading User..."}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:text-foreground">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer focus:text-destructive"
              onClick={() => logout()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
