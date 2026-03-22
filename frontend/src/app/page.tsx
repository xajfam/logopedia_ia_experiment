"use client";

import { useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulari de configuració
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pipeline, setPipeline] = useState<"gemini" | "local">("local");
  const [localModel, setLocalModel] = useState<"whisper" | "whisper_allosaurus">("whisper_allosaurus");
  const [useDiarization, setUseDiarization] = useState(false);
  
  // Clàus d'API (Opcionals)
  const [geminiKey, setGeminiKey] = useState("");
  const [hfToken, setHfToken] = useState("");

  const startAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Si us plau, selecciona un arxiu de vídeo o àudio primer.");
      return;
    }
    
    if (pipeline === "gemini" && !geminiKey) {
      setErrorMsg("La IA Gemini requereix una clau d'API a Google AI Studio per posar-se en marxa.");
      return;
    }

    if (useDiarization && !hfToken) {
      setErrorMsg("La Diarització (separar Logopeda de Pacient) requereix un Token de HuggingFace.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("pipeline", pipeline);
      formData.append("localModel", pipeline === "local" ? localModel : "");
      formData.append("diarization", useDiarization.toString());
      formData.append("geminiKey", geminiKey);
      formData.append("hfToken", hfToken);

      const res = await fetch("http://localhost:8000/api/session/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to process session", err);
      setErrorMsg("Error processant l'arxiu. Revisa els logs de la terminal de FastAPI.");
    } finally {
      setLoading(false);
    }
  };

  const Sidebar = () => (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col items-start px-6 py-8 shadow-sm h-screen fixed">
      <div className="flex items-center gap-3 mb-10 w-full cursor-pointer hover:opacity-80 transition" onClick={() => { setData(null); setSelectedFile(null); }}>
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
          L
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Logopèdia AI</h1>
      </div>
      
      <nav className="flex flex-col gap-2 w-full text-sm font-medium">
        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 text-orange-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          Anàlisi de Sessions
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          Pacients
        </a>
      </nav>
    </aside>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-slate-700">Models de producció treballant...</p>
          <p className="text-sm text-slate-400">Transformant l'àudio amb FFmpeg i aplicant transductors acústics.</p>
        </div>
      </div>
    );
  }

  // Pantalla 1: Configuració
  if (!data) {
    return (
      <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
        <Sidebar />
        <main className="ml-64 w-full p-8 flex items-center justify-center min-h-screen">
          <form onSubmit={startAnalysis} className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm w-full max-w-2xl my-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              Nova Sessió d'Anàlisi Automàtica
            </h2>
            
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
                {errorMsg}
              </div>
            )}

            {/* Pujada d'arxiu */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">1. Posa l'arxiu de Vídeo / Àudio</label>
              <input 
                type="file" 
                accept="video/*,audio/*"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3"
              />
            </div>

            {/* Sel·lecció Pipeline */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">2. Escull el Model d'Intel·ligència Artificial</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`border rounded-xl p-4 cursor-pointer transition-colors ${pipeline === 'gemini' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="pipeline" value="gemini" checked={pipeline === 'gemini'} onChange={() => setPipeline('gemini')} className="text-orange-500 focus:ring-orange-500" />
                    <span className="font-semibold text-slate-900">Núvol: Gemini 1.5 Pro</span>
                  </div>
                  <p className="text-xs text-slate-500 pl-6">Model LLM restringit per prompt.</p>
                </label>
                
                <label className={`border rounded-xl p-4 cursor-pointer transition-colors ${pipeline === 'local' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="pipeline" value="local" checked={pipeline === 'local'} onChange={() => setPipeline('local')} className="text-orange-500 focus:ring-orange-500" />
                    <span className="font-semibold text-slate-900">Local (No-Internet)</span>
                  </div>
                  <p className="text-xs text-slate-500 pl-6">Només models acústics instal·lats al sistema base.</p>
                </label>
              </div>
            </div>

            {/* Opcions Locals */}
            {pipeline === 'local' && (
              <div className="mb-6 pl-4 border-l-2 border-orange-200">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Model d'Extracció Fonètica</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3">
                    <input type="radio" value="whisper_allosaurus" checked={localModel === 'whisper_allosaurus'} onChange={() => setLocalModel('whisper_allosaurus')} className="text-orange-500 focus:ring-orange-500" />
                    <span className="text-sm text-slate-800">Whisper (Base) + Allosaurus (Processament de Lletres/IPA)</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" value="whisper" checked={localModel === 'whisper'} onChange={() => setLocalModel('whisper')} className="text-orange-500 focus:ring-orange-500" />
                    <span className="text-sm text-slate-800">Només Whisper (Strict Format / Sense Correcció Grammar)</span>
                  </label>
                </div>
              </div>
            )}

            {/* API Keys (If needed) */}
            {pipeline === 'gemini' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Clau de Google AI Studio</label>
                <input 
                  type="password" 
                  value={geminiKey}
                  placeholder="AIzaSy..."
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            )}

            {/* Extres */}
            <div className="mb-4 mt-8 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useDiarization} 
                  onChange={(e) => setUseDiarization(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-slate-300" 
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Activa Diarització Neuronal de Veu (Beta)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Identificat de forma biomètrica les converses creuades entre Logopeda i Pacient.</div>
                </div>
              </label>
            </div>

            {useDiarization && (
              <div className="mb-8 pl-8">
                <input 
                  type="password" 
                  value={hfToken}
                  placeholder="HuggingFace Token (ex: hf_...)"
                  onChange={(e) => setHfToken(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50"
                />
              </div>
            )}

            <button type="submit" className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm mt-4">
              Iniciar Extracció de Dades Mèdiques
            </button>
          </form>
        </main>
      </div>
    );
  }

  // Pantalla 2: Dashboard
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar />
      <main className="ml-64 w-full p-8 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sessió: {data.patient} ({data.date})</h2>
            <div className="flex gap-2 items-center mt-1">
               <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border border-orange-200">
                 Pipeline: {data.processConfig?.pipeline === 'gemini' ? 'Gemini 1.5 Pro' : data.processConfig?.localModel} 
                 {data.processConfig?.diarization === 'true' && ' + Diarització'}
               </span>
               <p className="text-sm text-slate-500">{data.diagnosis}</p>
            </div>
          </div>
          <button className="bg-white border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg shadow-sm hover:focus:outline-none hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Exportar Informe
          </button>
        </header>

        <div className="flex gap-6 h-full flex-1 overflow-hidden">
          {/* Left Column: Video & Indicators */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="w-full bg-slate-900 rounded-2xl aspect-video relative flex-shrink-0 shadow-sm overflow-hidden border border-slate-800/10">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-400 flex flex-col items-center">
                  <svg className="w-16 h-16 opacity-50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p className="font-medium text-sm">Reproductor de Vídeo ({data.videoUrl})</p>
                </div>
              </div>
              <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
                 <button className="text-white hover:text-orange-400 transition-colors">
                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 </button>
                 <div className="h-1.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 w-1/3"></div>
                 </div>
                 <span className="text-white/90 text-xs font-mono">03:45 / 10:22</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex-1 shadow-sm overflow-y-auto">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Anàlisi Automàtica
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">Índex d'Intel·ligibilitat</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-800">{data.metrics.intelligibilityIndex}%</span>
                    <span className="text-xs text-green-600 font-medium mb-1">↑ {data.metrics.intelligibilityDelta} avui</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${data.metrics.intelligibilityIndex}%` }}></div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">Mètrica de Disfluència</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-800">{data.metrics.disfluencyRate}<span className="text-lg text-slate-400">/min</span></span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{data.metrics.disfluencyType}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Transcription Log */}
          <div className="w-96 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Transcripció Fonètica</h3>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Live AI</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-sm">
              {data.transcription.map((t: any, idx: number) => {
                const isPatient = t.speaker === "Pacient";
                return (
                  <div key={idx} className={`flex gap-3 ${t.isAlert ? 'bg-orange-50/50 p-2 -mx-2 rounded-lg border border-orange-100/50' : ''}`}>
                    <div className="text-xs font-mono text-slate-400 whitespace-nowrap pt-1">{t.time}</div>
                    <div>
                      <span className={`font-medium ${isPatient ? 'text-emerald-600' : 'text-blue-600'}`}>{t.speaker}:</span>
                      <p className={`mt-0.5 leading-relaxed tracking-wide ${isPatient ? 'text-slate-800' : 'text-slate-600'}`}>
                        {t.segments.map((seg: any, sIdx: number) => {
                          if (seg.type === "error") {
                            return (
                              <span key={sIdx} className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-200 transition-colors border border-orange-200 relative group inline-flex items-center">
                                <span className={seg.errorType === 'Omisió /r/' ? "font-bold underline decoration-orange-400" : ""}>{seg.text}</span>
                                <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-800 text-white text-xs px-2 py-1.5 rounded shadow-lg text-center font-mono z-10">
                                  {seg.errorType} <br/> {seg.detail}
                                </span>
                              </span>
                            );
                          }
                          return <span key={sIdx}>{seg.text}</span>;
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input type="text" placeholder="Afegeix una nota manual..." className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              <button className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
