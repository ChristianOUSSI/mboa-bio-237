"use client";

import { SuiviColis, PositionGps, distanceRestante, tempsRestant } from "../types/suivi_colis";

interface Props {
  suivi: SuiviColis;
}

const W = 320;
const H = 200;

function projeter(points: PositionGps[]): Map<PositionGps, { x: number; y: number }> {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 24;
  const spanLat = Math.max(maxLat - minLat, 0.005);
  const spanLng = Math.max(maxLng - minLng, 0.005);
  const echelle = Math.min(
    (W - pad * 2) / spanLng,
    (H - pad * 2) / spanLat,
  );
  const cx = (minLng + maxLng) / 2;
  const cy = (minLat + maxLat) / 2;
  const map = new Map<PositionGps, { x: number; y: number }>();
  for (const p of points) {
    map.set(p, {
      x: W / 2 + (p.longitude - cx) * echelle,
      y: H / 2 - (p.latitude - cy) * echelle,
    });
  }
  return map;
}

/**
 * Carte temps réel du colis : comptoir → cliente, avec la position
 * GPS du livreur actualisée en continu.
 */
export function CarteColis({ suivi }: Props) {
  const points: PositionGps[] = [];
  if (suivi.positionDepart) points.push(suivi.positionDepart);
  if (suivi.positionDestination) points.push(suivi.positionDestination);
  if (suivi.positionActuelle) points.push(suivi.positionActuelle);

  if (points.length < 2) {
    return (
      <div className="bg-[var(--mboa-surface)] rounded-2xl p-4 text-center">
        <p className="text-aide text-[var(--mboa-text-doux)]">
          La carte s’affichera quand le livreur partagera sa position
        </p>
      </div>
    );
  }

  const proj = projeter(points);
  const depart = suivi.positionDepart ? proj.get(suivi.positionDepart) : null;
  const dest = suivi.positionDestination ? proj.get(suivi.positionDestination) : null;
  const courant = suivi.positionActuelle ? proj.get(suivi.positionActuelle) : null;

  return (
    <div className="bg-[var(--mboa-surface)] rounded-2xl p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-xl">
        {/* Fond "terrain" */}
        <rect width={W} height={H} rx={12} fill="var(--mboa-background)" />
        {/* Routes factices */}
        <path d={`M0 ${H * 0.3} Q ${W * 0.5} ${H * 0.15} ${W} ${H * 0.35}`} stroke="var(--mboa-trait)" strokeWidth="6" fill="none" opacity="0.4" />
        <path d={`M0 ${H * 0.7} Q ${W * 0.4} ${H * 0.85} ${W} ${H * 0.6}`} stroke="var(--mboa-trait)" strokeWidth="6" fill="none" opacity="0.4" />

        {/* Trajet comptoir → cliente */}
        {depart && dest && (
          <line
            x1={depart.x}
            y1={depart.y}
            x2={dest.x}
            y2={dest.y}
            stroke="var(--mboa-primary)"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
        )}

        {/* Position du livreur → destination */}
        {courant && dest && (
          <line
            x1={courant.x}
            y1={courant.y}
            x2={dest.x}
            y2={dest.y}
            stroke="var(--mboa-secondary)"
            strokeWidth="3"
          />
        )}

        {/* Comptoir */}
        {depart && (
          <g>
            <circle cx={depart.x} cy={depart.y} r="10" fill="var(--mboa-primary)" />
            <text x={depart.x} y={depart.y + 22} textAnchor="middle" fontSize="11" fill="var(--mboa-text)">Comptoir</text>
          </g>
        )}

        {/* Cliente */}
        {dest && (
          <g>
            <circle cx={dest.x} cy={dest.y} r="10" fill="var(--mboa-secondary)" />
            <text x={dest.x} y={dest.y + 22} textAnchor="middle" fontSize="11" fill="var(--mboa-text)">Vous</text>
          </g>
        )}

        {/* Livreur (pulse) */}
        {courant && (
          <g>
            <circle cx={courant.x} cy={courant.y} r="14" fill="var(--mboa-secondary)" opacity="0.3">
              <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={courant.x} cy={courant.y} r="8" fill="var(--mboa-secondary)" />
            <text x={courant.x} y={courant.y - 14} textAnchor="middle" fontSize="11" fill="var(--mboa-text)">🏍️</text>
          </g>
        )}
      </svg>

      {(suivi.positionActuelle && suivi.positionDestination) && (
        <div className="flex justify-between mt-2 px-1">
          <span className="text-aide text-[var(--mboa-text-doux)]">
            Reste : <strong>{distanceRestante(suivi)}</strong>
          </span>
          <span className="text-aide text-[var(--mboa-text-doux)]">
            ≈ <strong>{tempsRestant(suivi)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
