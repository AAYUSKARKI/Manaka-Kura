// VideoToggle.tsx
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      onClick={onToggle}
      disabled={disabled}
      className={`
        rounded-full p-3 sm:p-4 shadow-md ring-1 ring-border transition-all duration-200 ease-in-out
        ${isVideoEnabled 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:shadow-lg hover:ring-primary/40'}
      `}
    >
      {isVideoEnabled ? (
        <Video className="w-5 h-5 sm:w-6 sm:h-6" />
      ) : (
        <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40 bg-background/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg ring-1 ring-border">
      {/* Video Toggle */}
      <VideoToggleButton
        isVideoEnabled={isVideoEnabled}
        onToggle={onToggleVideo}
        disabled={disabled}
      />

      {/* PTT Button */}
      <button
        onPointerDown={onTogglePTT}
        onPointerUp={onTogglePTT}
        onPointerLeave={onTogglePTT}
        onPointerCancel={onTogglePTT}
        disabled={disabled}
        className={`
          ptt-button rounded-full p-4 sm:p-5 shadow-md ring-1 ring-border transition-all duration-200 ease-out
          ${isTransmitting 
            ? 'bg-red-600 hover:bg-red-700 scale-105' 
            : 'bg-green-600 hover:bg-green-700'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:shadow-xl hover:ring-destructive/30'}
          border-2 border-border/50
        `}
        style={{
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        {isTransmitting ? (
          <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
        ) : (
          <MicOff className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        )}
      </button>
    </div>
  );
}