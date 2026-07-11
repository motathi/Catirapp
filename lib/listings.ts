export type AssetCategory =
  | "carro"
  | "moto"
  | "caminhao"
  | "caminhonete"
  | "suv"
  | "embarcacao"
  | "maquina"
  | "trator"
  | "terreno"
  | "imovel"
  | "outro";

export interface Listing {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  mileageKm: number;
  city: string;
  state: string;
  price: number;
  fipeValue: number;
  acceptsTrade: boolean;
  acceptedCategories: AssetCategory[];
  matchCount: number;
  photoGradient: string;
  photoUrl?: string | null;
  vehicleCategory?: AssetCategory | null;
  isDamaged?: boolean;
  previousPrice?: number | null;
}

export function fipePercent(l: Listing): number {
  return Math.round((l.price / l.fipeValue) * 100);
}

export function savings(l: Listing): number {
  return l.fipeValue - l.price;
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export const formatKm = (value: number) =>
  `${new Intl.NumberFormat("pt-BR").format(value)} km`;

export type DamageSeverity =
  | "nenhum"
  | "pequena_monta"
  | "media_monta"
  | "grande_monta";

export const damageLabel: Record<DamageSeverity, string> = {
  nenhum: "Sem sinistro",
  pequena_monta: "Sinistro de pequena monta",
  media_monta: "Sinistro de média monta",
  grande_monta: "Sinistro de grande monta",
};

export const transmissionLabel: Record<string, string> = {
  manual: "Manual",
  automatico: "Automático",
  cvt: "CVT",
  automatizado: "Automatizado",
};

export const fuelLabel: Record<string, string> = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  hibrido: "Híbrido",
  eletrico: "Elétrico",
};

export const categoryLabel: Record<AssetCategory, string> = {
  carro: "Carro",
  moto: "Moto",
  caminhao: "Caminhão",
  caminhonete: "Caminhonete",
  suv: "SUV",
  embarcacao: "Embarcação",
  maquina: "Máquina",
  trator: "Trator",
  terreno: "Terreno",
  imovel: "Imóvel",
  outro: "Outro",
};

// Dados de demonstração — na versão real vêm do Supabase (tabela `listings`)
export const mockListings: Listing[] = [
  {
    id: "1",
    brand: "Toyota",
    model: "Corolla XEi 2.0",
    modelYear: 2021,
    mileageKm: 48000,
    city: "Goiânia",
    state: "GO",
    price: 74000,
    fipeValue: 95000,
    acceptsTrade: true,
    acceptedCategories: ["suv", "caminhonete", "moto"],
    matchCount: 42,
    photoGradient: "from-slate-700 via-slate-800 to-slate-950",
  },
  {
    id: "2",
    brand: "Honda",
    model: "HR-V EXL 1.5 Turbo",
    modelYear: 2023,
    mileageKm: 21000,
    city: "Uberlândia",
    state: "MG",
    price: 118000,
    fipeValue: 142000,
    acceptsTrade: true,
    acceptedCategories: ["carro", "moto"],
    matchCount: 17,
    photoGradient: "from-zinc-600 via-zinc-800 to-black",
  },
  {
    id: "3",
    brand: "Fiat",
    model: "Toro Volcano Diesel 4x4",
    modelYear: 2022,
    mileageKm: 55000,
    city: "Brasília",
    state: "DF",
    price: 109500,
    fipeValue: 131000,
    acceptsTrade: true,
    acceptedCategories: ["carro", "suv", "terreno"],
    matchCount: 28,
    photoGradient: "from-stone-600 via-stone-800 to-stone-950",
  },
  {
    id: "4",
    brand: "Volkswagen",
    model: "T-Cross Highline 1.4 TSI",
    modelYear: 2022,
    mileageKm: 34000,
    city: "Anápolis",
    state: "GO",
    price: 98000,
    fipeValue: 119000,
    acceptsTrade: false,
    acceptedCategories: [],
    matchCount: 0,
    photoGradient: "from-neutral-600 via-neutral-800 to-neutral-950",
  },
  {
    id: "5",
    brand: "Chevrolet",
    model: "S10 High Country 2.8",
    modelYear: 2021,
    mileageKm: 72000,
    city: "Rio Verde",
    state: "GO",
    price: 158000,
    fipeValue: 189000,
    acceptsTrade: true,
    acceptedCategories: ["caminhonete", "caminhao", "imovel"],
    matchCount: 9,
    photoGradient: "from-gray-600 via-gray-800 to-gray-950",
  },
];
