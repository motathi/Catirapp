import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catirapp — O marketplace que encontra negócios para você",
  description:
    "Oportunidades de veículos abaixo da FIPE, com matching inteligente para compra e troca (catira).",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

// Aplica o tema salvo (ou o do sistema) antes da primeira pintura
const themeInit = `try{var t=localStorage.getItem('catirapp-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-surface text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
