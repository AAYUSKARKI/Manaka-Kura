// UserCard.tsx
import { useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";
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
  videoStream?: MediaStream | null;
  isAudioActive?: boolean;
  isLocal?: boolean;
}

export function UserCard({ 
  user, 
  audioLevel, 
  isJoining,
  videoStream,
  isAudioActive = false,
  isLocal = false
}: UserCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  if (videoRef.current) {
    if (videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(err => {
        console.error('[UserCard] Failed to play video:', err);
      });
    } else {
      // ✅ THIS IS THE FIX - clears frozen frames
      videoRef.current.srcObject = null;
    }
  }
}, [videoStream, user.username]);

  const hasVideo = !!videoStream;

  return (
    <Card className={cn(
      "user-card bg-background/95",
      "border transition-all duration-300 ease-in-out rounded-2xl shadow-md overflow-hidden",
      user.connectionState === "connected" ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50",
      isJoining && "animate-pulse scale-102",
      "hover:scale-102 hover:shadow-lg hover:border-primary/60 hover:ring-primary/30",
      isLocal && "ring-2 ring-primary/50"
    )}>
      <CardContent className="p-0 relative">
        {/* Video Container */}
        <div className={cn(
          "relative bg-muted overflow-hidden",
          hasVideo ? 'aspect-video rounded-t-2xl' : 'aspect-square rounded-t-2xl'
        )}>
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transition-opacity duration-300"
                style={isLocal ? { transform: 'scaleX(-1)' } : {}}
              />
              {/* Video Active Indicator */}
              <div className="absolute top-2 right-2 bg-primary/80 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-sm">
                <Video className="w-3 h-3" />
                LIVE
              </div>
            </>
          ) : (
            /* Avatar Placeholder */
            <div className="w-full h-full flex items-center justify-center transition-all duration-300">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/90 flex items-center justify-center text-white font-bold text-4xl sm:text-5xl shadow-lg ring-1 ring-border/50">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Connection Status Badge */}
          {user.connectionState === "connected" && (
            <div className="absolute top-2 left-2 bg-primary/80 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Connected
            </div>
          )}

          {/* Audio Level Indicator */}
          {user.connectionState === "connected" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/50">
              <div 
                className="h-full bg-primary transition-all duration-100 ease-out"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* User Info Bar */}
        <div className="p-3 sm:p-4 bg-background/98">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-base sm:text-lg text-foreground truncate tracking-tight">
                {user.username} {isLocal && '(You)'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground capitalize flex items-center gap-1.5 mt-1">
                <span className={cn(
                  "w-2 h-2 rounded-full shadow-sm animate-pulse",
                  user.status === 'online' && 'bg-green-500',
                  user.status === 'busy' && 'bg-red-500',
                  user.status === 'away' && 'bg-yellow-500'
                )} />
                {user.status}
              </p>
            </div>

            {/* Activity Indicators */}
            <div className="flex items-center gap-2">
              {isAudioActive ? (
                <div className="bg-primary/30 p-1 rounded-md shadow-sm">
                  <Mic className="w-4 h-4 text-primary-foreground" />
                </div>
              ) : (
                <div className="bg-muted/50 p-1 rounded-md">
                  <MicOff className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              
              {hasVideo ? (
                <div className="bg-blue-600/30 p-1 rounded-md shadow-sm">
                  <Video className="w-4 h-4 text-blue-300" />
                </div>
              ) : (
                <div className="bg-muted/50 p-1 rounded-md">
                  <VideoOff className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Audio Wave Visualization */}
          {user.connectionState === "connected" && isAudioActive && (
            <div className="flex gap-1 h-6 items-end mt-2 justify-center">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all duration-100 ease-in-out"
                  style={{ 
                    height: `${Math.max(15, audioLevel * 100 * (1 + Math.sin(i * 0.5)))}%`,
                    animationDelay: `${i * 0.05}s` 
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