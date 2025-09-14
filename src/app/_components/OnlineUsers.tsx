"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

type UserPresence = {
  userId: string;
  userName: string;
  status: "online" | "offline";
  lastSeen: Date;
};

type PresencePayload = {
  userPresence: Map<string, {
    userId: string;
    userName: string;
    status: "online" | "offline";
    lastSeen: Date;
    connectionCount: number;
  }>;
};

export default function OnlineUsers() {
  const [users, setUsers] = useState<Map<string, UserPresence>>(new Map());

  // Get initial presence for all users
  const { data: initialUsers, isLoading } = api.presence.getUsersPresence.useQuery();

  // Subscribe to presence changes
  api.presence.onPresenceChange.useSubscription(undefined, {
    onData(data) {
      setUsers(data);
    },
    onError(err) {
      console.error('Presence subscription error:', err);
    },
  });

  // Set initial data when loaded
  useEffect(() => {
    if (initialUsers && users.size === 0) {
      const userMap = new Map<string, UserPresence>();
      initialUsers.forEach(user => {
        userMap.set(user.userId, {
          userId: user.userId,
          userName: user.userName,
          status: user.status,
          lastSeen: new Date(user.lastSeen),
        });
      });
      setUsers(userMap);
    }
  }, [initialUsers, users.size]);

  const usersList = Array.from(users.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === "online" ? -1 : 1;
    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        Users ({isLoading ? "..." : usersList.length})
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span className="ml-2 text-gray-500 text-sm">Loading users...</span>
        </div>
      ) : usersList.length === 0 ? (
        <p className="text-gray-500 text-sm">No users</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {usersList.map((user) => (
            <div key={user.userId} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.userName}
                </p>
                <p className="text-xs text-gray-500">
                  {user.status === 'online' ? (
                    <>Active {getTimeAgo(user.lastSeen)}</>
                  ) : (
                    <>Last seen {formatLastSeen(user.lastSeen)}</>
                  )}
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

function formatLastSeen(date: Date): string {
  if (!date || isNaN(new Date(date).getTime())) return 'unknown';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay) {
    return getTimeAgo(new Date(date));
  }
  return new Date(date).toLocaleDateString("en-IN");
}