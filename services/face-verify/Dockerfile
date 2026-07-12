FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEEPFACE_HOME=/app

WORKDIR /app

# Libs de sistema exigidas por opencv/tensorflow (headless).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

# Pré-baixa os pesos (modelo de reconhecimento + detector) para dentro da imagem,
# evitando download e latência no primeiro request.
RUN python -c "from deepface import DeepFace; DeepFace.build_model('Facenet512')" \
 && python -c "from retinaface import RetinaFace; RetinaFace.build_model()"

# Cloud Run/Render injetam a porta em $PORT; default 8080.
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
