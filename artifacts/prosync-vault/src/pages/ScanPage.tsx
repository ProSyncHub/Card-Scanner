import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import CardUploader from "../components/CardUploader";
import { Loader2, Building2, LayoutDashboard } from "lucide-react";

export default function ScanPage() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Category state to manage selected category
  const [selectedCategory, setSelectedCategory] = useState("Uncategorized");

  useEffect(() => {
    fetch("/api/cards")
      .then((res) => {
        if (res.ok) setIsAuthenticated(true);
        else setLocation("/");
      })
      .finally(() => setIsCheckingAuth(false));
  }, [setLocation]);

  const handleCloudinarySuccess = async (
    frontImageUrl: string,
    backImageUrl?: string,
    frontQrCodes?: string[],
    backQrCodes?: string[],
  ) => {
    setIsProcessingUpload(true);
    setSuccessMessage("");
    try {
      const response = await fetch("/api/process-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          frontImageUrl, 
          backImageUrl, 
          frontQrCodes, 
          backQrCodes,
          category: selectedCategory,  // Send the selected category
        }),
      });

      if (response.ok) {
        setSuccessMessage("Card extracted and saved successfully.");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const errorData = await response.json();
        alert("Extraction failed: " + errorData.error);
      }
    } catch {
      alert("System error during AI processing.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  if (isCheckingAuth)
    return (
      <div className="min-h-screen bg-[#232f3e] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#ff9900] animate-spin" />
      </div>
    );
  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-[#232f3e] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#00a8e1] p-1.5 rounded">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-wide">
            PROSYNC <span className="font-light text-[#ff9900]">SCANNER</span>
          </span>
        </div>
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 border border-white/20 hover:border-[#ff9900] hover:text-[#ff9900] px-4 py-2 rounded text-sm transition-all font-medium"
        >
          <LayoutDashboard className="w-4 h-4" /> Go to Vault
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-[#ff9900]">
          <h2 className="text-xl font-black text-[#232f3e] uppercase tracking-widest mb-6 text-center">Data Entry Node</h2>

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#ff9900] outline-none"
            >
              <option value="Uncategorized">Uncategorized</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing, Shoes & Jewelry">Clothing, Shoes & Jewelry</option>
              <option value="Home & Kitchen">Home & Kitchen</option>
              <option value="Beauty & Personal Care">Beauty & Personal Care</option>
              <option value="Health & Household">Health & Household</option>
              <option value="Toys & Games">Toys & Games</option>
              <option value="Sports & Outdoors">Sports & Outdoors</option>
              <option value="Automotive">Automotive</option>
              <option value="Baby">Baby</option>
              <option value="Pet Supplies">Pet Supplies</option>
              <option value="Grocery & Gourmet Food">Grocery & Gourmet Food</option>
              <option value="Office Products">Office Products</option>
              <option value="Industrial & Scientific">Industrial & Scientific</option>
              <option value="Tools & Home Improvement">Tools & Home Improvement</option>
              <option value="Garden & Outdoor">Garden & Outdoor</option>
              <option value="Arts, Crafts & Sewing">Arts, Crafts & Sewing</option>
              <option value="Cell Phones & Accessories">Cell Phones & Accessories</option>
              <option value="Computers & Accessories">Computers & Accessories</option>
              <option value="Video Games">Video Games</option>
              <option value="Musical Instruments">Musical Instruments</option>
              <option value="Movies & TV">Movies & TV</option>
              <option value="Software">Software</option>
              <option value="Handmade">Handmade</option>
              <option value="Amazon Devices & Accessories">Amazon Devices & Accessories</option>
            </select>
          </div>

          <CardUploader onUploadSuccess={handleCloudinarySuccess} />

          {isProcessingUpload && (
            <div className="flex items-center justify-center mt-6 space-x-3 text-[#ff9900] bg-gray-50 p-4 rounded-lg border border-gray-100">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-bold text-[#232f3e]">Executing AI Extraction Protocol...</span>
            </div>
          )}

          {successMessage && !isProcessingUpload && (
            <div className="mt-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg text-center font-bold uppercase tracking-wider text-sm">
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}