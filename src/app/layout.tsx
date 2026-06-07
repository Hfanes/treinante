import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunMetrics",
  description: "Running analytics for every runner.",
};

const themeScript = `
  const theme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (theme === 'dark' || (!theme && prefersDark)) document.documentElement.classList.add('dark')
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
