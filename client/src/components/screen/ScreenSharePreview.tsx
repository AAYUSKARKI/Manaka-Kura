import { useEffect, useRef, useState } from "react";
import { Monitor, X, Maximize2, Minimize2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";


// ScreenSharePreview - Bottom-left preview of your own screen share with toggle
export function ScreenSharePreview({ 
  screenStream, 
  username,
  onStop
}: { 
  screenStream: MediaStream | null;
  username: string;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      console.log('[ScreenSharePreview] Setting screen stream');
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(err => {
        console.error('[ScreenSharePreview] Failed to play screen:', err);
      });
    }
  }, [screenStream]);

  if (!screenStream) return null;

  // If hidden completely, show a small indicator button
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={cn(
          "fixed bottom-24 left-4 z-50",
          "bg-orange-500 hover:bg-orange-600 text-white",
          "p-4 rounded-2xl shadow-2xl shadow-orange-500/30",
          "transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "animate-in fade-in-0 slide-in-from-left-5 duration-500",
          "ring-4 ring-orange-500/20"
        )}
        title="Show screen preview"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Monitor className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
          </div>
          <span className="text-sm font-semibold">Preview</span>
        </div>
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-24 left-4 z-50",
        "transition-all duration-300 ease-out",
        "animate-in fade-in-0 slide-in-from-left-5 duration-500",
        isHovered && "scale-105",
        isMinimized ? "w-16" : "w-80"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl shadow-2xl",
        "bg-card/95 backdrop-blur-xl",
        "border-2 border-orange-500/60",
        "ring-4 ring-orange-500/20",
        isHovered && "border-orange-500 ring-orange-500/30 shadow-orange-500/20"
      )}>
        {/* Video - Only show when not minimized */}
        {!isMinimized && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-contain bg-muted/50"
          />
        )}
        
        {/* Top Overlay */}
        <div className={cn(
          "p-3 bg-black/60 backdrop-blur-md",
          isMinimized ? "rounded-2xl" : ""
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-orange-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
              <div className="relative">
                <Monitor className="w-3.5 h-3.5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse"></span>
              </div>
              {!isMinimized && <span>Sharing</span>}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Minimize/Maximize Toggle */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className={cn(
                  "bg-white/10 hover:bg-white/20 backdrop-blur-sm",
                  "text-white p-2 rounded-lg shadow-lg",
                  "transition-all duration-200",
                  "hover:scale-110 active:scale-90",
                  "focus:outline-none focus:ring-2 focus:ring-white/50"
                )}
                title={isMinimized ? "Show preview" : "Hide preview"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Hide Button */}
              <button
                onClick={() => setIsVisible(false)}
                className={cn(
                  "bg-white/10 hover:bg-white/20 backdrop-blur-sm",
                  "text-white p-2 rounded-lg shadow-lg",
                  "transition-all duration-200",
                  "hover:scale-110 active:scale-90",
                  "focus:outline-none focus:ring-2 focus:ring-white/50"
                )}
                title="Hide preview"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              {/* Stop Button */}
              <button
                onClick={onStop}
                className={cn(
                  "bg-red-500/90 hover:bg-red-600 backdrop-blur-sm",
                  "text-white p-2 rounded-lg shadow-lg",
                  "transition-all duration-200",
                  "hover:scale-110 active:scale-90",
                  "focus:outline-none focus:ring-2 focus:ring-red-400"
                )}
                title="Stop sharing"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Username - Only show when not minimized */}
          {!isMinimized && (
            <p className="text-white text-sm font-semibold truncate mt-2">{username}</p>
          )}
        </div>

        {/* Live Indicator - Only show when minimized */}
        {isMinimized && (
          <div className="p-3 flex items-center justify-center">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}