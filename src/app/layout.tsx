import type { Metadata } from "next";
import { Hanken_Grotesk, Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono, Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Lifora",
  description: "Lifora — your AI-powered life planner. Track anything, your way.",
};

// Inline script to prevent FOUC — runs before React hydration
const themeInitScript = `
(function(){
  try {
    var cm = localStorage.getItem('planner-color-mode');
    var dark = cm === 'dark' || (cm !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    var t = localStorage.getItem('planner-theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
    var f = localStorage.getItem('planner-font');
    if (f) document.documentElement.setAttribute('data-font', f);
    var l = localStorage.getItem('planner-layout');
    if (l) document.documentElement.setAttribute('data-layout', l);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${jakarta.variable} ${inter.variable} ${spaceGrotesk.variable} ${playfair.variable} ${jetbrains.variable}`}
      data-theme="clay"
      data-font="sans"
      data-layout="default"
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--popover)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-overlay)",
                },
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
