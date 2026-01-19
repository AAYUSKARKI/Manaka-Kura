import { cn } from "@/lib/utils";
import { Monitor, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ScreenShareButton({ 
  isScreenSharing, 
  onToggle,
  disabled = false 
}: { 
  isScreenSharing: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={isScreenSharing ? "default" : "secondary"}
      size="icon"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "rounded-full transition-all duration-200",
        "h-10 w-10 sm:h-12 sm:w-12 shadow-lg",
        isScreenSharing 
          ? "bg-orange-500 hover:bg-orange-600 text-white ring-2 ring-orange-400/50" 
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:scale-110 active:scale-95"
      )}
      title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
    >
      {isScreenSharing ? (
        <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" />
      ) : (
        <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
      )}
    </Button>
  );
}
