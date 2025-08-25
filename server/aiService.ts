import { GoogleGenAI } from "@google/genai";
import type { Client, Deal } from "@shared/schema";

// Using Gemini AI instead of OpenAI
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export type LeadClassification = "hot" | "warm" | "cold";

export interface DealAnalysis {
  probability: number;
  nextSteps: string[];
  riskFactors: string[];
  recommendations: string[];
}

export interface InsightData {
  leadClassification?: LeadClassification;
  dealProbability?: number;
  recommendations?: string[];
  nextSteps?: string[];
  riskFactors?: string[];
}

export async function classifyLead(client: Client): Promise<LeadClassification> {
  try {
    const prompt = `
You are an AI assistant specializing in beauty industry sales lead classification.
Analyze the following client information and classify them as "hot", "warm", or "cold" lead.

Client Information:
- Name: ${client.name}
- Company: ${client.company || "Individual"}
- Status: ${client.status}
- Notes: ${client.notes || "No notes"}
- Source: ${client.source || "Unknown"}

Beauty Industry Context:
- Hot leads: Ready to purchase, high engagement, specific needs identified
- Warm leads: Interested but need nurturing, some engagement, potential budget
- Cold leads: Early stage, low engagement, needs significant education

Respond with JSON in this exact format: { "classification": "hot" | "warm" | "cold", "reasoning": "brief explanation" }
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    const result = JSON.parse(response.text || "{}");
    const classification = result.classification as LeadClassification;
    
    if (!["hot", "warm", "cold"].includes(classification)) {
      return "warm"; // Default fallback
    }

    return classification;
  } catch (error) {
    console.error("Error classifying lead:", error);
    return "warm"; // Default fallback
  }
}

export async function analyzeDeal(deal: Deal, client?: Client): Promise<DealAnalysis> {
  try {
    const prompt = `
You are an AI assistant specializing in beauty industry sales deal analysis.
Analyze the following deal and provide insights for closing probability and next steps.

Deal Information:
- Title: ${deal.title}
- Value: $${deal.value}
- Stage: ${deal.stage}
- Priority: ${deal.priority}
- Probability: ${deal.probability}%
- Description: ${deal.description || "No description"}
- Notes: ${deal.notes || "No notes"}

${client ? `
Client Information:
- Name: ${client.name}
- Company: ${client.company || "Individual"}
- Status: ${client.status}
- Source: ${client.source || "Unknown"}
` : ""}

Beauty Industry Context:
Consider typical beauty industry sales cycles, seasonal trends, and customer behavior patterns.

Provide analysis in JSON format:
{
  "probability": number (0-100),
  "nextSteps": ["step1", "step2", "step3"],
  "riskFactors": ["risk1", "risk2"],
  "recommendations": ["rec1", "rec2", "rec3"]
}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      probability: Math.max(0, Math.min(100, result.probability || deal.probability || 50)),
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.slice(0, 5) : ["Follow up with client"],
      riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors.slice(0, 3) : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations.slice(0, 5) : ["Continue nurturing relationship"]
    };
  } catch (error) {
    console.error("Error analyzing deal:", error);
    return {
      probability: deal.probability || 50,
      nextSteps: ["Follow up with client"],
      riskFactors: [],
      recommendations: ["Continue nurturing relationship"]
    };
  }
}

export async function generateSalesInsights(clients: Client[], deals: Deal[]): Promise<{
  topRecommendations: string[];
  salesTrends: string[];
  actionItems: string[];
}> {
  try {
    const clientSummary = clients.slice(0, 10).map(c => ({
      status: c.status,
      source: c.source,
      company: c.company ? "business" : "individual"
    }));

    const dealSummary = deals.slice(0, 10).map(d => ({
      stage: d.stage,
      value: d.value,
      priority: d.priority,
      probability: d.probability
    }));

    const prompt = `
You are an AI assistant specializing in beauty industry sales analytics.
Analyze the current sales pipeline and provide strategic insights.

Client Summary (${clients.length} total):
${JSON.stringify(clientSummary, null, 2)}

Deal Summary (${deals.length} total):
${JSON.stringify(dealSummary, null, 2)}

Beauty Industry Context:
Consider seasonal beauty trends, customer lifecycle patterns, and industry best practices.

Provide insights in JSON format:
{
  "topRecommendations": ["rec1", "rec2", "rec3"],
  "salesTrends": ["trend1", "trend2", "trend3"],
  "actionItems": ["action1", "action2", "action3"]
}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      topRecommendations: Array.isArray(result.topRecommendations) ? result.topRecommendations.slice(0, 5) : ["Focus on high-value prospects"],
      salesTrends: Array.isArray(result.salesTrends) ? result.salesTrends.slice(0, 5) : ["Monitor seasonal beauty trends"],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems.slice(0, 5) : ["Follow up with warm leads"]
    };
  } catch (error) {
    console.error("Error generating sales insights:", error);
    return {
      topRecommendations: ["Focus on high-value prospects", "Improve follow-up processes"],
      salesTrends: ["Monitor seasonal beauty trends", "Track customer acquisition costs"],
      actionItems: ["Follow up with warm leads", "Update client status regularly"]
    };
  }
}

// Function to detect language from message
function detectLanguage(text: string): string {
  const turkishWords = ['lash', 'filler', 'eyelash', 'extension', 'lifting', 'lamination', 'kirpik', 'dolgu', 'uzatma', 'kaldırma'];
  const englishWords = ['lash', 'filler', 'extension', 'lifting', 'lamination', 'training', 'course', 'academy', 'please', 'tell', 'about'];
  const russianWords = ['ресницы', 'наращивание', 'ламинирование', 'филлер', 'обучение', 'курс', 'академия', 'расскажи', 'пожалуйста'];
  const ukrainianWords = ['вії', 'нарощування', 'ламінування', 'філлер', 'навчання', 'курс', 'академія', 'розкажи', 'будь ласка'];

  const lowerText = text.toLowerCase();
  
  // Check for Cyrillic characters first
  if (/[а-яё]/i.test(text)) {
    const russianMatches = russianWords.filter(word => lowerText.includes(word)).length;
    const ukrainianMatches = ukrainianWords.filter(word => lowerText.includes(word)).length;
    return ukrainianMatches > russianMatches ? 'ukrainian' : 'russian';
  }
  
  // Check for Turkish specific characters
  if (/[çğıöşü]/i.test(text)) {
    return 'turkish';
  }
  
  // Check for English words
  const englishMatches = englishWords.filter(word => lowerText.includes(word)).length;
  const turkishMatches = turkishWords.filter(word => lowerText.includes(word)).length;
  
  if (englishMatches > 0 && turkishMatches === 0) {
    return 'english';
  }
  
  return 'turkish'; // Default for Latin script
}

export async function getAIResponseWithContext(
  message: string, 
  context: {
    knowledge: Array<{ title: string; content: string; category?: string | null }>;
    services: Array<{ name: string; description?: string | null; priceFrom?: number | null; priceTo?: number | null }>;
    faq: Array<{ question: string; answer: string }>;
  }
): Promise<string> {
  try {
    // Detect the language of the message
    const detectedLanguage = detectLanguage(message);
    
    // Prepare language instructions
    const languageInstructions = {
      turkish: 'ÖNEMLI: Türkçe olarak yanıtlayın.',
      english: 'IMPORTANT: Respond in English.',
      russian: 'ВАЖНО: Отвечайте на русском языке.',
      ukrainian: 'ВАЖЛИВО: Відповідайте українською мовою.'
    };
    
    // Prepare context information for the AI
    const contextInfo = {
      knowledgeBase: context.knowledge.length > 0 ? context.knowledge : [],
      services: context.services.length > 0 ? context.services : [],
      faq: context.faq.length > 0 ? context.faq : []
    };

    const systemPrompt = `
${(languageInstructions as any)[detectedLanguage]}

You are a professional beauty industry assistant for Magic Lash - a company specializing in eyelash extensions, lash lifts, and professional beauty services in Istanbul, Turkey.

COMPANY INFORMATION:
- Magic Lash Store: Professional eyelash extension materials (magiclash.com.tr)  
- Magic Lash Academy: Training center in Istanbul, Üsküdar, Altunizade
- Contact: +90 552 563 93 77
- InLei Products: Italian lash lifting and lamination systems distributor

KNOWLEDGE BASE CONTEXT:
${contextInfo.knowledgeBase.map(k => `- ${k.title}: ${k.content}`).join('\n')}

SERVICES & PRICING:
${contextInfo.services.map(s => {
  const price = s.priceFrom && s.priceTo ? `${s.priceFrom}-${s.priceTo} TL` : 
                s.priceFrom ? `from ${s.priceFrom} TL` : 'price on request';
  return `- ${s.name}: ${s.description || ''} (${price})`;
}).join('\n')}

FREQUENTLY ASKED QUESTIONS:
${contextInfo.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

INSTRUCTIONS:
1. RESPOND ONLY IN THE DETECTED LANGUAGE: ${detectedLanguage.toUpperCase()}
2. Always use the provided context to answer questions accurately
3. If information is not in the context, say so politely
4. Mention relevant services and prices when appropriate  
5. Provide contact information for bookings
6. Be professional, helpful, and knowledgeable about beauty industry
7. For bookings or detailed consultations, direct to phone: +90 552 563 93 77
`;

    console.log(`🤖 Gemini request - Language: ${detectedLanguage}, Message length: ${message.length}`);
    console.log(`📋 Context size - Knowledge: ${context.knowledge.length}, Services: ${context.services.length}, FAQ: ${context.faq.length}`);
    
    // Use Gemini AI with working syntax
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\nUser question: ${message}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    });

    const responseText = response?.response?.text || response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`✅ Gemini response received, text length: ${responseText?.length || 0}`);
    
    if (responseText && responseText.trim()) {
      return responseText.trim();
    } else {
      console.log('⚠️ Gemini returned empty response, using fallback');
      return "Извините, сейчас у меня технические проблемы. Свяжитесь с нами по телефону +90 552 563 93 77";
    }
  } catch (error) {
    console.error("❌ GEMINI API ERROR:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error details:", error.details);
    
    // Russian fallback instead of English
    return "Извините, у меня сейчас проблемы с ИИ. Попробуйте позже или свяжитесь с нами по телефону +90 552 563 93 77";
  }
}