import "./globals.css";
import type { Metadata, Viewport } from "next";
import TopBar from "@/components/TopBar";
import MarkerDefs from "@/components/MarkerDefs";
import { themeScript } from "@/lib/keys";

export const metadata: Metadata = {
  title: { default: "Flutter Clean Path · رحلة Clean Architecture في Flutter", template: "%s · Flutter Clean Path" },
  description: "19 وحدة في خطة 35 أسبوع، وشرح كامل من الصفر للاحتراف، ومعامل تفاعلية، ومراجعة لـ Clean Architecture في Flutter.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MarkerDefs />
        <TopBar />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
