import type { Metadata } from "next";
import { Cairo, Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PinCasting — TikTok Live QR & Instant Checkout",
  description: "Lightweight QR and short-code checkout for TikTok Live sellers, services, hotels, and restaurants.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${cairo.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full overflow-x-hidden flex flex-col bg-surface text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
