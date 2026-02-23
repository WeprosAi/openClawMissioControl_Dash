import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateBoardroomSummary(transcript: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are Mission Control AI. Analyze the provided Boardroom transcript.
    Extract quantifiable metrics mentioned and define clear, directly actionable items.
    
    Metrics should be specific (e.g., "15% increase", "40% drop-off").
    Action items should be concrete tasks with assigned roles if possible.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: transcript,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A high-level overview of the meeting." },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  trend: { type: Type.STRING, description: "up, down, or stable" }
                }
              }
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                  priority: { type: Type.STRING, description: "high, medium, low" }
                }
              }
            }
          },
          required: ["summary", "metrics", "actionItems"]
        }
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Boardroom Summary Error:", error);
    return null;
  }
}

export async function getMissionControlResponse(prompt: string, context: any) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are Mission Control AI, the brain of OpenClaw Mission Control.
    You help Anwar manage his AI agents, jobs, and intel.
    
    Current Context:
    ${JSON.stringify(context)}
    
    Guidelines:
    - Be concise and action-oriented.
    - Treat agents like employees.
    - Focus on "quick wins".
    - Explain logs or failures in plain language.
    - Suggest Boardroom topics or Job refinements.
    - If Anwar is the bottleneck, highlight it.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my neural core. Please check the logs.";
  }
}
