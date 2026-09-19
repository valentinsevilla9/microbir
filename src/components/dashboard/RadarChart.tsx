"use client";

import { useMemo } from "react";

interface RadarData {
  asignatura: string;
  labelCorto: string;
  precision: number;
  intentos: number;
}

interface RadarChartProps {
  data: RadarData[];
  size?: number;
}

export default function RadarChart({ data, size = 320 }: RadarChartProps) {
  const center = size / 2;
  const radius = center - 50; // Margen para las etiquetas

  // Asegurarnos de que siempre hay 8 ejes en el orden correcto
  const ASIGNATURAS_ORDEN = [
    { id: "Fisiología y Anatomía", corto: "Fisio & Anat" },
    { id: "Inmunología", corto: "Inmunología" },
    { id: "Hematología", corto: "Hematología" },
    { id: "Microbiología y Parasitología", corto: "Micro & Parasito" },
    { id: "Bioquímica y Biología Molecular", corto: "Bioq & Molecular" },
    { id: "Biología Celular e Histología", corto: "Bio Cel & Histo" },
    { id: "Genética", corto: "Genética" },
    { id: "Estadística y Metodología", corto: "Estadística" },
  ];

  // Mapear los datos de entrada al orden estricto de 8 ejes
  const chartData = useMemo(() => {
    return ASIGNATURAS_ORDEN.map((cat) => {
      const match = data.find((d) => d.asignatura === cat.id);
      return {
        labelCorto: cat.corto,
        asignatura: cat.id,
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
    <div className="relative flex justify-center items-center w-full max-w-sm mx-auto font-sans">
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
          // Empujar la etiqueta un poco más afuera del radio 100%
          const { x, y } = getCoordinates(1.2, i); 
          
          // Ajustes finos de alineación según el cuadrante
          let textAnchor = "middle";
          if (x > center + 10) textAnchor = "start";
          if (x < center - 10) textAnchor = "end";

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              alignmentBaseline="middle"
              className="fill-muted-foreground text-[10px] font-medium tracking-tight select-none sm:text-xs"
            >
              <tspan x={x} dy="-0.5em">{d.labelCorto}</tspan>
              <tspan x={x} dy="1.2em" className={`font-bold ${d.precision >= 70 ? 'fill-green-500' : d.precision >= 50 ? 'fill-yellow-500' : d.intentos > 0 ? 'fill-red-500' : 'fill-muted-foreground/40'}`}>
                {d.intentos > 0 ? `${d.precision}%` : "-"}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
