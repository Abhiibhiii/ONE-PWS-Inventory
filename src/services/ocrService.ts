import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

export interface InvoiceData {
  purchaseDate?: string;
  purchaseDateOptions?: string[];
  warrantyMonths?: number;
  warrantyMonthsOptions?: number[];
  vendor?: string;
  vendorOptions?: string[];
  invoiceNo?: string;
  invoiceNoOptions?: string[];
}

export const isAIEnabled = () => {
  return !!process.env.GEMINI_API_KEY;
};

export const extractInvoiceData = async (base64Image: string, mimeType: string): Promise<InvoiceData> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("AI service is not configured. Please check your GEMINI_API_KEY.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract the following information from this invoice. For each field, provide the most likely value and a list of other potential candidates found in the text if the primary one is uncertain.
            Fields:
            1. Purchase Date (YYYY-MM-DD)
            2. Warranty Period (in months)
            3. Vendor Name
            4. Invoice Number`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          purchaseDate: { type: Type.STRING },
          purchaseDateOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          warrantyMonths: { type: Type.NUMBER },
          warrantyMonthsOptions: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          vendor: { type: Type.STRING },
          vendorOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          invoiceNo: { type: Type.STRING },
          invoiceNoOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse OCR response", e);
    return {};
  }
};
