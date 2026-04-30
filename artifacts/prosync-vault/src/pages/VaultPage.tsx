"use client";

import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Loader2, Phone, Mail, Globe, MapPin, Search, Building2,
  Lock, LogOut, QrCode, Repeat, Download, Camera, Trash2, Languages
} from "lucide-react";

export default function VaultPage() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchCards();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchCards();
      } else {
        const data = await res.json();
        setLoginError(data.error || "Authentication failed.");
      }
    } catch {
      setLoginError("Server communication error.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setCards([]);
  };

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/cards");
      if (res.status === 401) return setIsLoading(false);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCards(data);
        setIsAuthenticated(true);
      }
    } catch {
      console.error("Failed to load cards");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlip = (id: string) => setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isConfirmed = window.confirm("WARNING: Are you sure you want to permanently delete this record? This action cannot be undone.");
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCards((prev) => prev.filter((card) => card._id !== id));
      } else {
        alert("Failed to delete record from the database.");
      }
    } catch {
      alert("System error during deletion protocol.");
    }
  };

  const exportToExcel = () => {
    if (cards.length === 0) return alert("No data to export.");

    const dataToExport = cards.map((card) => {
      const front = card.front || {};
      const back = card.back || {};
      const allPhones = [...(front.phone || []), ...(back.phone || [])].filter(Boolean);
      const allEmails = [...(front.email || []), ...(back.email || [])].filter(Boolean);
      const allQrs = [...(front.qrData || []), ...(back.qrData || [])].filter(Boolean);
      return {
        "Name (Front)": front.name || "UNIDENTIFIED",
        "Title (Front)": front.title || "",
        "Company (Front)": front.company || "",
        "Name (Back)": back.name || "",
        "Title (Back)": back.title || "",
        "Company (Back)": back.company || "",
        Phone: allPhones.map(String).join(" | "),
        Email: allEmails.join(" | "),
        Website: front.website || back.website || "",
        Address: front.address || back.address || "",
        Category: card.category || "",
        "QR Data": allQrs.join(" | "),
        Translated: card.isTranslated ? "Yes" : "No",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const headers = Object.keys(dataToExport[0]);
    const colWidths = headers.map((header) => {
      const maxLength = Math.max(header.length, ...dataToExport.map((row) => (row[header as keyof typeof row] ? String(row[header as keyof typeof row]).length : 0)));
      return { wch: maxLength + 3 };
    });
    worksheet["!cols"] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prosync Vault");
    XLSX.writeFile(workbook, `prosync_vault_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const categories = ["All", ...Array.from(new Set(cards.map((c) => c.category).filter(Boolean)))];

  const filteredCards = cards.filter((card) => {
    const front = card.front || {};
    const back = card.back || {};
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (front.name?.toLowerCase() || "").includes(term) ||
      (front.company?.toLowerCase() || "").includes(term) ||
      (front.title?.toLowerCase() || "").includes(term) ||
      (back.name?.toLowerCase() || "").includes(term) ||
      (back.company?.toLowerCase() || "").includes(term) ||
      (back.title?.toLowerCase() || "").includes(term);
    const matchesCategory = selectedCategory === "All" || card.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const makeUrl = (url: string) => (url.startsWith("http") ? url : `https://${url}`);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#232f3e] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-[#ff9900]">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-[#00a8e1] p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-center text-[#232f3e] mb-2 tracking-tight">PROSYNC INTERNAL</h1>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Access Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#ff9900] outline-none"
                    required
                  />
                </div>
                {loginError && <p className="text-red-500 text-xs font-bold mt-2">{loginError}</p>}
              </div>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full flex justify-center bg-[#ff9900] text-[#232f3e] font-black py-3 px-4 rounded-lg"
              >
                {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 font-sans relative">
      <nav className="bg-[#232f3e] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#00a8e1] p-1.5 rounded">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-wide">
            PROSYNC <span className="font-light text-gray-300">VAULT</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/scan")}
            className="flex items-center gap-2 bg-[#ff9900] text-[#232f3e] hover:bg-[#e68a00] px-4 py-2 rounded text-sm transition-all font-black uppercase"
          >
            <Camera className="w-4 h-4" /> Scanner
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-white/20 hover:border-red-500 hover:text-red-500 px-4 py-2 rounded text-sm transition-all font-medium"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 w-full space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Query database by name, company, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#232f3e] outline-none font-medium text-[#232f3e]"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {categories.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCategory(cat as string)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedCategory === cat ? "bg-[#ff9900] text-[#232f3e]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat as string}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={exportToExcel}
            className="shrink-0 flex items-center gap-2 bg-[#232f3e] text-white hover:bg-gray-800 px-6 py-4 rounded-lg font-black uppercase tracking-widest transition-colors h-full"
          >
            <Download className="w-5 h-5 text-[#ff9900]" /> Export to Excel
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#ff9900] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCards.map((card) => {
              const isFlipped = flippedCards[card._id];

              const renderSideData = (data: any) => {
                const hasContent =
                  data &&
                  (data.name ||
                    data.title ||
                    data.company ||
                    (data.phone && data.phone.length > 0) ||
                    (data.email && data.email.length > 0) ||
                    data.website ||
                    data.address ||
                    (data.qrData && data.qrData.length > 0));

                if (!hasContent) {
                  return (
                    <div className="flex h-full items-center justify-center text-gray-300 font-black text-xs uppercase tracking-widest">
                      No data recorded
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col h-full">
                    {(data.name || data.title || data.company) && (
                      <div className="mb-3 pb-3 border-b border-gray-200 shrink-0 pr-8">
                        {data.name && <h2 className="text-xl font-black text-[#232f3e] leading-tight truncate">{data.name}</h2>}
                        {data.title && <p className="text-sm font-bold text-[#ff9900] truncate">{data.title}</p>}
                        {data.company && <p className="text-xs font-bold text-gray-500 truncate">{data.company}</p>}
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {data.phone?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            {data.phone.map((p: string, i: number) => (
                              <a key={i} href={`tel:${p}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-gray-700 hover:text-[#ff9900]">
                                {p}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.email?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            {data.email.map((e: string, i: number) => (
                              <a key={i} href={`mailto:${e}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-gray-700 hover:text-[#ff9900] break-all">
                                {e}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.website && (
                        <div className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <a
                            href={makeUrl(data.website)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-sm text-[#00a8e1] hover:underline break-all"
                          >
                            {data.website}
                          </a>
                        </div>
                      )}
                      {data.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="font-medium text-xs text-gray-700 leading-tight">{data.address}</span>
                        </div>
                      )}
                      {data.qrData && data.qrData.length > 0 && (
                        <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-200 shrink-0">
                          <div className="flex items-center gap-1 mb-2 text-[#ff9900]">
                            <QrCode className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">QR Links</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {data.qrData.map((qr: string, i: number) =>
                              qr.startsWith("http") ? (
                                <a key={i} href={qr} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-[#00a8e1] hover:underline break-all">
                                  {qr}
                                </a>
                              ) : (
                                <span key={i} className="text-xs font-bold text-gray-600 break-all">
                                  {qr}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  key={card._id}
                  className="relative w-full h-[330px] cursor-pointer group"
                  style={{ perspective: "1000px" }}
                  onClick={() => toggleFlip(card._id)}
                >
                  <div
                    className="relative w-full h-full transition-transform duration-500 shadow-sm hover:shadow-xl rounded-xl"
                    style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                  >
                    <div className="absolute w-full h-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col" style={{ backfaceVisibility: "hidden" }}>
                      <div className="absolute top-4 right-4 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1 z-10 bg-white px-1">
                        Front <Repeat className="w-3 h-3 group-hover:text-[#ff9900] transition-colors" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteCard(card._id, e)}
                        disabled={isFlipped}
                        className={`absolute top-10 right-3 z-20 p-2 bg-white hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-all border border-transparent hover:border-red-200 ${isFlipped ? "pointer-events-none opacity-0" : "opacity-100"}`}
                        title="Permanently Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {card.isTranslated && card.originalLanguage && (
                        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-[#232f3e] text-[#ff9900] px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                          <Languages className="w-2.5 h-2.5" />
                          Translated from {card.originalLanguage}
                        </div>
                      )}
                      {renderSideData(card.front)}
                    </div>

                    <div
                      className="absolute w-full h-full bg-[#f8f9fa] border border-gray-200 rounded-xl p-5 flex flex-col"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div className="absolute top-4 right-4 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1 z-10 bg-[#f8f9fa] px-1">
                        Back <Repeat className="w-3 h-3 group-hover:text-[#ff9900] transition-colors" />
                      </div>
                      {renderSideData(card.back)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
