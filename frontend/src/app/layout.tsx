import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptLoop — AI Prompt Optimization Studio",
  description: "Promptunu yaz, yapay zekâ ile geliştir ve daha etkili sonuçlar elde et.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-[#07090E] text-[#EDEDED] min-h-screen flex flex-col font-sans antialiased selection:bg-[#00E5FF]/20 selection:text-[#00E5FF]">
        {children}
      </body>
    </html>
  );
}
