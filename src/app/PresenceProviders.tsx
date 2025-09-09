"use client";

import { useSession } from "next-auth/react";
import { usePresence } from "~/hooks/usePresence";

type Props = {
  children: React.ReactNode;
};

export default function PresenceProvider({ children }: Props) {
  const { data: session } = useSession();
  
  // Only track presence if user is authenticated
  usePresence();

  return <>{children}</>;
}