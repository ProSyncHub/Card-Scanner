import { useState, ChangeEvent } from "react";
import { UploadCloud, Loader2, Plus, Image as ImageIcon } from "lucide-react";
import jsQR from "jsqr";

interface CardUploaderProps {
  onUploadSuccess: (frontUrl: string, backUrl?: string, frontQrCodes?: string[], backQrCodes?: string[]) => void;
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

  // Scan a specific region of a canvas for a QR code
  const scanRegion = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number
  ): string | null => {
    if (w < 20 || h < 20) return null;
    const imageData = ctx.getImageData(x, y, w, h);
    const code = jsQR(imageData.data, w, h);
    return code ? code.data : null;
  };

  // Scan all regions of an image to find every QR code — deduplicated
  const extractAllQRs = (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const W = img.width;
          const H = img.height;
          const canvas = document.createElement("canvas");
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve([]);
          ctx.drawImage(img, 0, 0, W, H);

          const found = new Set<string>();

          const tryRegion = (x: number, y: number, w: number, h: number) => {
            const result = scanRegion(ctx, x, y, w, h);
            if (result) found.add(result);
          };

          // Full image
          tryRegion(0, 0, W, H);
          // Halves
          tryRegion(0, 0, W, Math.floor(H / 2));             // top half
          tryRegion(0, Math.floor(H / 2), W, Math.floor(H / 2)); // bottom half
          tryRegion(0, 0, Math.floor(W / 2), H);             // left half
          tryRegion(Math.floor(W / 2), 0, Math.floor(W / 2), H); // right half
          // Quadrants
          tryRegion(0, 0, Math.floor(W / 2), Math.floor(H / 2));                                   // top-left
          tryRegion(Math.floor(W / 2), 0, Math.floor(W / 2), Math.floor(H / 2));                   // top-right
          tryRegion(0, Math.floor(H / 2), Math.floor(W / 2), Math.floor(H / 2));                   // bottom-left
          tryRegion(Math.floor(W / 2), Math.floor(H / 2), Math.floor(W / 2), Math.floor(H / 2));   // bottom-right
          // Thirds (horizontal)
          const third = Math.floor(H / 3);
          tryRegion(0, 0, W, third);
          tryRegion(0, third, W, third);
          tryRegion(0, third * 2, W, third);

          resolve([...found]);
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

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
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
      setStatusText("Scanning QR codes...");
      const [frontQrCodes, backQrCodes] = await Promise.all([
        extractAllQRs(frontFile),
        backFile ? extractAllQRs(backFile) : Promise.resolve([]),
      ]);

      setStatusText("Uploading to Cloud Vault...");
      const [frontUrl, backUrl] = await Promise.all([
        uploadToCloudinary(frontFile),
        backFile ? uploadToCloudinary(backFile) : Promise.resolve(undefined),
      ]);

      setStatusText("Finalizing...");
      onUploadSuccess(frontUrl, backUrl, frontQrCodes, backQrCodes);

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
        <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#232f3e] rounded-lg bg-gray-50 overflow-hidden">
          {frontFile ? (
            <img src={URL.createObjectURL(frontFile)} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Front" />
          ) : (
            <UploadCloud className="w-8 h-8 text-[#232f3e] mb-2" />
          )}
          <span className="relative z-10 text-sm font-bold text-[#232f3e] bg-white/80 px-2 py-1 rounded">Front (Required)</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "front")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={isUploading} />
        </div>

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

      <button
        onClick={handleSubmit}
        disabled={!frontFile || isUploading}
        className="w-full flex justify-center items-center gap-2 bg-[#232f3e] text-white py-3 rounded-lg font-bold hover:bg-[#ff9900] hover:text-[#232f3e] disabled:opacity-50 transition-colors"
      >
        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        {isUploading ? statusText : "PROCESS CARD(S)"}
      </button>
    </div>
  );
}
