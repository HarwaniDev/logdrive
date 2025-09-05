"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { type PresenceEvent } from "~/server/api/routers/presence";

type OnlineUser = {
  userId: string;
  userName: string;
  lastSeen: Date;
};

export default function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());

  // Get initial online users
  const { data: initialOnlineUsers } = api.presence.getOnlineUsers.useQuery();

  // Subscribe to presence changes
  api.presence.onPresenceChange.useSubscription(undefined, {
    onData(presenceEvent: PresenceEvent) {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        
        if (presenceEvent.status === "online") {
          newMap.set(presenceEvent.userId, {
            userId: presenceEvent.userId,
            userName: presenceEvent.userName,
            lastSeen: presenceEvent.lastSeen,
          });
        } else {
          newMap.delete(presenceEvent.userId);
        }
        
        return newMap;
      });
    },
    onError(err) {
      console.error('Presence subscription error:', err);
    },
  });

  // Set initial data when loaded
  useEffect(() => {
    if (initialOnlineUsers && onlineUsers.size === 0) {
      const userMap = new Map();
      initialOnlineUsers.forEach(user => {
        userMap.set(user.userId, user);
      });
      setOnlineUsers(userMap);
    }
  }, [initialOnlineUsers, onlineUsers.size]);

  const onlineUsersList = Array.from(onlineUsers.values());

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        Online Users ({onlineUsersList.length})
      </h3>
      
      {onlineUsersList.length === 0 ? (
        <p className="text-gray-500 text-sm">No users online</p>
      ) : (
        <div className="space-y-2">
          {onlineUsersList.map((user) => (
            <div key={user.userId} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.userName}
                </p>
                <p className="text-xs text-gray-500">
                  Active {getTimeAgo(user.lastSeen)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}