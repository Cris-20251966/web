
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { suggestPalette } from './services/geminiService';
import { GradientColor, GradientType, SavedGradient } from './types';
import { spanishColors, getColorGamma, isValidHex, parseHex, rgbToHex } from './utils/colorUtils';
import { 
  Plus, 
  Minus,
  Trash2, 
  Sparkles, 
  Copy, 
  RefreshCw, 
  ChevronRight, 
  Layers, 
  Palette, 
  Library, 
  Search, 
  X, 
  Heart, 
  Save, 
  CheckCircle2,
  RotateCcw,
  Bookmark,
  Info
} from 'lucide-react';

const App: React.FC = () => {
  // --- Estados Principales ---
  const [colors, setColors] = useState<GradientColor[]>([
    { id: '1', hex: '#6366f1', stop: 0 },
    { id: '2', hex: '#a855f7', stop: 100 }
  ]);
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(135);
  const [loading, setLoading] = useState(false);
  
  // --- Estados de UI ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [favName, setFavName] = useState('');
  const [copied, setCopied] = useState(false);
  const [colorFormat, setColorFormat] = useState<'hex' | 'rgb'>('hex');

  // --- Estados de Persistencia ---
  const [favorites, setFavorites] = useState<SavedGradient[]>([]);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos al iniciar
  useEffect(() => {
    console.log('App montado');
    const savedFavs = localStorage.getItem('gradientCris_favs');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Error cargando favoritos", e);
      }
    }
    const savedLogo = localStorage.getItem('gradientCris_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  // Guardar favoritos automáticamente al cambiar
  useEffect(() => { 
    localStorage.setItem('gradientCris_favs', JSON.stringify(favorites)); 
  }, [favorites]);

  // Enfocar buscador cuando se abre la librería
  useEffect(() => {
    if (showLibrary) {
      setTimeout(() => libraryInputRef.current?.focus(), 100);
    }
  }, [showLibrary]);

  // --- Lógica del Degradado Robustecida ---
  const gradientCSS = useMemo(() => {
    const renderableColors = colors
      .filter(c => isValidHex(c.hex))
      .sort((a, b) => (a.stop || 0) - (b.stop || 0));
    
    if (renderableColors.length < 2) {
      const fallback = renderableColors.length > 0 ? renderableColors[0].hex : '#6366f1';
      return `linear-gradient(${angle}deg, ${fallback} 0%, ${fallback} 100%)`;
    }

    const stops = renderableColors.map(c => `${c.hex} ${c.stop}%`).join(', ');
    
    if (gradientType === 'linear') return `linear-gradient(${angle}deg, ${stops})`;
    if (gradientType === 'radial') return `radial-gradient(circle, ${stops})`;
    return `conic-gradient(from ${angle}deg, ${stops})`;
  }, [colors, gradientType, angle]);

  // --- Funciones de Gestión ---
  const addColor = (hex: string = '#ec4899') => {
    if (colors.length >= 10) return alert("Máximo 10 colores permitidos");
    const lastStop = colors[colors.length - 1]?.stop ?? 90;
    const nextStop = Math.min(100, lastStop + 10);
    setColors([...colors, { id: Math.random().toString(36).substr(2, 9), hex, stop: nextStop }]);
  };

  const removeLastColor = () => {
    if (colors.length > 2) setColors(colors.slice(0, -1));
    else alert("Se necesitan al menos 2 colores para un degradado.");
  };

  const updateColorHex = (id: string, newHex: string) => {
    let formattedHex = newHex.trim();
    if (formattedHex && !formattedHex.startsWith('#') && /^[0-9A-F]{3,8}$/i.test(formattedHex)) {
      formattedHex = '#' + formattedHex;
    }
    setColors(colors.map(c => c.id === id ? { ...c, hex: formattedHex } : c));
  };

  const updateColorRGB = (id: string, r: number, g: number, b: number) => {
    const newHex = rgbToHex(r, g, b);
    setColors(colors.map(c => c.id === id ? { ...c, hex: newHex } : c));
  };

  const saveToFavorites = () => {
    const name = favName.trim() || `Mi Diseño ${favorites.length + 1}`;
    
    const newFav: SavedGradient = { 
      id: Date.now().toString(), 
      name: name, 
      colors: JSON.parse(JSON.stringify(colors)),
      type: gradientType, 
      angle, 
      css: gradientCSS 
    };

    setFavorites([newFav, ...favorites]);
    setFavName('');
    alert(`¡"${name}" guardado con éxito!`);
  };

  const loadFavorite = (fav: SavedGradient) => {
    setColors(fav.colors);
    setGradientType(fav.type);
    setAngle(fav.angle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Seguro que quieres eliminar este diseño?")) {
      setFavorites(favorites.filter(f => f.id !== id));
    }
  };

  const handleAISuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const result = await suggestPalette(aiPrompt, 6);
      const newColors = result.colors.map((hex, index, arr) => ({
        id: Math.random().toString(36).substr(2, 9),
        hex,
        stop: Math.round((index / (arr.length - 1)) * 100)
      }));
      setColors(newColors);
      setShowAiInput(false);
      setAiPrompt('');
    } catch (err) {
      alert("La IA está descansando.");
    } finally {
      setLoading(false);
    }
  };

  const copyCSS = () => {
    navigator.clipboard.writeText(`background: ${gradientCSS};`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtrado de la librería
  const filteredLibrary = useMemo(() => {
    const search = librarySearch.toLowerCase().trim();
    if (!search) return Object.entries(spanishColors);
    
    return Object.entries(spanishColors).filter(([name, hex]) => 
      name.toLowerCase().includes(search) || 
      hex.toLowerCase().includes(search)
    );
  }, [librarySearch]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden text-slate-900 font-sans">
      <aside className="w-full lg:w-[420px] bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-6 z-10 shadow-xl scrollbar-hide">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl overflow-hidden cursor-pointer hover:scale-105 transition-all border-4 border-white ring-1 ring-slate-100" 
              onClick={() => fileInputRef.current?.click()}
            >
              {customLogo ? <img src={customLogo} className="w-full h-full object-cover" /> : <Palette className="w-8 h-8" />}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => { 
                  setCustomLogo(reader.result as string); 
                  localStorage.setItem('gradientCris_logo', reader.result as string); 
                };
                reader.readAsDataURL(file);
              }
            }} />
            <div>
              <h1 className="font-black text-2xl tracking-tighter leading-tight">GradientCris</h1>
              <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">Aplicación Cris web</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowFavorites(!showFavorites); setShowLibrary(false); setShowAiInput(false); }} 
              className={`p-3 rounded-2xl transition-all ${showFavorites ? 'bg-red-500 text-white shadow-xl scale-110' : 'bg-slate-50 text-red-400 hover:bg-red-50'}`}
              title="Mis Favoritos"
            >
              <Heart className={`w-5 h-5 ${showFavorites ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => { setShowLibrary(!showLibrary); setShowFavorites(false); setShowAiInput(false); }} 
              className={`p-3 rounded-2xl transition-all ${showLibrary ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'bg-slate-50 text-indigo-400 hover:bg-indigo-50'}`}
              title="Librería"
            >
              <Library className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Favoritos */}
        {showFavorites && (
          <div className="animate-in slide-in-from-right-4 duration-300 p-5 bg-red-50/50 rounded-[2.5rem] border border-red-100 space-y-4 max-h-[500px] flex flex-col shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-red-900 text-[10px] uppercase tracking-widest flex items-center gap-2"><Bookmark className="w-4 h-4 fill-red-500 text-red-500" /> GUARDAR ESTE DISEÑO</h4>
              <button onClick={() => setShowFavorites(false)} className="p-1 hover:bg-red-100 rounded-full transition-colors"><X className="w-4 h-4 text-red-400" /></button>
            </div>
            
            <div className="flex flex-col gap-2 p-1">
              <input 
                type="text" 
                placeholder="Ej: Atardecer en la playa..." 
                value={favName} 
                onChange={(e) => setFavName(e.target.value)} 
                className="w-full bg-white border-2 border-transparent rounded-2xl py-3 px-4 text-xs font-bold shadow-sm focus:border-red-500 outline-none transition-all" 
              />
              <button 
                onClick={saveToFavorites} 
                className="w-full bg-red-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 shadow-lg shadow-red-100 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> GUARDAR EN MIS FAVORITOS
              </button>
            </div>

            <div className="pt-4 border-t border-red-100">
              <h4 className="font-black text-red-900/40 text-[9px] uppercase tracking-widest mb-3">TUS DISEÑOS GUARDADOS ({favorites.length})</h4>
              <div className="space-y-2 overflow-y-auto pr-2 max-h-[220px] custom-scrollbar">
                {favorites.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <Heart className="w-8 h-8 text-red-200 mx-auto" />
                    <p className="text-red-300 text-[10px] font-bold uppercase tracking-widest">No tienes diseños guardados</p>
                  </div>
                ) : (
                  favorites.map(fav => (
                    <div 
                      key={fav.id} 
                      onClick={() => loadFavorite(fav)}
                      className="flex items-center gap-3 p-3 bg-white rounded-3xl border-2 border-white hover:border-red-200 transition-all shadow-sm group cursor-pointer active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-2xl shadow-inner shrink-0 border-2 border-slate-50" style={{ background: fav.css }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 truncate">{fav.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{fav.colors.length} colores • {fav.type}</p>
                      </div>
                      <button 
                        onClick={(e) => deleteFavorite(fav.id, e)} 
                        className="text-slate-200 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panel Library (Mejorado buscador y visuales) */}
        {showLibrary && (
          <div className="animate-in slide-in-from-right-4 duration-300 p-5 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-4 max-h-[580px] flex flex-col shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-indigo-900 text-[10px] uppercase tracking-widest flex items-center gap-2"><Library className="w-4 h-4 text-indigo-500" /> LIBRERÍA DE COLORES</h4>
              <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-indigo-100 rounded-full transition-colors"><X className="w-4 h-4 text-indigo-300" /></button>
            </div>
            
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input 
                ref={libraryInputRef}
                type="text" 
                placeholder="Busca por nombre o HEX (#...)" 
                value={librarySearch} 
                onChange={(e) => setLibrarySearch(e.target.value)} 
                className="w-full bg-white border-2 border-transparent rounded-2xl py-3 pl-11 pr-10 text-xs font-bold shadow-sm focus:border-indigo-500 outline-none transition-all" 
              />
              {librarySearch && (
                <button 
                  onClick={() => setLibrarySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {filteredLibrary.length > 0 ? (
                filteredLibrary.map(([name, hex]) => {
                  const info = parseHex(hex);
                  return (
                    <button 
                      key={name} 
                      onClick={() => { addColor(hex); setShowLibrary(false); }} 
                      className="w-full flex items-center gap-4 p-3 bg-white rounded-[2rem] border-2 border-white hover:border-indigo-400 transition-all text-left shadow-sm group active:scale-[0.98]"
                    >
                      <div className="w-20 h-20 rounded-[1.5rem] border-2 border-slate-50 shadow-md shrink-0 transition-transform group-hover:scale-105" style={{ backgroundColor: hex }} />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black text-slate-800 capitalize truncate mb-1">{name}</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50/50 inline-block px-2 py-0.5 rounded-lg">{hex.toUpperCase()}</p>
                          <p className="text-[9px] font-mono font-medium text-slate-400 block">RGB({info?.rgb.r}, {info?.rgb.g}, {info?.rgb.b})</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-indigo-600">
                        <Plus className="w-5 h-5 text-slate-300 group-hover:text-white" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 px-6 text-center space-y-4 bg-white/50 rounded-[2rem] border-2 border-dashed border-indigo-100">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-black text-xs uppercase">No se encontró "{librarySearch}"</p>
                    <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">Prueba a buscar otro color o utiliza la IA para generarlo.</p>
                  </div>
                  <button 
                    onClick={() => { setShowAiInput(true); setShowLibrary(false); setAiPrompt(`Un color parecido a ${librarySearch}`); }}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-3 h-3" /> USAR IA PARA ESTO
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Section */}
        <section className="space-y-3">
          <button onClick={() => { setShowAiInput(!showAiInput); setShowLibrary(false); setShowFavorites(false); }} className={`w-full py-4 px-6 rounded-[2rem] flex items-center justify-between transition-all font-black text-[10px] uppercase tracking-widest ${showAiInput ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50'}`}>
            <span className="flex items-center gap-3"><Sparkles className="w-4 h-4" /> DISEÑAR CON IA</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showAiInput ? 'rotate-90' : ''}`} />
          </button>
          {showAiInput && (
            <form onSubmit={handleAISuggest} className="animate-in slide-in-from-top-4 duration-300 space-y-3 p-5 bg-white rounded-[2rem] border-2 border-indigo-100 border-dashed">
              <textarea rows={2} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: Atardecer en Marte..." className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'GENERAR MÁGICAMENTE'}
              </button>
            </form>
          )}
        </section>

        {/* Layers Section */}
        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><Layers className="w-4 h-4" /> CAPAS ({colors.length}/10)</h3>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button onClick={() => setColorFormat('hex')} className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all ${colorFormat === 'hex' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>HEX</button>
                <button onClick={() => setColorFormat('rgb')} className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all ${colorFormat === 'rgb' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>RGB</button>
              </div>
              <div className="flex gap-2">
                <button onClick={removeLastColor} disabled={colors.length <= 2} className="p-3 bg-slate-700 text-white rounded-xl shadow-lg transition-all active:scale-90 hover:bg-slate-800 disabled:opacity-30"><Minus className="w-5 h-5" /></button>
                <button onClick={() => addColor()} disabled={colors.length >= 10} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg transition-all active:scale-90 hover:bg-indigo-700 disabled:opacity-30"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pb-8">
            {colors.map(color => {
              const gamma = getColorGamma(color.hex);
              const isValid = isValidHex(color.hex);
              const info = parseHex(color.hex);
              
              return (
                <div key={color.id} className={`p-5 bg-white border rounded-[2.5rem] shadow-sm space-y-4 transition-all hover:shadow-xl group ${!isValid ? 'border-amber-300' : 'border-slate-100 hover:border-indigo-300'}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0 group-hover:scale-105 transition-transform">
                      <input type="color" value={isValid ? color.hex : '#000000'} onChange={(e) => updateColorHex(color.id, e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="w-full h-full rounded-[1.5rem] shadow-lg border-4 border-white ring-1 ring-slate-100" style={{ backgroundColor: isValid ? color.hex : '#f1f5f9' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {colorFormat === 'hex' ? (
                          <input type="text" value={color.hex.toUpperCase()} onChange={(e) => updateColorHex(color.id, e.target.value)} className={`font-mono font-black text-base w-full bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none uppercase transition-all ${!isValid ? 'text-amber-600' : 'text-slate-800'}`} spellCheck={false} />
                        ) : (
                          <div className="flex items-center gap-1 w-full">
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-slate-300">R</span>
                              <input type="number" min="0" max="255" value={info?.rgb.r ?? 0} onChange={(e) => updateColorRGB(color.id, parseInt(e.target.value), info?.rgb.g ?? 0, info?.rgb.b ?? 0)} className="w-12 bg-slate-50 rounded-lg text-xs font-black p-1 focus:ring-1 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-slate-300">G</span>
                              <input type="number" min="0" max="255" value={info?.rgb.g ?? 0} onChange={(e) => updateColorRGB(color.id, info?.rgb.r ?? 0, parseInt(e.target.value), info?.rgb.b ?? 0)} className="w-12 bg-slate-50 rounded-lg text-xs font-black p-1 focus:ring-1 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-slate-300">B</span>
                              <input type="number" min="0" max="255" value={info?.rgb.b ?? 0} onChange={(e) => updateColorRGB(color.id, info?.rgb.r ?? 0, info?.rgb.g ?? 0, parseInt(e.target.value))} className="w-12 bg-slate-50 rounded-lg text-xs font-black p-1 focus:ring-1 focus:ring-indigo-500 outline-none" />
                            </div>
                          </div>
                        )}
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${gamma.color}`}>{gamma.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">POSICIÓN</span>
                        <span className="text-[10px] font-black text-indigo-500 font-mono">{color.stop}%</span>
                      </div>
                    </div>
                    <button onClick={() => setColors(colors.filter(c => c.id !== color.id))} className="text-slate-200 hover:text-red-500 p-2.5 hover:bg-red-50 rounded-2xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <input type="range" min="0" max="100" value={color.stop} onChange={(e) => setColors(colors.map(c => c.id === color.id ? {...c, stop: parseInt(e.target.value)} : c))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Angle Control */}
        <section className="bg-slate-50 p-6 rounded-[2.5rem] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><RotateCcw className="w-4 h-4" /> ÁNGULO</span>
            <span className="text-[10px] font-black text-indigo-600 font-mono">{angle}°</span>
          </div>
          <input type="range" min="0" max="360" value={angle} onChange={(e) => setAngle(parseInt(e.target.value))} className="w-full h-2 bg-white rounded-full appearance-none cursor-pointer accent-indigo-600" />
        </section>

        {/* Footer actions */}
        <footer className="space-y-4 pt-4 border-t border-slate-50 bg-white sticky bottom-0 -mx-6 px-6 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {(['linear', 'radial', 'conic'] as GradientType[]).map(t => (
              <button key={t} onClick={() => setGradientType(t)} className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${gradientType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}>{t}</button>
            ))}
          </div>
          <button onClick={copyCSS} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${copied ? 'bg-emerald-500 shadow-emerald-100' : 'bg-slate-900 shadow-slate-300 hover:bg-slate-800'}`}>
            {copied ? <><CheckCircle2 className="w-5 h-5" /> ¡CÓDIGO COPIADO!</> : <><Copy className="w-5 h-5" /> COPIAR CÓDIGO CSS</>}
          </button>
        </footer>
      </aside>

      {/* Preview Main Area */}
      <main className="flex-1 p-6 lg:p-12 flex flex-col bg-slate-50 relative">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>
        <div className="flex-1 bg-white rounded-[4.5rem] shadow-2xl overflow-hidden relative border-[12px] border-white flex flex-col group transition-all duration-700">
          <div className="flex-1 transition-all duration-1000 ease-out relative" style={{ background: gradientCSS }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-10 left-10 flex items-center gap-5 bg-black/10 backdrop-blur-2xl px-8 py-6 rounded-[3rem] border border-white/20 shadow-2xl hover:bg-black/20 transition-all group/watermark">
                {customLogo ? (
                  <img src={customLogo} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-xl" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/40 shadow-lg"><Palette className="w-8 h-8 text-white" /></div>
                )}
                <div className="pr-6">
                  <span className="text-white font-black text-2xl leading-none tracking-tighter block uppercase">GradientCris</span>
                  <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mt-1 block">Aplicación Cris web</span>
                </div>
              </div>
          </div>
          
          <div className="bg-white px-12 py-12 border-t border-slate-50">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
              <div className="max-w-2xl flex-1">
                <h2 className="text-slate-900 font-black text-4xl tracking-tighter mb-3">Tu obra maestra</h2>
                <div className="relative group/code">
                    <p className="text-slate-400 text-[11px] font-mono break-all bg-slate-50 px-6 py-4 rounded-[1.5rem] border border-slate-100 shadow-inner w-full pr-12">{gradientCSS}</p>
                    <button onClick={copyCSS} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-md border border-slate-100 text-indigo-500 hover:bg-indigo-50 transition-all opacity-0 group-hover/code:opacity-100"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center -space-x-6">
                {colors.filter(c => isValidHex(c.hex)).map((c, i) => (
                  <div key={c.id} className="w-20 h-20 rounded-[2rem] border-[8px] border-white shadow-2xl transition-all hover:scale-125 hover:z-50 cursor-pointer" style={{ backgroundColor: c.hex, zIndex: 10 + i }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; height: 22px; width: 22px; border-radius: 10px;
            background: #4f46e5; cursor: pointer; border: 4px solid white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            margin-top: -8px; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 6px; background: #f1f5f9; border-radius: 12px; }
      `}} />
    </div>
  );
};

export default App;
