import { Fraunces } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import JsonLd from "@/components/seo/JsonLd";
import WalkthroughProvider from "@/components/walkthrough/WalkthroughProvider";
import { PlatformModulesProvider } from "@/lib/platformModules";
import { SITE, buildMetadata, currentLocale, organizationLd, websiteLd } from "@/lib/seo";
import { sectionCopy } from "@/lib/seoCopy";

// Metadata is declared, not hand-written into <head>.
//
// This file used to do both: export a `metadata` object AND render <title> and
// <meta name="description"> by hand inside <head>. Next emits the exported
// object as well, so every page shipped two titles and two descriptions, and
// which one a crawler honoured was up to the crawler. Everything below is
// declared once and Next renders it.
//
// `metadataBase` is what makes every relative image and canonical resolve to an
// absolute URL. Without it Next warns and Open Graph images silently break in
// every preview, because a link preview cannot resolve `/images/og.png`.

// Loaded through next/font rather than a <link> in a hand-written <head>.
//
// The root layout used to render its own <head>. App Router builds that element
// itself from the metadata below, and the two fighting over it threw
// HierarchyRequestError - "Only one element on document allowed" - during
// hydration, which dropped every page to the client-side error screen. next/font
// also self-hosts the file, so there is no render-blocking round trip to
// fonts.googleapis.com and no third party watching who reads the site.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "700", "900"],
  variable: "--font-fraunces",
});

// A function rather than a const, for the same reason every section layout
// uses one: a const is evaluated once at build time, where there is no request
// and therefore no language, so /fr and /pt both shipped the English title and
// the English description. That is the one line of a search result anybody
// reads, and the only reason locale URLs exist at all.
export async function generateMetadata() {
  const locale = currentLocale();
  const copy = sectionCopy('root', locale);

  return {
  metadataBase: new URL(SITE.url),
  ...buildMetadata({ ...copy, path: '/', locale }),
  // A per-page title becomes "Naija Free Fire Weekly | V-ENT" without every
  // page having to remember to append the brand.
  title: {
    default: copy.title,
    template: `%s | ${SITE.name}`,
  },
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName, url: SITE.url }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  category: 'Esports',
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: '/favicon.ico',
    apple: '/images/apple-touch-icon.png',
  },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#131316",
};

export default function RootLayout({ children }) {
  return (
    <SessionWrapper>
      {/* `lang` is corrected on the client by LanguageProvider once the
          person's choice is known. It starts as `en` because that is what the
          server actually renders. */}
      <html lang="en" className={fraunces.variable}>
        <body>
          {/* Site-wide structured data, inside body rather than head.
              A fragment of <script> elements rendered into <head> made React
              throw HierarchyRequestError ("Only one element on document
              allowed") during hydration and the whole app fell over to the
              client-side error page. JSON-LD is valid anywhere in the document
              and Google reads it in body, so this is where it lives. */}
          <JsonLd data={[organizationLd(), websiteLd()]} />
          {/* Inside <body>, because the overlay it renders has to be a sibling
              of the page and not of <html>. Inside the session and language
              providers from SessionWrapper, so it knows who is signed in and
              which language to speak. */}
          <PlatformModulesProvider>
            <WalkthroughProvider>{children}</WalkthroughProvider>
          </PlatformModulesProvider>
        </body>
      </html>
    </SessionWrapper>
  );
}
