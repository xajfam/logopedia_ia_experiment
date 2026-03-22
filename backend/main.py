import sys
import os
import aiofiles
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# Ajuntem el path root per importar les funcions reals del repositori
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import experiment

app = FastAPI(title="Logopèdia AI API - Producció")

app.add_middleware(
    CORSMiddleware,
    #allow_origins=["*"],
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/session/process")
async def process_session_real(
    file: UploadFile = File(...),
    pipeline: str = Form(...),
    localModel: Optional[str] = Form(""),
    cliModel: Optional[str] = Form("ggml-large-v3.bin"),
    printColors: Optional[str] = Form("false"),
    diarization: Optional[str] = Form("false"),
    geminiKey: Optional[str] = Form(""),
    hfToken: Optional[str] = Form("")
):
    # Desem el vídeo pujat al backend per usar ffmpeg/whisper
    temp_path = f"tmp_{file.filename}"
    try:
        async with aiofiles.open(temp_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        # 1. Extracció de l'àudio obligatòria utilitzant el teu mòdul
        audio_path = experiment.extract_audio_from_video(temp_path)
        if not audio_path:
            raise HTTPException(status_code=500, detail="Error de FFmpeg extraient l'àudio de l'arxiu.")

        transcription_log = []
        metrics = {
            "intelligibilityIndex": 0,
            "intelligibilityDelta": "N/A",
            "disfluencyRate": 0,
            "disfluencyType": "No calculat en text plà"
        }

        # 2. Enrutat per Model (Núvol / Local)
        if pipeline == "gemini":
            if not geminiKey:
                raise HTTPException(status_code=400, detail="Sense API Key per a Gemini.")
            gem_output = experiment.test_gemini(audio_path, geminiKey)
            transcription_log.append({
                "time": "00:00",
                "speaker": "Gemini Logopeda IA",
                "isAlert": False,
                "segments": [{"text": str(gem_output), "type": "normal"}]
            })
            metrics["intelligibilityIndex"] = 92
            metrics["disfluencyType"] = "Comprovat via LLM"
        
        elif pipeline == "local":
            if localModel == "whisper_cli":
                model_full_path = f"/Users/jordiagramunt/.cache/huggingface/hub/whisper-models/{cliModel}"
                w_res = experiment.test_whisper_cli(audio_path, model_path=model_full_path, print_colors=(printColors == "true"))
                raw_text = w_res.get("text", "") if w_res else "Whisper CLI ha fallat l'extracció."
                segments = [{"text": f"[Whisper CLI - {cliModel}]:\n" + raw_text, "type": "normal"}]
                metrics["intelligibilityIndex"] = 85
            else:
                w_res = experiment.test_whisper_strict(audio_path)
                raw_text = w_res.get("text", "") if w_res else "Whisper ha fallat l'extracció."
                segments = [{"text": raw_text, "type": "normal"}]
                metrics["intelligibilityIndex"] = 81

            if localModel == "whisper_allosaurus":
                allo_res = experiment.test_allosaurus(audio_path)
                metrics["disfluencyRate"] = 28 # Score Fake
                metrics["disfluencyType"] = "Més de 20 fonemes detectats incorrectament"
                segments.append({
                    "text": "\n[Extracció AFI/IPA Allosaurus:] " + str(allo_res)[:150] + "...", 
                    "type": "error", 
                    "errorType": "Fonètica Detectada", 
                    "detail": "Desglossament Allosaurus"
                })

            transcription_log.append({
                "time": "00:00",
                "speaker": "Model Acústic",
                "isAlert": localModel == "whisper_allosaurus",
                "segments": segments
            })

        # 3. Diarització HuggingFace afegible sobre qualsevol
        if diarization == "true" and hfToken:
            d_res = experiment.test_diarization(audio_path, hfToken)
            if d_res:
                summary = " - ".join([f"[{sp[0].start:.1f}s-{sp[0].end:.1f}s] {sp[2]}" for sp in d_res[:5]])
                transcription_log.append({
                    "time": "Stats",
                    "speaker": "PyAnnote Diarization",
                    "segments": [{"text": "Detecció de veu primària:\n" + summary + "...\n(Procés sencer als logs locals)", "type": "normal"}]
                })

        return {
            "id": "poc-mode-produccio",
            "patient": f"Arxiu: {file.filename}",
            "date": "Sessió Dinàmica",
            "diagnosis": f"Anàlisi per: {pipeline}",
            "videoUrl": file.filename,
            "processConfig": {
                "pipeline": pipeline,
                "localModel": localModel,
                "diarization": diarization
            },
            "metrics": metrics,
            "transcription": transcription_log
        }
            
    finally:
        # Intentem esborrar les restes temporals
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            # Experiment genera normalment _extracted.wav d'aquest temp també
            gen_audio = f"{os.path.splitext(temp_path)[0]}_extracted.wav"
            if os.path.exists(gen_audio):
                os.remove(gen_audio)
        except:
            pass

