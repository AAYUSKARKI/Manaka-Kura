import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

interface ControlBarProps {
  isTransmitting: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onTogglePTT: (e: React.PointerEvent) => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  disabled?: boolean;
}

export function EnhancedControlBar({
  isTransmitting,
  isVideoEnabled,
  isScreenSharing,
  onTogglePTT,
  onToggleVideo,
  onToggleScreen,
  disabled = false
}: ControlBarProps) {
  return (
    <div className={cn(
      "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2",
      "flex items-center gap-2 sm:gap-3 z-40",
      "bg-background/90 backdrop-blur-md rounded-full",
      "p-2 sm:p-3 border shadow-2xl",
      "transition-all duration-300"
    )}>
      {/* Screen Share Button */}
      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="icon"
        onClick={onToggleScreen}
        disabled={disabled}
        className={cn(
          "rounded-full transition-all duration-200",
          "h-10 w-10 sm:h-12 sm:w-12",
          isScreenSharing 
            ? "bg-orange-500 hover:bg-orange-600 text-white ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
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

      {/* Video Toggle Button */}
      <Button
        variant={isVideoEnabled ? "default" : "secondary"}
        size="icon"
        onClick={onToggleVideo}
        disabled={disabled}
        className={cn(
          "rounded-full transition-all duration-200",
          "h-10 w-10 sm:h-12 sm:w-12",
          isVideoEnabled 
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:scale-110 active:scale-95"
        )}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <Video className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>

      {/* PTT Button - Main action */}
      <Button
        onPointerDown={onTogglePTT}
        onPointerUp={onTogglePTT}
        onPointerLeave={onTogglePTT}
        onPointerCancel={onTogglePTT}
        disabled={disabled}
        size="icon"
        className={cn(
          "rounded-full transition-all duration-150 ease-in-out select-none touch-none",
          "h-14 w-14 sm:h-16 sm:w-16 shadow-xl",
          isTransmitting 
            ? "bg-destructive hover:bg-destructive scale-110 shadow-red-500/30 ring-4 ring-red-500/20" 
            : "bg-green-600 hover:bg-green-700 shadow-green-500/30",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !isTransmitting && "hover:scale-105 active:scale-100"
        )}
        style={{ touchAction: 'none' }}
        title={isTransmitting ? "Release to stop" : "Hold to talk"}
      >
        {isTransmitting ? (
          <Mic className="h-7 w-7 sm:h-8 sm:w-8 text-white animate-pulse" />
        ) : (
          <MicOff className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
        )}
      </Button>
    </div>
  );
}