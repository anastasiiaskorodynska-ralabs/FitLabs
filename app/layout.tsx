import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return {
    title: t("name"),
    description: t("description"),
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#110e14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${onest.variable} h-full antialiased`}>
      <body className="h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
