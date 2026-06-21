/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Loader2, Trophy, Info, ExternalLink, RefreshCw, History, Calendar, Menu, X, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { predictMatch, getTodaysMatches } from "./lib/gemini";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hva´så? Hvem spiller" },
  ]);
  const [input, setInput] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [matchSuggestions, setMatchSuggestions] = useState<{ match: string }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem("football_predict_history");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }

    // Fetch todays suggestions
    async function fetchData() {
      const suggestions = await getTodaysMatches();
      setMatchSuggestions(suggestions);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const runAnalysis = async (query: string, isNewAnalysis: boolean = false) => {
    if (!query.trim() || isLoading) return;

    // Add to history
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(h => h !== query)].slice(0, 10);
      localStorage.setItem("football_predict_history", JSON.stringify(newHistory));
      return newHistory;
    });

    const contextMessages = isNewAnalysis ? [] : messages;
    
    if (isNewAnalysis) {
      setMessages([{ role: "user", content: query }]);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: query }]);
    }
    
    setIsLoading(true);
    setIsSidebarOpen(false); // Close sidebar on mobile after clicking

    try {
      const history = contextMessages.map(m => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }]
      }));

      const result = await predictMatch(query, history);
      setMessages((prev) => [...prev, { role: "assistant", content: result || "Beklager, jeg kunne ikke få et svar." }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Der opstod en fejl: " + (error as Error).message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput("");
    await runAnalysis(query, true);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = followUpInput.trim();
    if (!query) return;
    setFollowUpInput("");
    await runAnalysis(query, false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("football_predict_history");
  };

  const SidebarContent = () => (
    <>
      <div className="flex justify-between items-center lg:block">
        <div className="text-accent font-extrabold text-xl tracking-tighter">MATCHPREDICT.AI</div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-text-muted hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="space-y-8 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5">
        {/* Dagens Kampe */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted font-bold">
            <Calendar className="w-3 h-3" />
            Dagens Top Forslag
          </div>
          <div className="space-y-2">
            {matchSuggestions.length > 0 ? (
              matchSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => runAnalysis(item.match, true)}
                  disabled={isLoading}
                  className="w-full text-left bg-glass/30 hover:bg-glass/60 border border-glass-border p-3 rounded-xl transition-all group"
                >
                  <p className="text-xs text-white/80 group-hover:text-accent font-medium truncate">{item.match}</p>
                  <span className="text-[9px] text-accent/50 font-bold uppercase mt-1 inline-block">Klik for analyse</span>
                </button>
              ))
            ) : (
              <div className="text-[10px] text-text-muted/50 italic py-2">Henter dagens kampe...</div>
            )}
          </div>
        </div>

        {/* Tidligere Søgninger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-text-muted font-bold">
            <div className="flex items-center gap-2">
              <History className="w-3 h-3" />
              Tidligere Søgninger
            </div>
            {searchHistory.length > 0 && (
              <button 
                onClick={clearHistory}
                className="hover:text-accent transition-colors p-1"
                title="Ryd historik"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {searchHistory.length > 0 ? (
              searchHistory.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => runAnalysis(query, true)}
                  disabled={isLoading}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-glass-border p-3 rounded-xl transition-all"
                >
                  <p className="text-[11px] text-white/60 truncate">{query}</p>
                </button>
              ))
            ) : (
              <div className="text-[10px] text-text-muted/50 italic py-2">Ingen søgehistorik endnu</div>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-glass/50 border border-glass-border rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-bold flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-accent" /> System Indsigt
          </p>
          <p className="text-xs leading-relaxed text-text-muted italic">
            "Statistik lyver aldrig, men fodbold er følelser."
          </p>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-glass-border">
        <div className="bg-white/5 p-4 rounded-2xl text-center space-y-1">
          <p className="text-[10px] text-text-muted uppercase">System Status</p>
          <p className="text-accent text-[10px] font-bold flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            LIVE ANALYSE AKTIV
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen font-sans selection:bg-accent selection:text-black">
      <div className="max-w-[1280px] mx-auto h-screen p-4 md:p-6 gap-6 grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col gap-6 bg-glass backdrop-blur-xl border border-glass-border rounded-[24px] p-6">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-brand-bg border-r border-glass-border z-50 p-6 flex flex-col gap-6 lg:hidden"
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex flex-col gap-4 md:gap-6 overflow-hidden">
          <header className="flex justify-between items-center px-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-glass border border-glass-border rounded-xl text-accent"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-sm text-text-muted hidden sm:block">Dashboard / Forudsigelse</div>
            </div>
            <div className="lg:hidden text-accent font-extrabold text-lg tracking-tighter">MATCHPREDICT.AI</div>
            <div className="w-8 h-8 rounded-full bg-white/10 border border-glass-border"></div>
          </header>

          <div className="flex-1 flex flex-col min-h-0 bg-glass backdrop-blur-xl border border-glass-border rounded-[24px] md:rounded-[32px] overflow-hidden">
            {/* Question / Hero */}
            {messages.length <= 1 && !isLoading && (
              <div className="p-8 md:p-12 text-center flex flex-col justify-center items-center gap-4 md:gap-6">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white px-2">
                  {messages[0].content}
                </h1>
                <p className="text-xs md:text-sm text-text-muted max-w-md opacity-70">
                  Indtast to hold for at få en detaljeret sandsynlighedsberegning baseret på AI-modeller trænet i europæiske topligaer.
                </p>
              </div>
            )}

            {/* Chat View */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 md:space-y-10 scrollbar-thin scrollbar-thumb-white/10"
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[95%] md:max-w-[80%] ${
                    msg.role === "user" 
                      ? "bg-black/30 text-white rounded-2xl rounded-tr-none border border-glass-border" 
                      : "bg-white/5 border border-glass-border rounded-2xl rounded-tl-none"
                  } p-5 md:p-6 relative shadow-xl`}>
                    
                    <div className={`absolute -top-3 ${msg.role === "user" ? "right-0" : "left-0"}`}>
                      <span className="text-[8px] md:text-[9px] uppercase tracking-tighter font-black py-1 px-2 bg-brand-bg border border-glass-border rounded text-text-muted">
                        {msg.role === "user" ? "User" : "System Analyst"}
                      </span>
                    </div>

                    <div className="prose prose-invert prose-xs md:prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-accent prose-headings:tracking-tight">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.role === "assistant" && idx > 0 && (
                      <div className="mt-4 pt-4 border-t border-glass-border text-[9px] md:text-[10px] font-bold text-accent/40 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        AI MODEL v2.4 ACTIVATED
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-glass-border rounded-2xl rounded-tl-none p-5 md:p-6 flex items-center gap-3 md:gap-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    <span className="text-[10px] md:text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Analyserer kampdata...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Smart Follow-ups Area */}
            <AnimatePresence>
              {messages.length > 1 && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-4 md:px-8 py-4 md:py-5 bg-accent/5 border-t border-glass-border space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                       <span className="text-[10px] font-black text-accent uppercase tracking-widest">Stil et uddybende spørgsmål til kampen</span>
                    </div>
                    
                    <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        placeholder="Hvorfor vinder de? / Dommerens statistik?.."
                        className="flex-1 bg-white/5 border border-glass-border rounded-xl px-4 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted/30"
                      />
                      <button
                        type="submit"
                        disabled={!followUpInput.trim()}
                        className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/20 px-3 rounded-xl transition-all disabled:opacity-30"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">
                      Hurtigvalg:
                    </span>
                    {[
                      "Skadeslisten?",
                      "Dommeren?",
                      "Målscorere?",
                      "Startopstilling?"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => runAnalysis(suggestion)}
                        className="text-[10px] md:text-xs bg-white/5 hover:bg-white/10 border border-glass-border px-3 py-1.5 rounded-full text-text-muted transition-all active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Footer */}
            <div className="p-4 md:p-8 bg-black/40 border-t border-glass-border relative">
              <form onSubmit={handleSubmit} className="flex gap-2 md:gap-4 items-center">
                <div className="flex-1 relative group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ny analyse (Klub vs Klub)..."
                    className="w-full bg-black/40 border border-glass-border rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted/30"
                  />
                  {messages.length > 1 && (
                    <div className="absolute -top-2 left-4 px-2 py-0.5 bg-black border border-glass-border rounded text-[7px] font-bold text-accent uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                      Nulstiller samtalen
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase text-xs md:text-sm px-4 md:px-8 h-[48px] md:h-[58px] rounded-xl md:rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(57,255,20,0.2)] whitespace-nowrap"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyse"}
                </button>
              </form>
              <div className="mt-3 md:mt-4 flex flex-col md:flex-row justify-between items-center text-[9px] md:text-[10px] text-text-muted uppercase font-bold tracking-widest gap-2">
                <div className="flex gap-3 md:gap-4">
                   <span className="flex items-center gap-1.5"><RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3"/> Hybrid Engine</span>
                   <span className="flex items-center gap-1.5"><ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3"/> Neural Search</span>
                </div>
                <div className="hidden sm:block opacity-40">Bemærk: Baseret på historiske data. Spil ansvarligt.</div>
              </div>
            </div>
          </div>

          {/* Stats Grid Footer */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-auto">
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-[16px] md:rounded-[20px] p-3 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-black text-accent leading-none">84.2%</div>
              <div className="text-[8px] md:text-[10px] text-text-muted uppercase font-bold mt-1">Præcision</div>
            </div>
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-[16px] md:rounded-[20px] p-3 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-black text-accent leading-none">1.2M</div>
              <div className="text-[8px] md:text-[10px] text-text-muted uppercase font-bold mt-1">Kampe</div>
            </div>
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-[16px] md:rounded-[20px] p-3 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-black text-accent leading-none">AI v2.4</div>
              <div className="text-[8px] md:text-[10px] text-text-muted uppercase font-bold mt-1">Model</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
