import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const description =
  "Ryan Huang is a product builder, endurance athlete, traveler, photographer, and coder.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ryanhuang.xyz"),
  title: "Ryan Huang",
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Ryan Huang",
    description,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Ryan Huang",
    description,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#1e1e1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script
          id="reb2b-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(key) {
                if (window.reb2b) return;
                window.reb2b = {loaded: true};
                var s = document.createElement("script");
                s.async = true;
                s.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/" + key + ".js.gz";
                document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);
              }("QO92DHLJKJN7");
            `,
          }}
        />
      </body>
    </html>
  );
}
