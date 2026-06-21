import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Space_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ToastProvider } from "@/components/toast-provider";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cormorant",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  applicationName: "Treinante",
  title: "Treinante",
  description: "Running analytics for every runner.",
  icons: {
    icon: "/images/bg-removed-logo.png",
    apple: "/images/bg-removed-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${inter.variable} ${cormorant.variable} ${spaceMono.variable} dark`}
      lang="en"
    >
      <body>
        <ServiceWorkerRegister />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
