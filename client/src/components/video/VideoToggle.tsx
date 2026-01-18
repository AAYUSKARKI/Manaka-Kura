import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

export function VideoToggleButton({ 
  isVideoEnabled, 
  onToggle,
  disabled = false 
}: { 
  isVideoEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={isVideoEnabled ? "default" : "secondary"}
      size="icon"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "rounded-full transition-all duration-200",
        isVideoEnabled ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-muted-foreground",
        "h-10 w-10 sm:h-12 sm:w-12" // Fixed controlled sizing
      )}
    >
      {isVideoEnabled ? (
        <Video className="h-5 w-5 sm:h-6 sm:w-6" />
      ) : (
        <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
      )}
    </Button>
  );
}

export function PTTControls({
  isTransmitting,
  isVideoEnabled,
  onTogglePTT,
  onToggleVideo,
  disabled = false
}: {
  isTransmitting: boolean;
  isVideoEnabled: boolean;
  onTogglePTT: (e: React.PointerEvent) => void;
  onToggleVideo: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 z-40 bg-background/90 backdrop-blur-md rounded-full p-2 border shadow-2xl">
      {/* Video Toggle */}
      <VideoToggleButton
        isVideoEnabled={isVideoEnabled}
        onToggle={onToggleVideo}
        disabled={disabled}
      />

      {/* PTT Button - Pure shadcn Button with Pointer Events */}
      <Button
        onPointerDown={onTogglePTT}
        onPointerUp={onTogglePTT}
        onPointerLeave={onTogglePTT}
        onPointerCancel={onTogglePTT}
        disabled={disabled}
        size="icon"
        className={cn(
          "rounded-full transition-all duration-150 ease-in-out select-none touch-none",
          "h-14 w-14 sm:h-16 sm:w-16 shadow-lg", // Controlled scaling
          isTransmitting 
            ? "bg-destructive hover:bg-destructive scale-110" 
            : "bg-green-600 hover:bg-green-700"
        )}
        style={{
          touchAction: 'none',
        }}
      >
        {isTransmitting ? (
          <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
        ) : (
          <MicOff className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        )}
      </Button>
    </div>
  );
}