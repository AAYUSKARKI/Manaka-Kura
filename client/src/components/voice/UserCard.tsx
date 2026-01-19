// UserCard.tsx - ONLY shows video camera feed, NEVER screen share
import { useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: {
    userId: string;
    username: string;
    status: string;
    connectionState?: string;
  };
  audioLevel: number;
  isJoining?: boolean;
  videoStream?: MediaStream | null;  // ONLY video camera stream
  isAudioActive?: boolean;
  isLocal?: boolean;
  hasScreenShare?: boolean;
  onViewScreen?: () => void;
}

export function UserCard({
  user,
  audioLevel,
  isJoining,
  videoStream,  // This should ONLY be the video camera stream, NOT screen share
  isAudioActive = false,
  isLocal = false,
  hasScreenShare = false,
  onViewScreen
}: UserCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // CRITICAL: Only set video stream if it's actually a camera feed
  useEffect(() => {
    if (videoRef.current && videoStream) {
      // Make sure this is a video stream, not a screen share stream
      const videoTracks = videoStream.getVideoTracks();
      if (videoTracks.length > 0) {
        // Check if it's NOT a screen share (screen shares usually have different track kinds)
        const isScreenShare = videoTracks[0].label.toLowerCase().includes('screen');
        
        if (!isScreenShare) {
          videoRef.current.srcObject = videoStream;
          videoRef.current.play().catch(err => {
            console.error('[UserCard] Failed to play video:', err);
          });
        } else {
          console.log('[UserCard] Skipping screen share stream in video card');
          videoRef.current.srcObject = null;
        }
      }
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoStream]);

  const hasVideo = !!videoStream;

  return (
    <Card className={cn(
      "user-card relative overflow-hidden",
      "bg-card/50 backdrop-blur-xl",
      "border-2 transition-all duration-300 ease-out rounded-3xl shadow-xl",
      user.connectionState === "connected" 
        ? "border-primary/50 shadow-primary/10" 
        : "border-border/30",
      isJoining && "animate-in fade-in-0 zoom-in-95 duration-500",
      "hover:shadow-2xl hover:border-primary/70 hover:-translate-y-1",
      "active:scale-[0.98]",
      isLocal && "ring-4 ring-primary/30 border-primary/60"
    )}>
      <CardContent className="p-0 relative">
        {/* Video/Avatar Container - ONLY shows video camera, NEVER screen */}
        <div className={cn(
          "relative overflow-hidden bg-muted/40",
          hasVideo ? 'aspect-video' : 'aspect-square'
        )}>
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  "transition-all duration-500",
                  isLocal && "scale-x-[-1]"
                )}
              />
              
              {/* Video Live Badge */}
              <div className="absolute top-3 right-3 bg-red-500/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            </>
          ) : (
            /* Avatar - Shows when no video camera feed */
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center",
                "text-white font-bold text-5xl shadow-2xl",
                "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
                "ring-4 ring-primary/20",
                "transition-all duration-300",
                "hover:scale-110 hover:rotate-6"
              )}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Connection Badge */}
          {user.connectionState === "connected" && (
            <div className="absolute top-3 left-3 bg-emerald-500/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in-0 slide-in-from-left-2 duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Connected
            </div>
          )}

          {/* Audio Level Visualizer */}
          {user.connectionState === "connected" && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30 backdrop-blur-sm">
              <div
                className={cn(
                  "h-full transition-all duration-150 ease-out",
                  "bg-gradient-to-r from-primary via-primary/80 to-primary",
                  "shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                )}
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 space-y-3 bg-card/80 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <p className={cn(
                "font-bold text-lg text-foreground truncate",
                isLocal && "text-primary"
              )}>
                {user.username} {isLocal && <span className="text-sm font-medium text-primary/70">(You)</span>}
              </p>
              
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-md",
                  user.status === 'online' && 'bg-emerald-500 shadow-emerald-500/50 animate-pulse',
                  user.status === 'busy' && 'bg-red-500 shadow-red-500/50',
                  user.status === 'away' && 'bg-amber-500 shadow-amber-500/50'
                )} />
                <p className="text-sm text-muted-foreground capitalize font-medium">
                  {user.status}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Audio Indicator */}
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                isAudioActive 
                  ? "bg-primary/20 text-primary shadow-lg shadow-primary/20 scale-110" 
                  : "bg-muted/50 text-muted-foreground"
              )}>
                {isAudioActive ? (
                  <Mic className="w-4 h-4 animate-pulse" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </div>

              {/* Screen Share Button - Separate from video */}
              {hasScreenShare && (
                <button
                  onClick={onViewScreen}
                  className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    "bg-orange-500/20 text-orange-400",
                    "hover:bg-orange-500/30 hover:scale-110",
                    "active:scale-95",
                    "shadow-lg shadow-orange-500/20",
                    "animate-in fade-in-0 zoom-in-95 duration-300",
                    "relative"
                  )}
                  title="View screen share"
                >
                  <Monitor className="w-4 h-4" />
                  {/* Pulsing indicator */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                </button>
              )}

              {/* Video Camera Indicator */}
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                hasVideo 
                  ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20" 
                  : "bg-muted/50 text-muted-foreground"
              )}>
                {hasVideo ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          {/* Audio Waveform */}
          {user.connectionState === "connected" && isAudioActive && (
            <div className="flex gap-1.5 h-8 items-end justify-center bg-muted/30 rounded-xl p-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-100 ease-out",
                    "bg-gradient-to-t from-primary to-primary/50",
                    "shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                  )}
                  style={{
                    height: `${Math.max(20, audioLevel * 100 * (0.5 + Math.sin((Date.now() / 200 + i) * 0.8)))}%`,
                    opacity: 0.6 + (audioLevel * 0.4)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}