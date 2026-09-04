import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Çamoluk Yapı — Operasyon Paneli",
  description: "Şirket içi yönetim paneli",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-surface text-text antialiased`}>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
