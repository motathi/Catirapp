"""Serviço de facematch para verificação de identidade (KYC) do Catire.

Recebe duas imagens (documento e selfie), roda o DeepFace e devolve se são a
mesma pessoa. NÃO persiste nenhuma imagem — tudo é processado em memória. O
acesso é protegido por um token compartilhado (FACE_VERIFY_TOKEN); apenas o
backend do app deve chamar este serviço.
"""

import io
import os

import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

API_TOKEN = os.environ.get("FACE_VERIFY_TOKEN", "")
# Padrão calibrado para KYC (documento x selfie): Facenet512 é mais preciso que
# o VGG-Face e o RetinaFace detecta rostos melhor em fotos de documento.
MODEL_NAME = os.environ.get("FACE_MODEL", "Facenet512")
DETECTOR = os.environ.get("FACE_DETECTOR", "retinaface")
MAX_BYTES = int(os.environ.get("FACE_MAX_BYTES", str(8 * 1024 * 1024)))

app = FastAPI(title="Catire Face Verify")


@app.on_event("startup")
def _warmup() -> None:
    # Pré-carrega o modelo para não pagar a latência no primeiro request.
    DeepFace.build_model(MODEL_NAME)


def _read_image(raw: bytes) -> np.ndarray:
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("empty or too large")
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    # PIL entrega RGB; DeepFace/opencv esperam BGR.
    return np.asarray(img)[:, :, ::-1].copy()


def _authorized(authorization: str) -> bool:
    return bool(API_TOKEN) and authorization == f"Bearer {API_TOKEN}"


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": MODEL_NAME, "detector": DETECTOR}


@app.post("/verify")
async def verify(
    document: UploadFile = File(...),
    selfie: UploadFile = File(...),
    authorization: str = Header(default=""),
) -> JSONResponse:
    if not _authorized(authorization):
        raise HTTPException(status_code=401, detail="unauthorized")

    try:
        doc = _read_image(await document.read())
        face = _read_image(await selfie.read())
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_image")

    try:
        result = DeepFace.verify(
            img1_path=doc,
            img2_path=face,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True,
        )
    except ValueError:
        # Rosto não detectado em uma das imagens (foto ruim, sem rosto, etc.).
        return JSONResponse(
            status_code=422,
            content={"error": "face_not_detected"},
        )

    return JSONResponse(
        content={
            "verified": bool(result["verified"]),
            "distance": float(result["distance"]),
            "threshold": float(result["threshold"]),
            "model": str(result.get("model", MODEL_NAME)),
        }
    )
