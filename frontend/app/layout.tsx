import "./globals.css";
import type { Metadata } from "next";
import QuickJourneyNav from "@/components/QuickJourneyNav";

export const metadata: Metadata = {
  title: "NILA Platform",
  description: "Plataforma operativa para clientes y profesionales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <QuickJourneyNav />
      </body>
    </html>
  );
}
