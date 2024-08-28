import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "V-ENT (Vermillion Enterprise) - Elevating the Gaming and Anime Community",
  description: "Vermillion Enterprise (V-ENT) is revolutionizing the gaming and anime world by providing a comprehensive platform for gamers, anime enthusiasts, and creative minds. With automated esports analytics, seamless event management, and connections to industry gigs, V-ENT is the future of interactive entertainment.",
  keywords: "Vermillion Enterprise, V-ENT, esports, gaming, anime, event management, esports analytics, streaming software, gaming community, anime events, industry jobs, creative minds",
  author: "Vermillion Enterprise Team",
  viewport: "width=device-width, initial-scale=1.0",
  charset: "UTF-8"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <meta name="author" content={metadata.author} />
        <meta name="viewport" content={metadata.viewport} />
        <meta charset={metadata.charset} />
        <title>{metadata.title}</title>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
