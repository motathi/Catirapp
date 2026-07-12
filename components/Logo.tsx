// Logomarca do Catire. Sem variant, alterna automaticamente conforme o tema
// (imagem escura em fundo claro e vice-versa). Com variant, força uma versão
// — usado onde o fundo é sempre escuro (ex.: modo descoberta).
export default function Logo({
  className = "",
  variant,
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  if (variant) {
    const src =
      variant === "dark" ? "/catir-logo-dark.png" : "/catir-logo-light.png";
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Catire" className={className} />;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/catir-logo-light.png"
        alt="Catire"
        className={`${className} block dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/catir-logo-dark.png"
        alt=""
        aria-hidden
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
