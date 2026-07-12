"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Reduz a imagem (lado maior <= 900px) e recomprime como JPEG, para caber no
// limite de corpo da requisição e acelerar o upload.
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 900;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  return blob ?? file;
}

const ERROS: Record<string, string> = {
  face_not_detected:
    "Não conseguimos identificar um rosto em uma das fotos. Capriche na luz e no enquadramento e tente de novo.",
  consent_required: "É necessário autorizar o uso das imagens para continuar.",
  missing_images: "Envie a foto do documento e a selfie.",
  verification_unconfigured:
    "A verificação está temporariamente indisponível. Tente novamente em instantes.",
  verify_service_unreachable:
    "Serviço de verificação indisponível no momento. Tente novamente.",
};

function PhotoInput({
  label,
  hint,
  capture,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  capture: "environment" | "user";
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card-2 text-2xl">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
            onLoad={() => URL.revokeObjectURL(preview)}
          />
        ) : (
          "📷"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-mute">{file ? "Foto capturada ✓" : hint}</p>
      </div>
      <span className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950">
        {file ? "Trocar" : "Abrir câmera"}
      </span>
      <input
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export default function IdentityCapture() {
  const router = useRouter();
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const ready = doc && selfie && consent && !pending;

  async function submit() {
    if (!doc || !selfie || !consent || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const [docBlob, selfieBlob] = await Promise.all([
        downscale(doc),
        downscale(selfie),
      ]);
      const body = new FormData();
      body.append("document", docBlob, "document.jpg");
      body.append("selfie", selfieBlob, "selfie.jpg");
      body.append("consent", "true");

      const res = await fetch("/api/verify-identity", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        verified?: boolean;
        error?: string;
      };

      if (res.ok && data.verified) {
        router.replace("/perfil");
        router.refresh();
        return;
      }
      if (res.ok && data.verified === false) {
        setError(
          "As fotos não bateram como sendo a mesma pessoa. Confira se a selfie é sua e se o documento tem uma foto nítida do rosto.",
        );
      } else {
        setError(
          ERROS[data.error ?? ""] ??
            "Não foi possível concluir a verificação. Tente novamente.",
        );
      }
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setPending(false);
      busy.current = false;
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <PhotoInput
        label="1. Documento com foto"
        hint="RG ou CNH, com o rosto visível"
        capture="environment"
        file={doc}
        onPick={setDoc}
      />
      <PhotoInput
        label="2. Selfie"
        hint="Rosto centralizado, boa luz"
        capture="user"
        file={selfie}
        onPick={setSelfie}
      />

      <label className="mt-1 flex items-start gap-2 text-xs text-mute">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Autorizo o uso das imagens do meu documento e selfie exclusivamente
          para verificar minha identidade. As fotos não são armazenadas — só o
          resultado da checagem é guardado.
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/70 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!ready}
        className="mt-2 rounded-xl bg-emerald-500 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {pending ? "Verificando…" : "Verificar identidade"}
      </button>
    </div>
  );
}
