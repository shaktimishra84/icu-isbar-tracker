import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICU ISBAR Tracker",
  description: "Local-only de-identified ICU ISBAR tracker",
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
