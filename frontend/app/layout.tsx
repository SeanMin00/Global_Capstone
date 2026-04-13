import type { Metadata } from "next";
import AssistantLauncher from "./assistant-launcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimal Global News MVP",
  description: "Simple GDELT to FastAPI to Next.js demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AssistantLauncher />
      </body>
    </html>
  );
}
