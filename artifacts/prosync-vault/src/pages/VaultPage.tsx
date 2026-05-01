"use client";

import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Loader2, Phone, Mail, Globe, MapPin, Search, Building2,
  Lock, LogOut, QrCode, Repeat, Download, Camera, Trash2,
  Languages, Pencil, X, Save, CheckSquare, Square, AlertTriangle
} from "lucide-react";

const VALID_CATEGORIES = [
  "Electronics", "Clothing, Shoes & Jewelry", "Home & Kitchen",
  "Beauty & Personal Care", "Health & Household", "Toys & Games",
  "Sports & Outdoors", "Automotive", "Baby", "Pet Supplies",
  "Grocery & Gourmet Food", "Office Products", "Industrial & Scientific",
  "Tools & Home Improvement", "Garden & Outdoor", "Arts, Crafts & Sewing",
  "Cell Phones & Accessories", "Computers & Accessories", "Video Games",
  "Musical Instruments", "Movies & TV", "Software", "Handmade",
  "Amazon Devices & Accessories", "Uncategorized",
];

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
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [editTab, setEditTab] = useState<"front" | "back">("front");
  const [editForm, setEditForm] = useState<any>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete modal state (handles both single and bulk)
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean; ids: string[]; password: string; error: string; saving: boolean;
  }>({ open: false, ids: [], password: "", error: "", saving: false });

  useEffect(() => { fetchCards(); }, []);

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
      if (res.ok) { setIsAuthenticated(true); fetchCards(); }
      else { const d = await res.json(); setLoginError(d.error || "Authentication failed."); }
    } catch { setLoginError("Server communication error."); }
    finally { setIsAuthenticating(false); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setCards([]);
    setSelectedCards(new Set());
  };

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/cards");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) { setCards(data); setIsAuthenticated(true); }
    } catch { console.error("Failed to load cards"); }
    finally { setIsLoading(false); }
  };

  const toggleFlip = (id: string) => {
    if (selectedCards.size > 0) return;
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCards(new Set(filteredCards.map((c: any) => c._id)));
  const deselectAll = () => setSelectedCards(new Set());

  // Open delete modal
  const openDeleteModal = (ids: string[], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteModal({ open: true, ids, password: "", error: "", saving: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.password) {
      setDeleteModal((d) => ({ ...d, error: "Password is required to delete." }));
      return;
    }
    setDeleteModal((d) => ({ ...d, saving: true, error: "" }));

    const isBulk = deleteModal.ids.length > 1;
    try {
      let res: Response;
      if (isBulk) {
        res = await fetch("/api/cards/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: deleteModal.password, ids: deleteModal.ids }),
        });
      } else {
        res = await fetch(`/api/cards/${deleteModal.ids[0]}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: deleteModal.password }),
        });
      }
      if (res.ok) {
        setCards((prev) => prev.filter((c) => !deleteModal.ids.includes(c._id)));
        setSelectedCards((prev) => {
          const next = new Set(prev);
          deleteModal.ids.forEach((id) => next.delete(id));
          return next;
        });
        setDeleteModal({ open: false, ids: [], password: "", error: "", saving: false });
      } else {
        const err = await res.json();
        setDeleteModal((d) => ({ ...d, error: err.error || "Deletion failed.", saving: false }));
      }
    } catch {
      setDeleteModal((d) => ({ ...d, error: "Network error. Please try again.", saving: false }));
    }
  };

  const openEditModal = (card: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCard(card);
    setEditTab("front");
    setEditPassword("");
    setEditError("");
    setEditForm({
      front: {
        name: card.front?.name || "",
        title: card.front?.title || "",
        company: card.front?.company || "",
        phone: (card.front?.phone || []).join("\n"),
        email: (card.front?.email || []).join("\n"),
        website: card.front?.website || "",
        address: card.front?.address || "",
        qrData: (card.front?.qrData || []).join("\n"),
      },
      back: {
        name: card.back?.name || "",
        title: card.back?.title || "",
        company: card.back?.company || "",
        phone: (card.back?.phone || []).join("\n"),
        email: (card.back?.email || []).join("\n"),
        website: card.back?.website || "",
        address: card.back?.address || "",
        qrData: (card.back?.qrData || []).join("\n"),
      },
      category: VALID_CATEGORIES.includes(card.category) ? card.category : "Uncategorized",
    });
  };

  const handleEditSave = async () => {
    if (!editingCard || !editForm) return;
    if (!editPassword) { setEditError("Password is required to save changes."); return; }
    setEditSaving(true);
    setEditError("");
    const toArr = (s: string) => s.split("\n").map((x: string) => x.trim()).filter(Boolean);
    const payload = {
      password: editPassword,
      category: editForm.category,
      front: { ...editForm.front, phone: toArr(editForm.front.phone), email: toArr(editForm.front.email), qrData: toArr(editForm.front.qrData) },
      back: { ...editForm.back, phone: toArr(editForm.back.phone), email: toArr(editForm.back.email), qrData: toArr(editForm.back.qrData) },
    };
    try {
      const res = await fetch(`/api/cards/${editingCard._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setCards((prev: any[]) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setEditingCard(null);
      } else {
        const err = await res.json();
        setEditError(err.error || "Failed to save changes.");
      }
    } catch { setEditError("Network error. Please try again."); }
    finally { setEditSaving(false); }
  };

  const makeUrl = (url: string) => (url.startsWith("http") ? url : `https://${url}`);

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

  // Only show category pills that have at least one card
  const usedCategories = ["All", ...VALID_CATEGORIES.filter((cat) => cards.some((c) => c.category === cat))];

  const exportToExcel = () => {
    const toExport = selectedCards.size > 0
      ? cards.filter((c) => selectedCards.has(c._id))
      : filteredCards;
    if (toExport.length === 0) return alert("No cards to export.");
    const rows = toExport.map((card) => {
      const f = card.front || {};
      const b = card.back || {};
      return {
        "Name (Front)": f.name || "UNIDENTIFIED",
        "Title (Front)": f.title || "",
        "Company (Front)": f.company || "",
        "Name (Back)": b.name || "",
        "Title (Back)": b.title || "",
        "Company (Back)": b.company || "",
        Phone: [...(f.phone || []), ...(b.phone || [])].filter(Boolean).join(" | "),
        Email: [...(f.email || []), ...(b.email || [])].filter(Boolean).join(" | "),
        Website: f.website || b.website || "",
        Address: f.address || b.address || "",
        Category: card.category || "Uncategorized",
        "QR Data": [...(f.qrData || []), ...(b.qrData || [])].filter(Boolean).join(" | "),
        Translated: card.isTranslated ? `Yes (${card.originalLanguage})` : "No",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const headers = Object.keys(rows[0]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, ...rows.map((r) => String(r[h as keyof typeof r] || "").length)) + 3 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prosync Vault");
    XLSX.writeFile(wb, `prosync_vault_${selectedCards.size > 0 ? "selected_" : ""}${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#232f3e] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-[#ff9900]">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-[#00a8e1] p-3 rounded-lg"><Building2 className="w-8 h-8 text-white" /></div>
            </div>
            <h1 className="text-2xl font-black text-center text-[#232f3e] mb-6 tracking-tight">PROSYNC INTERNAL</h1>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Access Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#ff9900] outline-none" required />
                </div>
                {loginError && <p className="text-red-500 text-xs font-bold mt-2">{loginError}</p>}
              </div>
              <button type="submit" disabled={isAuthenticating} className="w-full flex justify-center bg-[#ff9900] text-[#232f3e] font-black py-3 px-4 rounded-lg">
                {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderSideData = (data: any) => {
    const hasContent = data && (data.name || data.title || data.company ||
      (data.phone?.length > 0) || (data.email?.length > 0) || data.website || data.address || (data.qrData?.length > 0));
    if (!hasContent) return (
      <div className="flex h-full items-center justify-center text-gray-300 font-black text-xs uppercase tracking-widest">No data recorded</div>
    );
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
                  <a key={i} href={`tel:${p}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-gray-700 hover:text-[#ff9900]">{p}</a>
                ))}
              </div>
            </div>
          )}
          {data.email?.length > 0 && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                {data.email.map((e: string, i: number) => (
                  <a key={i} href={`mailto:${e}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-gray-700 hover:text-[#ff9900] break-all">{e}</a>
                ))}
              </div>
            </div>
          )}
          {data.website && (
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <a href={makeUrl(data.website)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-[#00a8e1] hover:underline break-all">{data.website}</a>
            </div>
          )}
          {data.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-xs text-gray-700 leading-tight">{data.address}</span>
            </div>
          )}
          {data.qrData?.length > 0 && (
            <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-200 shrink-0">
              <div className="flex items-center gap-1 mb-2 text-[#ff9900]">
                <QrCode className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">QR Links</span>
              </div>
              <div className="flex flex-col gap-1">
                {data.qrData.map((qr: string, i: number) =>
                  qr.startsWith("http") ? (
                    <a key={i} href={qr} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-[#00a8e1] hover:underline break-all">{qr}</a>
                  ) : (
                    <span key={i} className="text-xs font-bold text-gray-600 break-all">{qr}</span>
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
    <main className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-[#232f3e] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#00a8e1] p-1.5 rounded"><Building2 className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-xl tracking-wide">PROSYNC <span className="font-light text-gray-300">VAULT</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/scan")} className="flex items-center gap-2 bg-[#ff9900] text-[#232f3e] hover:bg-[#e68a00] px-4 py-2 rounded text-sm transition-all font-black uppercase">
            <Camera className="w-4 h-4" /> Scanner
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 border border-white/20 hover:border-red-500 hover:text-red-500 px-4 py-2 rounded text-sm transition-all font-medium">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Search + Filter + Export bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Query database by name, company, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#232f3e] outline-none font-medium text-[#232f3e]"
              />
            </div>
            <button
              onClick={exportToExcel}
              className="shrink-0 flex items-center gap-2 bg-[#232f3e] text-white hover:bg-gray-800 px-5 py-3 rounded-lg font-black uppercase tracking-widest transition-colors text-sm"
            >
              <Download className="w-4 h-4 text-[#ff9900]" />
              {selectedCards.size > 0 ? `Export (${selectedCards.size} selected)` : "Export All"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {usedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${selectedCategory === cat ? "bg-[#ff9900] text-[#232f3e]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Selection toolbar — shown when cards are selected */}
        {selectedCards.size > 0 && (
          <div className="bg-[#232f3e] text-white px-5 py-3 rounded-xl flex items-center justify-between gap-4 shadow-lg">
            <span className="font-bold text-sm">
              <span className="text-[#ff9900] font-black">{selectedCards.size}</span> card{selectedCards.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-3">
              <button onClick={deselectAll} className="text-xs font-bold text-gray-300 hover:text-white transition-colors underline">
                Deselect All
              </button>
              <button
                onClick={() => openDeleteModal([...selectedCards])}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#ff9900] animate-spin" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-bold uppercase tracking-widest text-sm">No records found</div>
        ) : (
          <>
            {/* Select All row */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{filteredCards.length} record{filteredCards.length !== 1 ? "s" : ""}</span>
              <button
                onClick={selectedCards.size === filteredCards.length ? deselectAll : selectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#232f3e] transition-colors"
              >
                {selectedCards.size === filteredCards.length && filteredCards.length > 0
                  ? <><CheckSquare className="w-4 h-4 text-[#ff9900]" /> Deselect All</>
                  : <><Square className="w-4 h-4" /> Select All</>
                }
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCards.map((card) => {
                const isFlipped = flippedCards[card._id];
                const isSelected = selectedCards.has(card._id);

                return (
                  <div
                    key={card._id}
                    className={`relative w-full h-[330px] cursor-pointer group ${isSelected ? "ring-2 ring-[#ff9900] ring-offset-2 rounded-xl" : ""}`}
                    style={{ perspective: "1000px" }}
                    onClick={() => toggleFlip(card._id)}
                  >
                    {/* Checkbox overlay */}
                    <button
                      onClick={(e) => toggleSelectCard(card._id, e)}
                      className="absolute top-3 left-3 z-30 p-1 rounded-md bg-white/90 hover:bg-white shadow-sm transition-all"
                      title={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-[#ff9900]" />
                        : <Square className="w-4 h-4 text-gray-400" />
                      }
                    </button>

                    <div
                      className="relative w-full h-full transition-transform duration-500 shadow-sm hover:shadow-xl rounded-xl"
                      style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                    >
                      {/* FRONT */}
                      <div className="absolute w-full h-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col" style={{ backfaceVisibility: "hidden" }}>
                        <div className="absolute top-4 right-4 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1 z-10 bg-white px-1">
                          Front <Repeat className="w-3 h-3 group-hover:text-[#ff9900] transition-colors" />
                        </div>
                        <div className={`absolute top-10 right-3 z-20 flex flex-col gap-1 ${isFlipped ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                          <button
                            onClick={(e) => openEditModal(card, e)}
                            className="p-2 bg-white hover:bg-blue-50 text-gray-300 hover:text-blue-500 rounded-lg transition-all border border-transparent hover:border-blue-200"
                            title="Edit Record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => openDeleteModal([card._id], e)}
                            className="p-2 bg-white hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-all border border-transparent hover:border-red-200"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {card.isTranslated && card.originalLanguage && (
                          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-[#232f3e] text-[#ff9900] px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <Languages className="w-2.5 h-2.5" /> Translated from {card.originalLanguage}
                          </div>
                        )}
                        {renderSideData(card.front)}
                      </div>

                      {/* BACK */}
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
          </>
        )}
      </div>

      {/* ── DELETE MODAL ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteModal((d) => ({ ...d, open: false }))}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                <div>
                  <h2 className="font-black text-[#232f3e] text-sm uppercase tracking-widest">Confirm Deletion</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {deleteModal.ids.length === 1 ? "1 record" : `${deleteModal.ids.length} records`} will be permanently removed.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Enter Admin Password to Confirm
                </label>
                <input
                  type="password"
                  value={deleteModal.password}
                  onChange={(e) => setDeleteModal((d) => ({ ...d, password: e.target.value, error: "" }))}
                  onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-red-400 outline-none"
                  placeholder="Your vault access password"
                  autoFocus
                />
                {deleteModal.error && <p className="text-red-500 text-xs font-bold mt-1">{deleteModal.error}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal((d) => ({ ...d, open: false }))}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteModal.saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {deleteModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleteModal.saving ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingCard && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditingCard(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#232f3e] rounded-t-xl">
              <span className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#ff9900]" /> Edit Record
              </span>
              <button onClick={() => setEditingCard(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              {(["front", "back"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEditTab(tab)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${editTab === tab ? "bg-[#ff9900] text-[#232f3e]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                >
                  {tab} Side
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {(["front", "back"] as const).map((side) =>
                editTab !== side ? null : (
                  <div key={side} className="space-y-4">
                    {[
                      { label: "Name", key: "name" },
                      { label: "Title / Position", key: "title" },
                      { label: "Company", key: "company" },
                      { label: "Website", key: "website" },
                      { label: "Address", key: "address" },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">{label}</label>
                        <input
                          type="text"
                          value={editForm[side][key]}
                          onChange={(e) => setEditForm((f: any) => ({ ...f, [side]: { ...f[side], [key]: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#ff9900] outline-none"
                        />
                      </div>
                    ))}
                    {[
                      { label: "Phone Numbers (one per line)", key: "phone" },
                      { label: "Email Addresses (one per line)", key: "email" },
                      { label: "QR Code Links (one per line)", key: "qrData" },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">{label}</label>
                        <textarea
                          rows={3}
                          value={editForm[side][key]}
                          onChange={(e) => setEditForm((f: any) => ({ ...f, [side]: { ...f[side], [key]: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#ff9900] outline-none resize-none"
                          placeholder="One entry per line"
                        />
                      </div>
                    ))}
                  </div>
                )
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#ff9900] outline-none bg-white"
                >
                  {VALID_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Confirm Password to Save
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => { setEditPassword(e.target.value); setEditError(""); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#ff9900] outline-none"
                  placeholder="Enter your vault access password"
                />
                {editError && <p className="text-red-500 text-xs font-bold mt-1">{editError}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingCard(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#232f3e] hover:bg-[#ff9900] text-white hover:text-[#232f3e] rounded-lg text-sm font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
