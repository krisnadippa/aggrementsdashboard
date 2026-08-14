import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Infinity Go Rentcar Bali — Dashboard",
  description: "Sistem manajemen rental mobil Infinity Go Rentcar Bali. Generate Rental Agreement & Invoice digital.",
  keywords: ["rental mobil bali", "infinity go", "car rental bali", "sewa mobil bali"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
