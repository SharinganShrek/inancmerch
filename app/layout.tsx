import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ProfileGate } from "@/components/ProfileGate";
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
  title: "LAWINA — TEV İnanç",
  description:
    "Kalabalık aldıkça fiyat düşer. Aralık, 70 kişi ile 100 kişi arasındaki tahmini fiyattır.",
};

const themeScript = `(function(){try{if(localStorage.getItem("lawina-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${serif.variable} ${sans.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>
          <ProfileGate />
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
