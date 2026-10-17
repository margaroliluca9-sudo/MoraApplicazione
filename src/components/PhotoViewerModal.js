import React, { useState } from "react";
import {
  Download,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// GALLERIA FOTO GLOBALE CON SCARICAMENTO
export const PhotoViewerModal = ({ photos, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = photos[currentIndex];
    link.download = `foto_intervento_${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[500] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="absolute top-4 right-4 flex gap-4 z-10 items-center">
        <div className="bg-black/50 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center shadow-lg">
          {currentIndex + 1} / {photos.length}
        </div>
        <button
          onClick={handleDownload}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Scarica questa foto"
        >
          <Download className="w-6 h-6" />
        </button>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Chiudi"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative w-full max-w-5xl flex items-center justify-center flex-1 min-h-0">
        <img
          src={photos[currentIndex]}
          alt={`Foto ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((p) => (p === 0 ? photos.length - 1 : p - 1));
              }}
              className="absolute left-2 md:left-8 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
            >
              <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((p) => (p === photos.length - 1 ? 0 : p + 1));
              }}
              className="absolute right-2 md:right-8 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
            >
              <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4 max-w-full px-4">
          {photos.map((p, i) => (
            <img
              key={i}
              src={p}
              onClick={() => setCurrentIndex(i)}
              className={`w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl cursor-pointer transition-all shadow-md ${
                currentIndex === i
                  ? "ring-4 ring-blue-500 scale-105 opacity-100"
                  : "opacity-50 hover:opacity-100 ring-1 ring-white/20"
              }`}
              alt={`Miniatura ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
