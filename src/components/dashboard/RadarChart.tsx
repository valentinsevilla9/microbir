"use client";

import { useMemo, useState } from "react";

interface RadarData {
  asignatura: string;
  labelCorto: string;
  precision: number;
  intentos: number;
}

interface RadarChartProps {
  data: RadarData[];
  size?: number;
  // Mapa de { asignatura: { tema: fallos } }
  desgloseTemas?: Record<string, Record<string, number>>;
}

export default function RadarChart({ data, size = 320, desgloseTemas = {} }: RadarChartProps) {
  const center = size / 2;
  const radius = center - 60; // Margen ampliado para nombres completos
  
  const [selectedAsignatura, setSelectedAsignatura] = useState<string | null>(null);

  // Nombres completos para las 8 ramas
  const ASIGNATURAS_ORDEN = [
    { id: "Fisiología y Anatomía", label: "Fisiología & Anat." },
    { id: "Inmunología", label: "Inmunología" },
    { id: "Hematología", label: "Hematología" },
    { id: "Microbiología y Parasitología", label: "Microbiología & Parasito." },
    { id: "Bioquímica y Biología Molecular", label: "Bioquímica & Biología Mol." },
    { id: "Biología Celular e Histología", label: "Bio. Celular e Histología" },
    { id: "Genética", label: "Genética" },
    { id: "Estadística y Metodología", label: "Estadística & Metod." },
  ];

  // Mapear los datos de entrada al orden estricto de 8 ejes
  const chartData = useMemo(() => {
    return ASIGNATURAS_ORDEN.map((cat) => {
      const match = data.find((d) => d.asignatura === cat.id);
      return {
        asignatura: cat.id,
        label: cat.label,
        precision: match ? match.precision : 0,
        intentos: match ? match.intentos : 0,
      };
    });
  }, [data]);

  const numAxes = chartData.length; // Siempre 8
  const angleStep = (Math.PI * 2) / numAxes;

  // Función para calcular coordenadas (x, y) dado un porcentaje (0-1) y el índice del eje
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2; // -PI/2 para empezar arriba
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  // Puntos del polígono de datos
  const dataPoints = chartData
    .map((d, i) => {
      const { x, y } = getCoordinates(d.precision / 100, i);
      return `${x},${y}`;
    })
    .join(" ");

  // Cuadrícula de fondo (pentágonos concéntricos al 20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <div className="relative flex flex-col justify-center items-center w-full max-w-sm mx-auto font-sans">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        
        {/* Cuadrícula concéntrica */}
        <g className="stroke-border fill-none">
          {gridLevels.map((level) => {
            const points = chartData
              .map((_, i) => {
                const { x, y } = getCoordinates(level, i);
                return `${x},${y}`;
              })
              .join(" ");
            return <polygon key={level} points={points} className="stroke-[1px]" />;
          })}
        </g>

        {/* Ejes (líneas desde el centro hacia afuera) */}
        <g className="stroke-border">
          {chartData.map((_, i) => {
            const { x, y } = getCoordinates(1, i);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} className="stroke-[1px]" />;
          })}
        </g>

        {/* Polígono de los datos del usuario */}
        <polygon
          points={dataPoints}
          className="fill-primary/20 stroke-primary stroke-[3px] transition-all duration-1000 ease-out"
        />

        {/* Puntos sobre el polígono para resaltar */}
        {chartData.map((d, i) => {
          const { x, y } = getCoordinates(d.precision / 100, i);
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r={4}
              className="fill-card stroke-primary stroke-[2px]"
            >
              <title>{`${d.asignatura}: ${d.precision}% aciertos (${d.intentos} preguntas)`}</title>
            </circle>
          );
        })}

        {/* Etiquetas de las asignaturas */}
        {chartData.map((d, i) => {
          const { x, y } = getCoordinates(1.2, i); 
          
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (x > center + 10) textAnchor = "start";
          if (x < center - 10) textAnchor = "end";

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              alignmentBaseline="middle"
              onClick={() => setSelectedAsignatura(d.asignatura)}
              className="fill-muted-foreground text-[10px] font-medium tracking-tight select-none sm:text-xs cursor-pointer hover:fill-primary transition-colors"
            >
              <tspan x={x} dy="-0.5em">{d.label}</tspan>
              <tspan x={x} dy="1.2em" className={`font-bold ${d.precision >= 70 ? 'fill-green-500' : d.precision >= 50 ? 'fill-yellow-500' : d.intentos > 0 ? 'fill-red-500' : 'fill-muted-foreground/40'}`}>
                {d.intentos > 0 ? `${d.precision}%` : "-"}
              </tspan>
            </text>
          );
        })}
      </svg>

      {/* Desglose por subcategorías (Modal / Caja debajo) */}
      {selectedAsignatura && desgloseTemas[selectedAsignatura] && (
        <div className="mt-4 w-full bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-sm text-foreground">{selectedAsignatura}</h4>
            <button 
              onClick={() => setSelectedAsignatura(null)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              Cerrar
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Desglose de fallos por tema:</p>
            {Object.entries(desgloseTemas[selectedAsignatura])
              .sort(([, fallosA], [, fallosB]) => fallosB - fallosA) // Ordenar de más fallos a menos
              .map(([tema, fallos]) => (
                <div key={tema} className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                  <span className="text-xs font-medium truncate pr-2" title={tema}>{tema}</span>
                  <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {fallos} fallos
                  </span>
                </div>
            ))}
            {Object.keys(desgloseTemas[selectedAsignatura]).length === 0 && (
              <p className="text-xs text-green-500 bg-green-500/10 p-2 rounded-md text-center font-medium">
                ¡Sin fallos registrados en esta asignatura!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
