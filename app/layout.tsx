import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catire — O marketplace que encontra negócios para você",
  description:
    "Oportunidades de veículos abaixo da FIPE, com matching inteligente para compra e troca (catira).",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f5",
};

// Padrão é fundo branco (claro); o escuro só é aplicado se o usuário escolher
// explicitamente. A escolha persiste em localStorage e é aplicada antes da
// primeira pintura.
const themeInit = `try{if(localStorage.getItem('catirapp-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

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
