import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ATSAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  suggestedImprovements: string;
}

export interface OptimizedResume {
  content: string;
}

export const analyzeResume = async (resumeText: string, jobDescription?: string): Promise<ATSAnalysis> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following resume for ATS (Applicant Tracking System) compatibility. 
    ${jobDescription ? `Compare it against this job description: ${jobDescription}` : ""}
    
    Provide a score (0-100), list strengths, weaknesses, missing keywords, formatting issues, and detailed suggested improvements.
    
    Resume:
    ${resumeText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          formattingIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedImprovements: { type: Type.STRING },
        },
        required: ["score", "strengths", "weaknesses", "missingKeywords", "formattingIssues", "suggestedImprovements"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const optimizeResume = async (resumeText: string, analysis: ATSAnalysis): Promise<OptimizedResume> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a world-class executive resume writer for top-tier international companies (Google, McKinsey, Goldman Sachs). 
    Rewrite the following resume to be highly professional, impactful, and ATS-optimized.
    
    Structure the output in Markdown with these EXACT sections:
    # [FULL NAME]
    [Email] | [Phone] | [LinkedIn URL] | [Location]
    
    ## PROFESSIONAL SUMMARY
    [A powerful 3-4 line summary focusing on value proposition and key achievements]
    
    ## CORE COMPETENCIES
    [A list of 8-12 key skills/keywords separated by bullets or in a clear list]
    
    ## PROFESSIONAL EXPERIENCE
    ### [Job Title] | [Company Name] | [Dates]
    - [Achievement-oriented bullet point starting with a strong action verb and including quantifiable results]
    - [Another impactful bullet point]
    
    ## EDUCATION
    ### [Degree Name] | [University Name] | [Graduation Date]
    
    ## PROJECTS & CERTIFICATIONS (Optional)
    [Relevant items]

    Original Resume:
    ${resumeText}
    
    Analysis to incorporate:
    ${JSON.stringify(analysis)}
    
    Formatting Rules:
    - Use strong action verbs (Spearheaded, Orchestrated, Optimized).
    - Use the STAR method (Situation, Task, Action, Result).
    - Ensure all missing keywords from the analysis are included naturally.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
        },
        required: ["content"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};
