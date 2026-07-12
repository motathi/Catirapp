import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import PlanCTA from "@/components/PlanCTA";

export const metadata = {
  title: "Planos e pacotes — Catir",
  description:
    "Assine PRO, Premium ou o Plano Lojista e destaque seus anúncios para vender mais rápido.",
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-emerald-500">✓</span>
      <span>{children}</span>
    </li>
  );
}

function PlanCard({
  name,
  price,
  period = "/mês",
  tagline,
  features,
  cta,
  featured,
}: {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  cta?: { planCode: string; label: string; variant?: "primary" | "secondary" };
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-5 ${
        featured
          ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
          : "border-line bg-card"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950">
          Mais popular
        </span>
      )}
      <h3 className="text-lg font-extrabold">{name}</h3>
      <p className="mt-0.5 text-xs text-mute">{tagline}</p>
      <p className="mt-3">
        <span className="text-3xl font-extrabold">{price}</span>
        {price !== "Grátis" && (
          <span className="text-sm text-mute">{period}</span>
        )}
      </p>
      <ul className="mt-4 space-y-1.5">
        {features.map((f) => (
          <Check key={f}>{f}</Check>
        ))}
      </ul>
      {cta && (
        <div className="mt-5">
          <PlanCTA
            planCode={cta.planCode}
            label={cta.label}
            variant={cta.variant}
          />
        </div>
      )}
    </div>
  );
}

export default function PlanosPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <Link href="/perfil" className="text-sm text-mute">
        ‹ Voltar
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Venda mais rápido no Catir
        </h1>
        <p className="mt-1 text-sm text-mute">
          Mais anúncios, mais contatos e destaque no topo do feed. Escolha o
          plano ou o pacote que faz seu carro aparecer para quem quer comprar.
        </p>
      </header>

      {/* Assinaturas (pessoa física) */}
      <section className="mt-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Planos de assinatura
        </h2>

        <PlanCard
          name="Gratuito"
          price="Grátis"
          tagline="Para começar a anunciar"
          features={[
            "1 anúncio ativo",
            "1 contato de matching por dia",
            "Aparece no feed de oportunidades",
          ]}
        />

        <PlanCard
          name="PRO"
          price="R$ 39"
          tagline="Para quem vende com frequência"
          featured
          features={[
            "Até 10 anúncios ativos",
            "4 contatos de matching por dia",
            "Destaque no topo por 5 dias",
            "Selo PRO no anúncio",
          ]}
          cta={{ planCode: "pro", label: "Assinar PRO" }}
        />

        <PlanCard
          name="Premium"
          price="R$ 99"
          tagline="Máxima visibilidade"
          features={[
            "Anúncios ilimitados",
            "Contatos de matching ilimitados",
            "Destaque no topo por 15 dias",
            "Prioridade máxima na exibição",
          ]}
          cta={{
            planCode: "premium",
            label: "Assinar Premium",
            variant: "secondary",
          }}
        />
      </section>

      {/* Lojista (B2B) */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Para lojas e revendas
        </h2>
        <div className="mt-3 rounded-2xl border border-indigo-500/50 bg-indigo-500/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">Plano Lojista</h3>
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
              B2B
            </span>
          </div>
          <p className="mt-0.5 text-xs text-mute">
            Ferramentas de loja para girar o estoque
          </p>
          <p className="mt-3">
            <span className="text-3xl font-extrabold">R$ 249</span>
            <span className="text-sm text-mute">/mês</span>
          </p>
          <ul className="mt-4 space-y-1.5">
            <Check>Estoque alto de anúncios ativos</Check>
            <Check>Destaque contínuo e prioridade no feed</Check>
            <Check>Contatos de matching sem limite</Check>
            <Check>Selo de loja verificada</Check>
            <Check>Suporte comercial dedicado</Check>
          </ul>
          <div className="mt-5">
            <PlanCTA planCode="lojista" label="Falar com vendas" />
          </div>
        </div>
      </section>

      {/* Pacote de destaque */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Turbine um anúncio
        </h2>
        <div className="mt-3 rounded-2xl border border-amber-400/50 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-lg font-extrabold">Destaque avulso</h3>
          </div>
          <p className="mt-0.5 text-xs text-mute">
            Sem assinar plano — pague só quando quiser aparecer
          </p>
          <p className="mt-3">
            <span className="text-3xl font-extrabold">R$ 25</span>
            <span className="text-sm text-mute"> por anúncio</span>
          </p>
          <ul className="mt-4 space-y-1.5">
            <Check>Topo do feed por 5 a 15 dias</Check>
            <Check>Selo de destaque no anúncio</Check>
            <Check>Muito mais visualizações e contatos</Check>
          </ul>
          <div className="mt-5">
            <PlanCTA
              planCode="destaque"
              label="Destacar um anúncio"
              variant="secondary"
            />
          </div>
        </div>
      </section>

      {/* Publicidade (anunciantes do ecossistema) */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Para anunciantes
        </h2>
        <div className="mt-3 rounded-2xl border border-line bg-card p-5">
          <h3 className="text-lg font-extrabold">Anuncie no Catir</h3>
          <p className="mt-1 text-sm text-mute">
            Alcance milhares de compradores de veículos com alta intenção de
            compra. Ideal para seguradoras, financiamentos, oficinas, vistorias
            e autopeças.
          </p>
          <div className="mt-5">
            <PlanCTA
              planCode="publicidade"
              label="Quero anunciar minha marca"
              variant="secondary"
            />
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-mute">
        Ao registrar interesse, nossa equipe entra em contato para ativar seu
        plano. Pagamento no app em breve.
      </p>

      <BottomNav />
    </main>
  );
}
