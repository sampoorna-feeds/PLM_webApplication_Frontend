import type { Metadata } from "next";
// import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { ErrorProvider } from "@/lib/contexts/error-context";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

// const notoSans = Noto_Sans({ variable: "--font-sans" });

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: {
    template: "%s | Sampoorna Feeds",
    default: "Sampoorna Feeds",
  },
  description: "Sampoorna Feeds ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // className={notoSans.variable}
      suppressHydrationWarning
    >
      <body
        className={cn(
          // `${geistSans.variable} ${geistMono.variable}`,
          `overflow-hidden antialiased`,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorProvider>
            <AuthProvider>{children}</AuthProvider>
          </ErrorProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
