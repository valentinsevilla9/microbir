-- Preguntas de ejemplo para desarrollo local (el banco real se importa con
-- supabase/pdf-fuente/generar_sql_importacion.py). Asignaturas = los 8 bloques
-- de src/lib/asignaturas.ts.
insert into public.preguntas (
  anio,
  asignatura,
  enunciado,
  opcion_1,
  opcion_2,
  opcion_3,
  opcion_4,
  respuesta_correcta
)
values
(
  2024,
  'Biología Celular e Histología',
  '¿Cuál de los siguientes orgánulos está principalmente implicado en la producción de ATP mediante fosforilación oxidativa?',
  'Aparato de Golgi',
  'Mitocondria',
  'Lisosoma',
  'Retículo endoplasmático',
  2
),
(
  2024,
  'Genética',
  '¿Qué enzima sintetiza ADN durante la replicación?',
  'ARN polimerasa',
  'ADN ligasa',
  'ADN polimerasa',
  'Topoisomerasa',
  3
),
(
  2023,
  'Microbiología y Parasitología',
  '¿Cuál de los siguientes es un componente característico de las bacterias Gram negativas?',
  'Ácido teicoico',
  'Membrana externa con LPS',
  'Quitina',
  'Ergosterol',
  2
),
(
  2023,
  'Bioquímica y Biología Molecular',
  '¿Cuál es el principal producto final de la glucólisis en condiciones aerobias?',
  'Lactato',
  'Piruvato',
  'Acetil-CoA',
  'Oxalacetato',
  2
),
(
  2022,
  'Inmunología',
  '¿Qué inmunoglobulina predomina normalmente en el suero humano?',
  'IgA',
  'IgE',
  'IgG',
  'IgM',
  3
),
(
  2022,
  'Fisiología y Anatomía',
  '¿Qué estructura renal es responsable principalmente de la filtración glomerular?',
  'Asa de Henle',
  'Corpúsculo renal',
  'Túbulo colector',
  'Túbulo distal',
  2
),
(
  2021,
  'Sin clasificar',
  '¿Qué nivel trófico ocupa normalmente un organismo herbívoro?',
  'Productor',
  'Consumidor primario',
  'Consumidor secundario',
  'Descomponedor',
  2
),
(
  2021,
  'Bioquímica y Biología Molecular',
  '¿Dónde tiene lugar principalmente la transcripción en una célula eucariota?',
  'Citoplasma',
  'Núcleo',
  'Mitocondria exclusivamente',
  'Aparato de Golgi',
  2
),
(
  2020,
  'Biología Celular e Histología',
  '¿Cuál de los siguientes tejidos presenta células muy especializadas en la contracción?',
  'Epitelial',
  'Conjuntivo',
  'Muscular',
  'Nervioso',
  3
),
(
  2020,
  'Microbiología y Parasitología',
  '¿Qué estructura permite a determinadas bacterias desplazarse?',
  'Cápsula',
  'Flagelo',
  'Endospora',
  'Ribosoma',
  2
);