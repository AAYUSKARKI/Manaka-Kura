import { useState, useEffect } from 'react';

export const useAudioLevels = (
  isInitialized: boolean,
  isTransmitting: boolean,
  currentUserName: string | undefined,
  onlineUsers: Map<string, any>,
  remoteStreams: Map<string, MediaStream>,
  getAudioLevel: () => number,
  getRemoteAudioLevel: (userId: string) => number
) => {
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isInitialized) return;

      setAudioLevels((prev) => {
        const nextLevels: Record<string, number> = {};

        // Local Level
        if (isTransmitting && currentUserName) {
          nextLevels[currentUserName] = getAudioLevel();
        }

        // Remote Levels
        onlineUsers.forEach((user) => {
          if (remoteStreams.has(user.userId)) {
            const currentLevel = getRemoteAudioLevel(user.userId);
            
            // OPTIONAL: Smooth Decay Logic
            // If the new level is lower than the old one, drop it slowly
            const prevLevel = prev[user.userId] || 0;
            nextLevels[user.userId] = currentLevel < prevLevel 
              ? prevLevel * 0.8  // Decay by 20% each tick
              : currentLevel;
          }
        });

        return nextLevels;
      });
    }, 80); // Slightly faster (approx 12fps) for smoother visuals

    return () => clearInterval(interval);
  }, [isInitialized, isTransmitting, currentUserName, onlineUsers, remoteStreams, getAudioLevel, getRemoteAudioLevel]);

  return audioLevels;
};