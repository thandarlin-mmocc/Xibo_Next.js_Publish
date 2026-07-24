import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Cleaning Log",
  manifest: "/manifest-staff.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Cleaning Log" },
  icons: { apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function CleanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
