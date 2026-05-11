import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/src/index.css";
import { BottomNav } from "@/src/components/layout/BottomNav";
import { Toaster } from "react-hot-toast";
import { PageTransition } from "@/src/components/PageTransition";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Re-Vibe - Rusak? AI bantu kamu putuskan",
  description: "Bantu pilih perbaiki atau beli baru dengan AI Vision",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1A73E8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 flex justify-center min-h-screen`}>
        <div className="w-full max-w-[440px] bg-white shadow-2xl relative flex flex-col min-h-screen">
          <Toaster position="top-center" />
          <PageTransition>
            {children}
          </PageTransition>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
