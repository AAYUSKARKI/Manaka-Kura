import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from 'react';

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
  // Load settings from localStorage
  const [usePTT, setUsePTT] = useState(() => {
    const saved = localStorage.getItem('voice_mode');
    return saved !== 'toggle'; // default to PTT
  });
  
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    const saved = localStorage.getItem('haptic_enabled');
    return saved !== 'false'; // default to enabled
  });

  const [isMicEnabled, setIsMicEnabled] = useState(false);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('voice_mode', usePTT ? 'ptt' : 'toggle');
  }, [usePTT]);

  useEffect(() => {
    localStorage.setItem('haptic_enabled', hapticEnabled ? 'true' : 'false');
  }, [hapticEnabled]);

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (hapticEnabled && 'vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[intensity]);
    }
  };

  const handleVideoToggle = () => {
    triggerHaptic('light');
    onToggleVideo();
  };

  const handleScreenToggle = () => {
    triggerHaptic('light');
    onToggleScreen();
  };

  const handleMicToggle = () => {
    triggerHaptic('medium');
    setIsMicEnabled(!isMicEnabled);
    
    // Simulate PTT event for toggle mode
    const fakeEvent = {
      type: isMicEnabled ? 'pointerup' : 'pointerdown',
      target: null,
      currentTarget: null,
    } as unknown as React.PointerEvent;
    
    onTogglePTT(fakeEvent);
  };

  const handlePTT = (e: React.PointerEvent) => {
    if (e.type === 'pointerdown') {
      triggerHaptic('heavy');
    } else if (e.type === 'pointerup') {
      triggerHaptic('light');
    }
    onTogglePTT(e);
  };

  return (
    <div className={cn(
      "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2",
      "flex items-center gap-2 sm:gap-3 z-40",
      "bg-background/90 backdrop-blur-md rounded-full",
      "p-2 sm:p-3 border shadow-2xl",
      "transition-all duration-300"
    )}>
      {/* Settings Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={cn(
              "rounded-full transition-all duration-200",
              "h-10 w-10 sm:h-12 sm:w-12",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              disabled && "opacity-50 cursor-not-allowed",
              !disabled && "hover:scale-110 active:scale-95"
            )}
            onClick={() => triggerHaptic('light')}
            title="Settings"
          >
            <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Audio Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={usePTT}
            onCheckedChange={(checked) => {
              triggerHaptic('medium');
              setUsePTT(checked);
              // Reset mic state when switching modes
              if (checked && isMicEnabled) {
                setIsMicEnabled(false);
                const fakeEvent = {
                  type: 'pointerup',
                  target: null,
                  currentTarget: null,
                } as unknown as React.PointerEvent;
                onTogglePTT(fakeEvent);
              }
            }}
          >
            Push-to-Talk Mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hapticEnabled}
            onCheckedChange={(checked) => {
              setHapticEnabled(checked);
              if (checked) triggerHaptic('medium');
            }}
          >
            Haptic Feedback
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Screen Share Button */}
      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="icon"
        onClick={handleScreenToggle}
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
        onClick={handleVideoToggle}
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

      {/* Mic Button - PTT or Toggle based on user setting */}
      {usePTT ? (
        <Button
          onPointerDown={handlePTT}
          onPointerUp={handlePTT}
          onPointerLeave={handlePTT}
          onPointerCancel={handlePTT}
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
      ) : (
        <Button
          onClick={handleMicToggle}
          disabled={disabled}
          size="icon"
          className={cn(
            "rounded-full transition-all duration-200",
            "h-14 w-14 sm:h-16 sm:w-16 shadow-xl",
            isMicEnabled 
              ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20" 
              : "bg-destructive hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "hover:scale-110 active:scale-95"
          )}
          title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicEnabled ? (
            <Mic className="h-7 w-7 sm:h-8 sm:w-8" />
          ) : (
            <MicOff className="h-7 w-7 sm:h-8 sm:w-8" />
          )}
        </Button>
      )}
    </div>
  );
}