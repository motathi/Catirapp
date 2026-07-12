# Serviço de facematch (DeepFace)

Microserviço que compara **documento × selfie** e diz se são a mesma pessoa.
Usado na verificação de identidade (KYC) do cadastro. Roda **fora da Vercel**
(a Vercel/Supabase não executam Python + TensorFlow).

Nenhuma imagem é armazenada — tudo é processado em memória e descartado.

## Endpoints

- `GET /health` → `{ ok, model, detector }`
- `POST /verify` (multipart) → campos `document` e `selfie` (arquivos de imagem),
  header `Authorization: Bearer <FACE_VERIFY_TOKEN>`.
  - `200 { verified: bool, distance: number, threshold: number, model: string }`
  - `401` token inválido · `400` imagem inválida · `422` rosto não detectado

## Variáveis de ambiente

| var | default | descrição |
|-----|---------|-----------|
| `FACE_VERIFY_TOKEN` | — | **obrigatório**. Segredo compartilhado com o backend do app. |
| `FACE_MODEL` | `VGG-Face` | modelo do DeepFace (ex.: `Facenet512`, `ArcFace`). |
| `FACE_DETECTOR` | `opencv` | detector de rosto (ex.: `retinaface`, `mtcnn` — mais precisos, mais pesados). |
| `PORT` | `8080` | porta HTTP (injetada por Cloud Run/Render). |

## Rodar localmente

```bash
cd services/face-verify
pip install -r requirements.txt
export FACE_VERIFY_TOKEN=um-segredo-forte
uvicorn main:app --port 8080
# teste:
curl -s -X POST http://localhost:8080/verify \
  -H "Authorization: Bearer $FACE_VERIFY_TOKEN" \
  -F document=@documento.jpg -F selfie=@selfie.jpg
```

## Deploy (Docker)

```bash
docker build -t catire-face-verify services/face-verify
docker run -p 8080:8080 -e FACE_VERIFY_TOKEN=um-segredo-forte catire-face-verify
```

### Google Cloud Run (exemplo)

```bash
gcloud run deploy catire-face-verify \
  --source services/face-verify \
  --region southamerica-east1 \
  --memory 2Gi --cpu 2 --no-allow-unauthenticated \
  --set-env-vars FACE_VERIFY_TOKEN=um-segredo-forte
```

> Precisa de ~1.5–2 GB de RAM (TensorFlow). Render/Fly.io/Railway também servem;
> basta apontar para este diretório/Dockerfile.

## Ligando no app

No projeto Next (Vercel), configure:

- `FACE_VERIFY_URL` = URL pública deste serviço (ex.: `https://catire-face-verify-xxxx.run.app`)
- `FACE_VERIFY_TOKEN` = o mesmo segredo definido aqui

O backend chama `POST {FACE_VERIFY_URL}/verify` — o serviço nunca é chamado
direto pelo navegador.
