import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "CourseCheck AI",
  description:
    "12-сынып Қазақстан тарихы курстық жұмыстарын AI көмегімен тексеру платформасы",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="kk" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
