import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const epilogue = localFont({
  src: "../../website/app/fonts/GeistVF.woff",
  variable: "--font-epilogue",
  display: "swap",
});

const plusJakartaSans = localFont({
  src: "../../website/app/fonts/GeistVF.woff",
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Invyte | Plan Events, Not Group Chats",
    template: "%s | Invyte",
  },
  description:
    "Replace chaotic group chats with vibrant event vibes. Create events, RSVP instantly, and share memories — all in one place.",
  keywords: [
    "event planning",
    "RSVP",
    "social events",
    "party planning",
    "event app",
  ],
  openGraph: {
    type: "website",
    siteName: "Invyte",
    title: "Invyte | Plan Events, Not Group Chats",
    description:
      "Replace chaotic group chats with vibrant event vibes. Create events, RSVP instantly, and share memories — all in one place.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0e13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${epilogue.variable} ${plusJakartaSans.variable} antialiased min-h-screen bg-background text-on-surface font-body overflow-x-hidden selection:bg-primary/30 selection:text-primary`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
