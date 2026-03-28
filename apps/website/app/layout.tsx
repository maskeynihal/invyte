import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const headlineFont = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-website-headline",
  display: "swap",
});
const bodyFont = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-website-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invyte | The Neon Pulse of Events",
  description: "Replace chaotic group chats with vibrant event vibes. Create, RSVP, and share memories—all in one place.",
  openGraph: {
    images: [{ url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPmIaxta-kQSRa6p324qzgn_e6c_U_0-n5AM0lRRqssa23f3Ty-lWhlp56qyHQnTYVKoSpGXQbR5-khrsY1IKW2JQPIGldR85VNqq3XimqGv8MfSBpWuwzVLPe2iW7NGHK7yE-myY1VXoi2wiUQv3gQy2kjBktguPYdPj8kJCTMcSXh_zqYqXzJvMAU4coehJXGkKOZV6WDYdgvnoxc9-22_5H7SqG-6RlxkCSteJUCLu-SV1M9oQ1Y_4qkWLeXgJ3DjRIjJJQplbk", width: 1200, height: 630 }]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headlineFont.variable} ${bodyFont.variable} font-body bg-background text-on-surface`}>
        {children}
      </body>
    </html>
  );
}
