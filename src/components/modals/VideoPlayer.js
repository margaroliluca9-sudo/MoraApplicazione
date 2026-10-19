// Video della Guida a tutto schermo (si chiude con la X o toccando fuori)
import React from "react";
import { X } from "lucide-react";
import { videoSrc, videoPoster } from "../../guideVideos";

export const VideoPlayer = ({ video, onClose }) => (
  <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-3" data-section="guide-video" onClick={onClose}>
    <div className="w-full max-w-sm flex items-center gap-2 pb-2 text-white" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 min-w-0">
        <p className="font-black text-lg leading-tight truncate">{video.title}</p>
        <p className="text-xs text-white/70 truncate">{video.about}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Chiudi il video" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
    <video
      key={video.id}
      src={videoSrc(video)}
      poster={videoPoster(video)}
      controls
      autoPlay
      playsInline
      muted
      preload="metadata"
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm max-h-[82vh] rounded-2xl bg-black object-contain"
    />
    <p className="text-white/60 text-xs pt-2">Serve internet per vedere i video.</p>
  </div>
);
