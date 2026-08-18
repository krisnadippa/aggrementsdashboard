import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: "Infinity Go Rentcar Bali — Dashboard",
  description: "Sistem manajemen rental mobil Infinity Go Rentcar Bali. Generate Rental Agreement & Invoice digital.",
  keywords: ["rental mobil bali", "infinity go", "car rental bali", "sewa mobil bali"],
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "Infinity Go Rentcar Bali — Dashboard",
    description: "Sistem manajemen rental mobil Infinity Go Rentcar Bali. Generate Rental Agreement & Invoice digital.",
    images: [
      {
        url: "/images/logo.png",
        width: 800,
        height: 600,
        alt: "Infinity Go Logo",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
