import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liam 25! - Inbjudan!",
  description: "Liam 25! - Inbjudan!",
  openGraph: {
    title: "Liam 25! - Inbjudan!",
    description: "Liam 25! - Inbjudan!",
  },
  twitter: {
    title: "Liam 25! - Inbjudan!",
    description: "Liam 25! - Inbjudan!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
