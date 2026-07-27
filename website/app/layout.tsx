import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://voramlbb.com"),
  title: {
    default: "Vora — Find Your Five",
    template: "%s | Vora",
  },
  description:
    "Discord-first teammate formation for Mobile Legends. Find compatible players, complete your five and queue together.",
  applicationName: "Vora",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Vora",
    "Mobile Legends",
    "MLBB",
    "teammate finder",
    "Discord matchmaking",
    "five-player squad",
  ],
  openGraph: {
    title: "Vora — Find Your Five. Play as One.",
    description:
      "Role-aware, skill-based teammate formation for Mobile Legends—entirely on Discord.",
    type: "website",
    siteName: "Vora",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1870,
        height: 841,
        alt: "Vora — Built for Better Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vora — Find Your Five. Play as One.",
    description:
      "Role-aware, skill-based teammate formation for Mobile Legends—entirely on Discord.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/brand/vora-mark.png",
    shortcut: "/brand/vora-mark.png",
    apple: "/brand/vora-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#081220",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
