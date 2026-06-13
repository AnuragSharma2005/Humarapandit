/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PLANETS_DATA } from "../data/astrologyData";

interface PlanetArcProps {
  selectedPlanetId: string;
  onSelectPlanet: (planetId: string) => void;
}

export default function PlanetArc({ selectedPlanetId, onSelectPlanet }: PlanetArcProps) {
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Arc formula: parabolic — center planets high, edges low
  const getArcOffset = (index: number) => {
    const mid = (PLANETS_DATA.length - 1) / 2; // 4
    const dist = index - mid;
    return Math.pow(dist, 2) * 6; // px downward from center
  };

  const maxOffset = getArcOffset(0); // max downward push (at edges)

  return (
    <div className="w-full py-6 md:py-10 relative select-none">

      {/* ── DESKTOP VIEW ─────────────────────────────────── */}
      {!isMobile && (
        <div className="relative hidden md:block">
          {/* Container: height = planet height + maxArcOffset + labels */}
          <div
            className="relative w-full"
            style={{ height: maxOffset + 180 }} // enough room for arc + labels
          >
            {/* Dashed arc connection line (SVG) */}
            <svg
              className="absolute inset-0 w-full pointer-events-none"
              style={{ height: maxOffset + 180 }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(147,51,234,0)" />
                  <stop offset="15%" stopColor="rgba(147,51,234,0.35)" />
                  <stop offset="50%" stopColor="rgba(245,158,11,0.55)" />
                  <stop offset="85%" stopColor="rgba(147,51,234,0.35)" />
                  <stop offset="100%" stopColor="rgba(147,51,234,0)" />
                </linearGradient>
              </defs>
              {/* Parabolic arc path matching planet positions */}
              {(() => {
                const n = PLANETS_DATA.length;
                const points = PLANETS_DATA.map((_, i) => {
                  const x = ((i + 0.5) / n) * 100; // percentage x
                  const y = getArcOffset(i) + 40; // +40 = planet center offset
                  return `${x}%,${y}`;
                });
                const d = `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(" ");
                return (
                  <path
                    d={d}
                    stroke="url(#line-grad)"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    fill="none"
                    className="opacity-60"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })()}
            </svg>

            {/* Planets: absolutely positioned via left % + arc top offset */}
            {PLANETS_DATA.map((planet, index) => {
              const isSelected = selectedPlanetId === planet.id;
              const topOffset = getArcOffset(index);
              const leftPercent = ((index + 0.5) / PLANETS_DATA.length) * 100;

              return (
                <div
                  key={planet.id}
                  className="absolute flex flex-col items-center group cursor-pointer transition-all duration-300"
                  style={{
                    left: `${leftPercent}%`,
                    top: topOffset,
                    transform: "translateX(-50%)",
                  }}
                  onClick={() => onSelectPlanet(planet.id)}
                >
                  {/* Planet sphere */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    {/* Glow */}
                    <div
                      className={`absolute inset-[-5px] rounded-full blur-lg transition-all duration-500 ${
                        isSelected ? "opacity-80 scale-110" : "opacity-25 group-hover:opacity-55"
                      }`}
                      style={{ backgroundColor: planet.glowColor }}
                    />
                    {/* Orbit ring for selected */}
                    {isSelected && (
                      <div
                        className="absolute inset-[-8px] rounded-full border-2 border-amber-400/70 animate-pulse"
                        style={{ boxShadow: `0 0 16px ${planet.glowColor}55` }}
                      />
                    )}
                    {/* Planet image */}
                    <img
                      src={planet.image}
                      alt={planet.name}
                      className={`w-16 h-16 rounded-full object-cover relative z-10 transition-all duration-300 ${
                        isSelected ? "scale-115 ring-2 ring-amber-400/60 ring-offset-2 ring-offset-slate-950" : "hover:scale-108"
                      }`}
                      style={{ filter: `drop-shadow(0 0 10px ${planet.glowColor})` }}
                    />
                    {/* Selection dot */}
                    {isSelected && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)] z-20" />
                    )}
                  </div>

                  {/* Labels */}
                  <div className="text-center mt-3 space-y-0.5">
                    <span className={`block text-xs font-semibold transition-colors ${isSelected ? "text-amber-400" : "text-slate-100 group-hover:text-amber-400"}`}>
                      {planet.name}
                    </span>
                    <span className="block text-[9px] text-amber-500/80 font-medium">
                      ({planet.vedicName})
                    </span>
                    <span className="block text-[8px] text-slate-500 font-mono tracking-tight">
                      {planet.degree}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MOBILE VIEW ──────────────────────────────────── */}
      {isMobile && (
        <div className="md:hidden">
          <div
            ref={scrollRef}
            className="flex flex-nowrap items-end gap-5 overflow-x-auto pb-4 px-6 snap-x snap-mandatory scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {PLANETS_DATA.map((planet) => {
              const isSelected = selectedPlanetId === planet.id;
              return (
                <div
                  key={planet.id}
                  className="flex-shrink-0 snap-center flex flex-col items-center group cursor-pointer transition-all duration-300"
                  onClick={() => onSelectPlanet(planet.id)}
                >
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <div
                      className={`absolute inset-[-5px] rounded-full blur-lg transition-all duration-500 ${isSelected ? "opacity-80 scale-110" : "opacity-20 group-hover:opacity-55"}`}
                      style={{ backgroundColor: planet.glowColor }}
                    />
                    <img
                      src={planet.image}
                      alt={planet.name}
                      className={`w-10 h-10 rounded-full object-cover relative z-10 transition-all duration-300 ${isSelected ? "ring-2 ring-white/70 ring-offset-2 ring-offset-slate-950 scale-110" : "hover:scale-105"}`}
                      style={{ filter: `drop-shadow(0 0 8px ${planet.glowColor})` }}
                    />
                    {isSelected && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)] z-20" />
                    )}
                  </div>
                  <div className="text-center mt-2.5 space-y-0.5">
                    <span className={`block text-[11px] font-semibold transition-colors ${isSelected ? "text-amber-400" : "text-slate-100 group-hover:text-amber-400"}`}>
                      {planet.name}
                    </span>
                    <span className="block text-[9px] text-amber-500/80 font-medium">
                      ({planet.vedicName})
                    </span>
                    <span className="block text-[8px] text-slate-500 font-mono tracking-tight">
                      {planet.degree}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[9px] text-slate-600 font-mono mt-2 tracking-widest">
            ← swipe to explore all planets →
          </p>
        </div>
      )}
    </div>
  );
}
