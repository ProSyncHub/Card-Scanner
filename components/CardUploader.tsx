"use client";

import { useState, ChangeEvent } from "react";
import { UploadCloud, Loader2, Plus, Image as ImageIcon } from "lucide-react";
import jsQR from "jsqr";

interface CardUploaderProps {
  onUploadSuccess: (frontUrl: string, backUrl?: string, frontQr?: string | null, backQr?: string | null) => void;
}

export default function CardUploader({ onUploadSuccess }: CardUploaderProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (file) side === "front" ? setFrontFile(file) : setBackFile(file);
  };

  // MATHEMATICAL QR SCANNER (NON-AI)
  const extractQR = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          resolve(code ? code.data : null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "business_cards"); 
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!frontFile) return alert("Front image is required.");
    setIsUploading(true);
    
    try {
      setStatusText("Scanning QR locally...");
      const frontQr = await extractQR(frontFile);
      const backQr = backFile ? await extractQR(backFile) : null;

      setStatusText("Uploading to Cloud Vault...");
      const frontUrl = await uploadToCloudinary(frontFile);
      const backUrl = backFile ? await uploadToCloudinary(backFile) : undefined;
      
      setStatusText("Finalizing...");
      // Passing data to parent (No Tesseract strings needed)
      onUploadSuccess(frontUrl, backUrl, frontQr, backQr);
      
      setFrontFile(null);
      setBackFile(null);
    } catch (error) {
      console.error(error);
      alert("System failure during local processing or upload.");
    } finally {
      setIsUploading(false);
      setStatusText("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Front Input */}
        <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#232f3e] rounded-lg bg-gray-50 overflow-hidden">
          {frontFile ? (
            <img src={URL.createObjectURL(frontFile)} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Front" />
          ) : (
            <UploadCloud className="w-8 h-8 text-[#232f3e] mb-2" />
          )}
          <span className="relative z-10 text-sm font-bold text-[#232f3e] bg-white/80 px-2 py-1 rounded">Front (Required)</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "front")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={isUploading} />
        </div>

        {/* Back Input */}
        <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
          {backFile ? (
            <img src={URL.createObjectURL(backFile)} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Back" />
          ) : (
            <Plus className="w-8 h-8 text-gray-400 mb-2" />
          )}
          <span className="relative z-10 text-sm font-bold text-gray-600 bg-white/80 px-2 py-1 rounded">Back (Optional)</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "back")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={isUploading} />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!frontFile || isUploading} className="w-full flex justify-center items-center gap-2 bg-[#232f3e] text-white py-3 rounded-lg font-bold hover:bg-[#ff9900] hover:text-[#232f3e] disabled:opacity-50 transition-colors">
        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        {isUploading ? statusText : "PROCESS CARD(S)"}
      </button>
    </div>
  );
}