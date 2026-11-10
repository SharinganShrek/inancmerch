import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";

const serif = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

const sans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LAWINA — TEVİT Drop",
  description:
    "Kalabalık aldıkça fiyat düşer. Sipariş anındaki fiyat, ödeyeceğin maksimum tutardır.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${serif.variable} ${sans.variable} antialiased`}>
        <Providers>
          <div className="grain" />
          <div className="flex h-dvh flex-col">
            <Nav />
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
