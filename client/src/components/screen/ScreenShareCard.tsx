import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// ScreenShareCard - Full-screen viewer with camera feeds on the side
export function ScreenShareCard({ 
  user,
  screenStream,
  cameraStream,
  onClose
}: { 
  user: {
    userId: string;
    username: string;
  };
  screenStream: MediaStream;
  cameraStream?: MediaStream | null;
  onClose: () => void;
}) {
    console.log("ss card")
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play()
        .then(() => setIsVideoReady(true))
        .catch(err => console.error('[ScreenShareCard] Failed to play screen:', err));
    }
  }, [screenStream]);

  useEffect(() => {
    if (cameraRef.current && cameraStream) {
      cameraRef.current.srcObject = cameraStream;
      cameraRef.current.play().catch(err => console.error('[ScreenShareCard] Failed to play camera:', err));
    }
  }, [cameraStream]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowControls(false), 1000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-md flex items-center justify-center"
    >
      {/* Top Controls Bar */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 z-10 p-6 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-orange-500/30 backdrop-blur-xl">
            <div className="relative">
              <Users className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">{user.username}</span>
              <span className="text-xs text-white/80">Screen Share</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullscreen}
              className={cn(
                "bg-white/10 hover:bg-white/20 backdrop-blur-xl",
                "text-white p-4 rounded-2xl shadow-lg",
                "transition-all duration-200",
                "hover:scale-105 active:scale-95"
              )}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className={cn(
                "bg-red-500 hover:bg-red-600 backdrop-blur-xl",
                "text-white px-6 py-4 rounded-2xl shadow-lg shadow-red-500/30",
                "transition-all duration-200 font-semibold",
                "hover:scale-105 active:scale-95",
                "flex items-center gap-2"
              )}
            >
              <X className="w-5 h-5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="relative w-full h-full max-w-[95vw] max-h-[90vh]">
          {/* Screen Share - Main Display */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-contain rounded-2xl shadow-2xl",
              "transition-all duration-500",
              isVideoReady ? "opacity-100" : "opacity-0"
            )}
          />
          
          {/* Camera Feed - Picture-in-Picture (Bottom Right) */}
          {cameraStream && (
            <div className={cn(
              "absolute bottom-6 right-6 z-20",
              "w-72 aspect-video",
              "rounded-2xl overflow-hidden",
              "shadow-2xl ring-4 ring-white/20",
              "bg-black/50 backdrop-blur-sm",
              "transition-all duration-300",
              "hover:scale-105 hover:ring-white/40"
            )}>
              <video
                ref={cameraRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Camera Label */}
              <div className="absolute top-3 left-3 bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                Camera
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-xl px-8 py-5 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-orange-500 rounded-full"></div>
                  </div>
                  <p className="text-base font-semibold text-white">Connecting to screen...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hint */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10 p-6 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        )}
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-white/70 text-sm text-center font-medium">
            Press <kbd className="px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-lg text-white font-mono mx-1">ESC</kbd> to exit • 
            <kbd className="px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-lg text-white font-mono mx-1">F</kbd> for fullscreen
          </p>
        </div>
      </div>
    </div>
  );
}