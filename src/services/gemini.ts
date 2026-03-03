import { GoogleGenAI, Type } from "@google/genai";
import { GeometryData } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

export const geminiService = {
  async analyzeAndDraw(problemText: string): Promise<GeometryData> {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `Bạn là chuyên gia hình học không gian. Hãy chuyển đổi đề bài thành JSON.
    QUY TẮC VẼ HÌNH KHÔNG GIAN (CỰC KỲ QUAN TRỌNG):
    1. NÉT LIỀN (solid): Dùng cho các cạnh nhìn thấy được từ góc nhìn phía trước-trên. Thường là các cạnh bao quanh khối và các cạnh ở phía trước.
    2. NÉT ĐỨT (dashed): Dùng cho các cạnh bị che khuất bởi các mặt khác của khối. 
       - Ví dụ: Trong hình chóp S.ABC, nếu nhìn từ trước, cạnh đáy AC nằm phía sau sẽ là nét đứt.
       - Các đường cao, đường trung tuyến nằm bên trong khối đa diện luôn là nét đứt.
    3. TỌA ĐỘ: x(0-100), y(0-100). 
       - Đáy nên đặt ở nửa dưới (y: 60-85).
       - Đỉnh S nên đặt ở phía trên (y: 10-30).
       - Tạo độ nghiêng nhẹ để hình có chiều sâu không gian (3D perspective).
    4. Đảm bảo các điểm có label rõ ràng (A, B, C, S, H, M, N...).
    5. PHẦN PHÂN TÍCH (analysis): Trình bày bằng TIẾNG VIỆT. Sử dụng ký hiệu toán học LaTeX ($...$) nếu cần thiết. Giải thích ngắn gọn cấu trúc hình học đã dựng.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Vẽ hình học không gian cho đề bài: ${problemText}` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            points: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                required: ["id", "label", "x", "y"],
              },
            },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  p1: { type: Type.STRING },
                  p2: { type: Type.STRING },
                  type: { type: Type.STRING, description: "solid or dashed" },
                },
                required: ["p1", "p2", "type"],
              },
            },
            analysis: { type: Type.STRING },
          },
          required: ["points", "lines", "analysis"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as GeometryData;
  },

  async solveProblem(problemText: string): Promise<string> {
    const model = "gemini-3.1-pro-preview";
    const systemInstruction = `Bạn là gia sư toán chuyên nghiệp. Giải bài toán hình học không gian với 3 cách tiếp cận khác nhau (ví dụ: Hình học thuần túy, Tọa độ hóa Oxyz, Tỉ số thể tích/khoảng cách). 
    Sử dụng Markdown và LaTeX ($...$ cho inline, $$...$$ cho block). 
    Trình bày đẹp mắt với các tiêu đề rõ ràng. Trả lời bằng tiếng Việt.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Giải bài toán sau đây một cách chi tiết: ${problemText}` }] }],
      config: { systemInstruction },
    });

    return response.text || "Không thể giải bài toán này.";
  },

  async getHint(problemText: string): Promise<string> {
    const model = "gemini-3-flash-preview";
    const systemInstruction = "Bạn là trợ lý học tập. Hãy đưa ra gợi ý hướng giải quyết ngắn gọn cho bài toán hình học không gian này. Sử dụng LaTeX cho công thức. Trả lời bằng tiếng Việt.";

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Gợi ý hướng giải cho bài toán: ${problemText}` }] }],
      config: { systemInstruction },
    });

    return response.text || "Không có gợi ý nào.";
  },

  async performOCR(base64Image: string, mimeType: string): Promise<string> {
    const model = "gemini-3-flash-preview";
    const response = await genAI.models.generateContent({
      model,
      contents: [{
        parts: [
          { text: "Hãy trích xuất chính xác đề bài toán hình học từ ảnh này. Chỉ trả về nội dung đề bài, không thêm bớt." },
          { inlineData: { mimeType, data: base64Image } }
        ]
      }],
    });

    return response.text || "";
  },

  async generateSpeech(text: string): Promise<string> {
    const model = "gemini-2.5-flash-preview-tts";
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  }
};
