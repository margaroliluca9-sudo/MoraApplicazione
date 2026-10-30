// Tondo con la foto del tecnico (Il mio profilo) o, se non l'ha messa, l'iniziale.
import React, { useEffect, useState } from "react";
import { loadPhoto, photoNow } from "../profile";

export const Avatar = ({ tech, name, className = "w-10 h-10", color = "blue", textClass = "" }) => {
  const [src, setSrc] = useState(() => photoNow(tech));
  const at = tech ? tech.photoAt : 0;
  useEffect(() => {
    let alive = true;
    if (!tech || !tech.photoAt) {
      setSrc(null);
      return undefined;
    }
    loadPhoto(tech).then((d) => alive && setSrc(d));
    return () => {
      alive = false;
    };
  }, [tech, at]);
  const label = String(name || (tech && tech.name) || "?");
  if (src) return <img src={src} alt={label} className={`${className} rounded-full object-cover shrink-0`} data-avatar="photo" />;
  return (
    <span className={`${className} rounded-full bg-${color}-600 text-white font-black flex items-center justify-center shrink-0 ${textClass}`} data-avatar="initial">
      {label.charAt(0).toUpperCase()}
    </span>
  );
};
