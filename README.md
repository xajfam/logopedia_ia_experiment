# Brainstorming: Aplicació d'Anàlisi de Vídeos per a Logopèdia

Aquesta proposta detalla l'arquitectura i els passos per crear una aplicació dissenyada específicament per a logopedes, capaç d'importar vídeos des de Google Drive, extreure'n l'àudio i realitzar una transcripció exacta a nivell fonètic, evitant que la IA "corregeixi" la parla del pacient.

## 1. Visió General i Arquitectura
L'aplicació ha d'estar dissenyada amb tres blocs principals:
1.  **Frontend d'Usuari:** Per gestionar els pacients, visionar els vídeos de forma sincronitzada amb la transcripció i realitzar anotacions manuals.
2.  **Backend i Pipeline de Dades:** Per gestionar les descàrregues de Google Drive d'una manera segura i complint la normativa de privacitat (RGPD).
3.  **Motor d'Extracció i IA:** Processament de vídeo a àudio i generació de la transcripció literal/fonètica temporalitzada.

---

## 2. Fase 1: Integració amb Google Drive
El logopeda necessita un flux de treball sense friccions per carregar els vídeos de les sessions.

*   **Tecnologia:** API de Google Drive (Google Workspace) i protocol OAuth 2.0.
*   **Procés:**
    1. Botó "Connectar amb Google Drive".
    2. S'obre un Google File Picker limitat a format vídeo (`.mp4`, `.mov`, etc.).
    3. El backend descarrega una còpia efímera del vídeo al nostre servidor o directament es pot enllaçar (streaming de lectura) per processar-lo sense emmagatzemar la dada audiovisual sencera, estalviant espai.

---

## 3. Fase 2: Extracció i Preparació de l'Àudio
Els models de processament de llenguatge natural i veu treballen exclusivament amb àudio, fent innecessari carregar amb els megabytes del vídeo.

*   **Tecnologia:** FFmpeg.
*   **Procés:** Separar la pista d'àudio del vídeo de Drive de forma ràpida a un format no comprimit (habitualment `WAV`, 16kHz, mono) ideal per als models d'Inteligència Artificial. 

---

## 4. Fase 3: Transcripció Verbatim i Fonètica (El gran repte)
El repte més gran d'aplicar IA a la logopèdia és que **la majoria de sistemes comercials (Whisper, Google Cloud Speech-to-Text) estan dissenyats per autocorregir**. Apliquen un "Model de Llenguatge" per endevinar el text amb lògica gramatical, cosa que emmascara els errors com dislàlies (ex: canviar la "r" per la "l"), omissions, addicions o els bloquejos de la tartamudesa.

### Opcions i Solucions Tècniques Recomanades:

1.  **Reconeixement de Fonemes i Alfabet Fonètic (IPA/AFI):**
    En lloc d'intentar buscar "paraules", l'eina pot classificar "sons". Podem usar models de reconeixement universal de fonemes com **Allosaurus** o **Wav2Vec2.0** de Meta finetunejats només sobre bases de dades fonètiques (com TIMIT per a l'anglès, o corpus equivalents per a l'espanyol/català).

2.  **Desactivar el Model de Llenguatge (Zero Language Model Constraint):**
    Fer servir el model acústic lliure de regles gramaticals. Amb configuracions avançades de **Whisper** (com utilitzar the base model en mode no assistit o abaixant la temperatura / penalitzant la fluència estadística) podem forçar que escrigui exactament el "soroll" que escolta com si fos argot o balbuceig (ex: "pescad... pe... pescador").

3.  **Diarienització (Speaker Diarization):**
    Utilitzar llibreries com **PyAnnote.audio** per separar la veu del Logopeda de la veu del Pacient. Així evitem analitzar les instruccions que dóna el professional.

4.  **Alineació Forçada (Forced Alignment):**
    Aplicar algoritmes genètics de la parla com **Montreal Forced Aligner**. Aquestes eines agafen l'àudio i el text o els fonemes i cràen marques de temps exactes de quan comença i acaba cada fonema/síl·laba. Això permet que l'usuari cliqui a una paraula i el vídeo salti a aquell mil·lisegon exacte.

---

## 5. Fase 4: Anàlisi Logopèdica Automatitzada
Amb les marques de temps exactes i la transcripció literal temporalitzada, l'app pot generar indicadors mèdics:
*   **Mètrica de Disfluència:** Reconeixement de pauses massa llargues (> 2 segons) i prolongació de vocals.
*   **Índex d'Intel·ligibilitat:** Comparar el que ha generat el model fonètic amb el diccionari estàndard i calcular quin percentatge dels sons són incorrectes.
*   **Eina d'Anotació:** El logopeda ha de tenir un quadre de text al costat del vídeo on els errors estiguin subratllats en taronja. Clicant a la paraula se suggereix un codi logopèdic (ex: *Dislàlia R/L*, *Omissió de coda síl·làbica*, etc.).

---

## 6. Stack Tecnològic Recomanat
Aquesta base tecnològica us assegura escalabilitat i accés a les millors as llibreries actuals:

*   **Frontend (Interfície d'usuari):** **Next.js (React)** o **Vue.js**. Permet la gestió fluiïda del reproductor de vídeo amb marques de temps sobre l'element `<video>`.
*   **Backend:** **Python (FastAPI)**. Imprescindible. L'ecosistema i mercat d'eines d'IA per àudio (PyTorch, librosa, HuggingFace) estan només i exclusivament preparats per Python.
*   **Base de Dades:** **PostgreSQL** per usuaris i gestió. És aconsellable emmagatzemar els fitxers d'àudio/transcripcions a un bucket S3 de AWS per abaratar costos i garantir seguretat.
*   **Processament IA / Workers:** RabbitMQ o Celery per executar el pipeline en segon pla (extreure transcripció d'un vídeo de 30 minuts pot trigar 5 o 10 minuts amb IA i farien penjar-se el servidor si no es fa asíncronament).
