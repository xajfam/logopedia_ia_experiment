import os
import argparse
import subprocess

def test_whisper_strict(audio_path):
    """
    Fase 3 - Opció 2: Desactivar Model de Llenguatge (Whisper Estricte)
    Fase 3 - Opció 4 (Proxy): Alineació temporal per paraula (word_timestamps=True)
    """
    # Utilitzem el model 'small' en lloc de 'base'. El 'base' sol donar problemes amb el català (el tradueix al castellà).
    print("\n[+] Inicialitzant Whisper (Model Small per millorar el domini bilingüe)...")
    try:
        import whisper
    except ImportError:
        print("Error: No s'ha trobat 'whisper'. Instal·la'l amb: pip install openai-whisper")
        return

    model = whisper.load_model("small")
    
    print(f"[*] Transcrivint amb Whisper (temperature=0.0, condition_on_previous_text=False, word_timestamps=True)...")
    # Afegim un initial_prompt que contingui vocabulari mixt per forçar el model a entendre
    # que hi pot haver alternança de codi (code-switching) entre català i castellà, sense traduir.
    bilingual_prompt = "Aquesta és una conversa mixta en català i castellano. Hola, com estàs? Muy bien, gracias."
    
    result = model.transcribe(
        audio_path,
        temperature=0.0,
        condition_on_previous_text=False,
        word_timestamps=True,
        initial_prompt=bilingual_prompt
    )
    
    # Mostrem l'idioma detectat per Whisper a l'inici
    print(f"\n[i] Idioma principal detectat per Whisper: {result.get('language', 'desconegut')}")
    
    print("\n--- Resultat Whisper (Transcripció estrictament processada) ---")
    print(result["text"].strip())
    
    print("\n--- Marques de temps (Alineació per paraules) ---")
    base_name = os.path.splitext(audio_path)[0]
    out_file = f"{base_name}_whisper_output.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("--- Resultat Whisper (Transcripció estrictament processada) ---\n")
        f.write(result["text"].strip() + "\n\n")
        f.write("--- Marques de temps (Alineació per paraules) ---\n")
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                line = f"[{word['start']:.2f}s -> {word['end']:.2f}s] {word['word']}"
                print(line)
                f.write(line + "\n")
    print(f"\n[*] Resultats desats a: {out_file}")
    return result


def test_whisper_cli(audio_path, model_path="/Users/jordiagramunt/.cache/huggingface/hub/whisper-models/ggml-large-v3.bin", print_colors=False):
    """
    Fase 3 - Opció 5: Reconeixement per whisper-cli utilitzant models ggml amb alta densitat / velocitat
    """
    print(f"\n[+] Inicialitzant Whisper CLI amb el model: {os.path.basename(model_path)}...")
    if not os.path.exists(model_path):
        print(f"Error: No s'ha trobat el model a {model_path}.")
        return {"text": f"Error: No s'ha trobat el model a {model_path}."}
        
    command = [
        "whisper-cli",
        "-t", "8",
        "-m", model_path,
        "-f", audio_path,
        "-l", "ca"
    ]
    
    if print_colors:
        command.append("--print-colors")
        
    try:
        print(f"[*] Executant: {' '.join(command)}")
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        # whisper-cli habitualment posa l'output de transcripció a stdout (de vegades els temps hi van o els logs a stderr)
        out_text = result.stdout.strip()
        
        base_name = os.path.splitext(audio_path)[0]
        out_file = f"{base_name}_whisper_cli_output.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(f"--- Resultat Whisper CLI ({'amb colors' if print_colors else 'sense colors'}) ---\n")
            f.write(out_text + "\n")
            
        print(f"\n[*] Resultats desats a: {out_file}")
        return {"text": out_text}
        
    except FileNotFoundError:
        print("Error: 'whisper-cli' no està instal·lat o no està al PATH (potser cal compilar-lo primer o enllaçar-lo).")
        return {"text": "Error: 'whisper-cli' no s'ha trobat instal·lat en aquesta màquina com a eixecutable de directori."}
    except subprocess.CalledProcessError as e:
        print(f"Error durant l'execució de whisper-cli: {e}")
        return {"text": f"L'execució ha fallat: {e.stderr}"}


def test_allosaurus(audio_path):
    """
    Fase 3 - Opció 1: Reconeixement de Fonemes i Alfabet Fonètic (IPA/AFI)
    """
    print("\n[+] Inicialitzant Allosaurus (Model Universal Fonètic)...")
    try:
        from allosaurus.app import read_recognizer
    except ImportError:
        print("Error: No s'ha trobat 'allosaurus'. Instal·la'l amb: pip install allosaurus")
        return

    model = read_recognizer()
    
    print(f"[*] Detectant fonemes genèrics de l'àudio...")
    result = model.recognize(audio_path)
    
    print("\n--- Resultat Allosaurus (Alfabet Fonètic IPA) ---")
    print(result)
    
    base_name = os.path.splitext(audio_path)[0]
    out_file = f"{base_name}_allosaurus_output.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("--- Resultat Allosaurus (Alfabet Fonètic IPA) ---\n")
        f.write(str(result) + "\n")
    print(f"\n[*] Resultats desats a: {out_file}")
    return result


def test_diarization(audio_path, hf_token):
    """
    Fase 3 - Opció 3: Diarienització (Separació de locutors)
    Usem pyannote.audio, que és actualment l'estàndard de la indústria.
    """
    if not hf_token:
        print("\n[!] Pyannote requereix un token per accedir als models des de HuggingFace.")
        print("    Afegeix l'argument --hf-token <el-teu-token>")
        print("    Per obtenir-lo:")
        print("    1. Ves a https://hf.co/settings/tokens")
        print("    2. Accepta els acords a: https://hf.co/pyannote/speaker-diarization-3.1")
        print("       i a: https://hf.co/pyannote/segmentation-3.0")
        return

    print("\n[+] Inicialitzant Pyannote Speaker Diarization...")
    try:
        from pyannote.audio import Pipeline
    except ImportError:
        print("Error: No s'ha trobat 'pyannote.audio'. Instal·la'l amb: pip install pyannote.audio")
        return

    try:
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        # Es pot forçar l'ús de CPU si no tenim GPU configurada per evitar errors a Mac
        import torch
        if not torch.cuda.is_available():
            pipeline.to(torch.device("cpu"))
            
    except Exception as e:
        print(f"Error carregant el model. Has posat el token correcte i acceptat les llicències a HuggingFace?\nDetall: {e}")
        return

    print(f"[*] Analitzant qui parla i quan...")
    diarization = pipeline(audio_path)
    
    print("\n--- Resultat Diarienització (Separador de veus logopeda/pacient) ---")
    
    base_name = os.path.splitext(audio_path)[0]
    out_file = f"{base_name}_diarization_output.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("--- Resultat Diarienització (Separador de veus logopeda/pacient) ---\n")
        previous_speaker = None
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker != previous_speaker:
                line = f"[{turn.start:.1f}s -> {turn.end:.1f}s] {speaker} parlant..."
                print(line)
                f.write(line + "\n")
                previous_speaker = speaker
    print(f"\n[*] Resultats desats a: {out_file}")
    return list(diarization.itertracks(yield_label=True))


def test_gemini(audio_path, gemini_key):
    """
    Fase 3: Alternatives modernes amb models de llenguatge de gran escala i context llarg.
    Utilitzant Gemini Pro com a "transcriptor expert literal" mitjançant prompt engineering.
    """
    if not gemini_key:
        print("\n[!] Per fer servir Gemini, cal proporcionar l'API Key.")
        print("    Afegeix l'argument --gemini-key <el-teu-token>")
        print("    Pots obtenir-lo gratuïtament a Google AI Studio.")
        return
        
    print("\n[+] Inicialitzant Model Gemini (Gemini 1.5 Pro)...")
    try:
        from google import genai
    except ImportError:
        print("Error: No s'ha trobat 'google-genai'. Instal·la'l amb: pip install google-genai")
        return
        
    try:
        client = genai.Client(api_key=gemini_key)
        
        print(f"[*] Pujant l'arxiu d'àudio temporalment als servidors de Google per l'Anàlisi Gemini...")
        audio_file = client.files.upload(file=audio_path)
        
        prompt = (
            "Ets un logopeda professional especialitzat en l'anàlisi de pacients bilingües "
            "(català i castellà). Necessito que transcriguis EXACTAMENT l'àudio que t'adjunto.\n\n"
            "INSTRUCCIONS CRÍTIQUES DE TRANSCRIPCIÓ:\n"
            "1. NO SEGUEIXIS CAP MODEL DE LLENGUATGE NI AUTOCORREGEIXIS RÈPLIQUES.\n"
            "2. Escriu literalment el que escoltes, fins i tot si no té sentit gramatical, si la paraula està "
            "inventada, deforma o pronunciada de forma incorrecta (com dislàlies on es canvia "
            "una lletra per una altra).\n"
            "3. Inclou tots els dubtes, quequejos, allargament de vocals (ex: 'eeemmm') i les pauses llargues "
            "marcant-les si és possible.\n"
            "4. Respecta totalment l'alternança (code-switching). Si mitja frase és en català i la següent "
            "meitat en castellà, transcriu-ho cada cosa en el seu idioma fonètic corresponent.\n"
            "Torna una resposta directament amb la transcripció literal per identificar problemes logopèdics."
        )
        
        print(f"[*] Executant inferència amb Gemini sobre l'àudio (això pot trigar uns segons per entendre el context...)\n")
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt, audio_file]
        )
        
        print("\n--- Resultat Vertex / Gemini (Prompt Logopèdia Estricte) ---")
        out_text = response.text.strip()
        print(out_text)
        
        base_name = os.path.splitext(audio_path)[0]
        out_file = f"{base_name}_gemini_output.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write("--- Resultat Vertex / Gemini (Prompt Logopèdia Estricte) ---\n")
            f.write(out_text + "\n")
        print(f"\n[*] Resultats desats a: {out_file}")
        
        # Opcionalment ens podem assegurar d'esborrar l'arxiu dels servidors al final de la prova
        client.files.delete(name=audio_file.name)
        print("\n[*] Arxiu de Google AI Studio esborrat.")
        return out_text
        
    except Exception as e:
        print(f"Error connectant o processant amb Gemini: {e}")


def extract_audio_from_video(file_path):
    """
    Fase 2: Extracció i Preparació de l'Àudio utilsant FFmpeg.
    Converteix qualsevol vídeo en format WAV mono de 16kHz ideal per IA.
    """
    audio_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg']
    _, ext = os.path.splitext(file_path)
    
    if ext.lower() in audio_extensions:
        return file_path
        
    print(f"\n[+] Format de vídeo detectat ({ext}). Extraint l'àudio amb FFmpeg...")
    audio_path = f"{os.path.splitext(file_path)[0]}_extracted.wav"
    
    try:
        # Extreure a format .wav, 16kHz frequència, 1 canal (mono)
        command = [
            "ffmpeg", "-i", file_path, "-y",
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            audio_path
        ]
        
        # Executem amagant els logs de text interns d'ffmpeg
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[*] Àudio extret correctament i desat temporalment a: {audio_path}")
        return audio_path
        
    except FileNotFoundError:
        print("Error: FFmpeg no està instal·lat al sistema. Si us plau, instal·la'l (ex: brew install ffmpeg).")
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error processant el vídeo amb FFmpeg: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="PoC Tecnologies Logopèdia (Fase 3)")
    parser.add_argument("audio_path", help="Ruta a l'arxiu d'àudio de prova (.wav, .mp3, etc.)")
    parser.add_argument("--test", choices=["whisper", "whisper-cli", "allosaurus", "diarization", "gemini", "all"], default="all",
                        help="Quina validació vols córrer? (per defecte: all)")
    parser.add_argument("--hf-token", help="Token de HuggingFace (Opcional, només per --test diarization)")
    parser.add_argument("--gemini-key", help="Clau d'API de Google AI Studio (Obligatori per --test gemini)")
    
    args = parser.parse_args()

    if not os.path.exists(args.audio_path):
        print(f"Error: L'arxiu '{args.audio_path}' no s'ha trobat.")
        return

    # Fase 2: Comprovem si és vídeo i n'extraiem l'àudio primer
    processed_audio_path = extract_audio_from_video(args.audio_path)
    if not processed_audio_path:
        return

    print("================================================================")
    print(f"🚀 Iniciant Prova de Concepte (PoC) sobre l'àudio: {os.path.basename(processed_audio_path)}")
    print("================================================================")

    if args.test in ["whisper", "all"]:
        test_whisper_strict(processed_audio_path)
        
    if args.test == "whisper-cli":
        test_whisper_cli(processed_audio_path)
        
    if args.test in ["gemini", "all"]:
        test_gemini(processed_audio_path, args.gemini_key)

    if args.test in ["allosaurus", "all"]:
        test_allosaurus(processed_audio_path)

    if args.test in ["diarization", "all"]:
        test_diarization(processed_audio_path, args.hf_token)

    print("\n[✔] Prova finalitzada.")
if __name__ == "__main__":
    main()
