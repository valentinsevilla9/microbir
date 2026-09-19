/**
 * Enrutador de IA (Gemini ↔ Groq)
 * Maneja llamadas a LLMs con un sistema de respaldo (fallback) automático.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// Tipos de respuesta esperados
export interface FlashcardGenerada {
  pregunta: string;
  respuesta: string;
}

export async function generarFlashcardDesdeTexto(textoSubrayado: string): Promise<FlashcardGenerada> {
  const prompt = `
  Eres un profesor experto que prepara alumnos para el examen BIR (Biólogo Interno Residente).
  El alumno ha subrayado el siguiente texto de sus apuntes:
  
  "${textoSubrayado}"
  
  Extrae el concepto más importante y transfórmalo en una flashcard de memoria (Active Recall).
  La pregunta debe ser directa y clara. La respuesta debe ser concisa.
  Devuelve el resultado estrictamente en formato JSON con dos claves: "pregunta" y "respuesta".
  No incluyas markdown, solo el JSON puro.
  `;

  // Intentamos Gemini primero
  if (GEMINI_API_KEY) {
    try {
      const res = await callGemini(prompt);
      return parseJsonResponse(res);
    } catch (error) {
      console.warn("Fallo en Gemini, saltando al respaldo (Groq)...", error);
    }
  }

  // Respaldo: Intentamos Groq
  if (GROQ_API_KEY) {
    try {
      const res = await callGroq(prompt);
      return parseJsonResponse(res);
    } catch (error) {
      console.error("Fallo también en Groq.", error);
      throw new Error("Ambos modelos de IA han fallado o no están configurados.");
    }
  }

  throw new Error("No hay claves de API configuradas para la IA.");
}

// --- Llamadas Nativas a las APIs ---

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
      }
    }),
  });

  if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(prompt: string): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-8b-8192", // Modelo rápido y gratuito de Groq
      messages: [
        { role: "system", content: "Devuelve solo JSON válido." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) throw new Error(`Groq Error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJsonResponse(text: string): FlashcardGenerada {
  try {
    // Limpieza por si el LLM devuelve bloques de markdown (```json ... ```)
    const limpio = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(limpio);
  } catch (e) {
    console.error("Error parseando JSON de la IA:", text);
    throw new Error("La IA no devolvió un formato válido.");
  }
}
