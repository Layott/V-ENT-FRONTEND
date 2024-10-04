import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "V-ENT (Vermillion Enterprise) - Elevating the Gaming and Anime Community",
  description: "Vermillion Enterprise (V-ENT) is revolutionizing the gaming and anime world by providing a comprehensive platform for gamers, anime enthusiasts, and creative minds. With automated esports analytics, seamless event management, and connections to industry gigs, V-ENT is the future of interactive entertainment.",
  keywords: "Vermillion Enterprise, V-ENT, esports, gaming, anime, event management, esports analytics, streaming software, gaming community, anime events, industry jobs, creative minds",
  author: "Vermillion Enterprise Team",
  charset: "UTF-8"
};
export const viewport = {
  width: "device-width",
  initialScale: 1
}


export default function RootLayout({ children }) {
  return (
    <SessionWrapper>
        <html lang="en">
        <head>
          <meta name="description" content={metadata.description} />
          <meta name="keywords" content={metadata.keywords} />
          <meta name="author" content={metadata.author} />
          <meta name="viewport" content={metadata.viewport} />
          <meta charSet={metadata.charset} />
          <meta name="viewport" content={`width=${viewport.width}, initial-scale=${viewport.initialScale}`} />
          <title>{metadata.title}</title>
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    </SessionWrapper>
    
  );
}
