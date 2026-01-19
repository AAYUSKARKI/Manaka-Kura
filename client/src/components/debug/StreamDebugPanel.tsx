import { useState } from 'react';
import { Monitor, Video, AlertCircle } from 'lucide-react';

// Add this component to your app temporarily to debug stream issues
export function StreamDebugPanel({ 
  remoteVideoStreams, 
  remoteScreenStreams,
  onlineUsers 
}: {
  remoteVideoStreams: Map<string, MediaStream | null>;
  remoteScreenStreams: Map<string, MediaStream | null>;
  onlineUsers: Map<string, any>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-4 z-50 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all"
        title="Debug Streams"
      >
        <AlertCircle className="w-5 h-5" />
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed top-32 right-4 z-50 bg-card border-2 border-purple-500 rounded-2xl shadow-2xl p-4 max-w-md max-h-96 overflow-y-auto">
          <h3 className="font-bold text-lg mb-3 text-purple-500">Stream Debug Info</h3>
          
          {Array.from(onlineUsers.values()).map((user) => {
            const videoStream = remoteVideoStreams.get(user.userId);
            const screenStream = remoteScreenStreams.get(user.userId);
            
            const videoTracks = videoStream?.getVideoTracks() || [];
            const screenTracks = screenStream?.getVideoTracks() || [];

            return (
              <div key={user.userId} className="mb-4 p-3 bg-muted/50 rounded-xl">
                <p className="font-semibold text-sm mb-2">{user.username}</p>
                
                {/* Camera Video Info */}
                <div className="flex items-start gap-2 mb-2">
                  <Video className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-blue-500">Camera:</p>
                    {videoStream ? (
                      <>
                        <p className="text-muted-foreground">Stream ID: {videoStream.id.slice(0, 8)}...</p>
                        {videoTracks.map((track, i) => (
                          <div key={i} className="mt-1 pl-2 border-l-2 border-blue-500/30">
                            <p>Label: {track.label}</p>
                            <p>Enabled: {track.enabled ? '✅' : '❌'}</p>
                            <p>Settings: {JSON.stringify(track.getSettings()).slice(0, 50)}...</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No camera stream</p>
                    )}
                  </div>
                </div>

                {/* Screen Share Info */}
                <div className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-orange-500">Screen:</p>
                    {screenStream ? (
                      <>
                        <p className="text-muted-foreground">Stream ID: {screenStream.id.slice(0, 8)}...</p>
                        {screenTracks.map((track, i) => (
                          <div key={i} className="mt-1 pl-2 border-l-2 border-orange-500/30">
                            <p>Label: {track.label}</p>
                            <p>Enabled: {track.enabled ? '✅' : '❌'}</p>
                            <p>Settings: {JSON.stringify(track.getSettings()).slice(0, 50)}...</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No screen stream</p>
                    )}
                  </div>
                </div>

                {/* Alert if same stream */}
                {videoStream && screenStream && videoStream.id === screenStream.id && (
                  <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-500">
                    ⚠️ WARNING: Video and Screen are the SAME stream!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}