import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";
import PresenceProvider from "./PresenceProviders";

export const metadata: Metadata = {
  title: "logdrive",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>
          <TRPCReactProvider>
            <Toaster />
            <PresenceProvider>
              {children}
            </PresenceProvider>
          </TRPCReactProvider>
        </Providers>
      </body>
    </html>
  );
}
