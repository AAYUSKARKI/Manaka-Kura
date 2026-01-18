import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Signal, LogOut, Moon, Sun } from "lucide-react";

interface HeaderProps {
  currentUser: { username: string };
  userStatus: "online" | "busy" | "away";
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isStatusModalOpen: boolean;
  setIsStatusModalOpen: (val: boolean) => void;
  onChangeStatus: (status: "online" | "busy" | "away") => void;
  onLogout: () => void;
}

export function Header({
  currentUser,
  userStatus,
  isDarkMode,
  setIsDarkMode,
  isStatusModalOpen,
  setIsStatusModalOpen,
  onChangeStatus,
  onLogout,
}: HeaderProps) {
  return (
    <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl p-3 sm:p-4 lg:p-6 flex justify-between items-center shadow-xl sticky top-0 z-50">
      {/* User Branding */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 bg-[var(--bg-tertiary)]/60 px-3 sm:px-5 py-2 sm:py-3 rounded-full backdrop-blur-md shadow-md border border-[var(--border)]/10">
          <div className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full status-indicator animate-pulse-border ${userStatus}`}></div>
          <span className="font-bold text-base sm:text-lg animate-glow text-[var(--text-primary)]">
            {currentUser.username}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 sm:gap-4 items-center">
        <div className="flex items-center gap-2 mr-2">
          <Switch
            checked={isDarkMode}
            onCheckedChange={setIsDarkMode}
            className="data-[state=checked]:bg-[var(--accent)]"
          />
          {isDarkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-secondary)]" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
        </div>

        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="p-2 sm:p-3 hover:bg-[var(--bg-tertiary)]/50 rounded-full transition-all hover:scale-110">
              <Signal className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-none rounded-[var(--radius-2xl)] shadow-2xl max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[var(--text-primary)] text-xl sm:text-2xl">Set Your Vibe</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 mt-4">
              {(["online", "busy", "away"] as const).map((status) => (
                <Button 
                  key={status}
                  onClick={() => onChangeStatus(status)} 
                  className="w-full justify-start gap-3 sm:gap-4 bg-[var(--bg-tertiary)]/50 hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] rounded-[var(--radius-lg)] transition-all capitalize"
                >
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full status-indicator ${status}`}></div>
                  {status}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="ghost" 
          onClick={onLogout} 
          className="p-2 sm:p-3 hover:bg-[var(--danger)]/10 rounded-full transition-all hover:scale-110"
        >
          <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--danger)]" />
        </Button>
      </div>
    </header>
  );
}