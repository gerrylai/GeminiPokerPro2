import { GoogleGenAI } from "@google/genai";
import { Player, Card } from '../types';

let aiClient: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateGameCommentary = async (
  winnerName: string, 
  winHand: string, 
  potSize: number,
  isHumanWinner: boolean
): Promise<string> => {
  if (!aiClient) return "Gemini AI 未连接: 请检查 API Key。";

  try {
    const prompt = `
      你是德州扑克游戏的荷官。
      玩家 "${winnerName}" 刚刚赢得了 ${potSize} 筹码的底池。
      获胜牌型是: ${winHand}。
      ${isHumanWinner ? "获胜者是人类玩家，夸奖一下。" : "获胜者是电脑AI，发表一句幽默的评论。"}
      请用简短的中文（不超过30个字）评论这场胜利。
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "精彩的比赛！";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `恭喜 ${winnerName} 赢下了底池！`;
  }
};

export const generateBotChat = async (botName: string, situation: 'fold' | 'raise' | 'win'): Promise<string> => {
  if (!aiClient) return "...";

  try {
    const prompt = `
      扮演德州扑克玩家 "${botName}"。
      当前情况: ${situation === 'fold' ? '你弃牌了' : situation === 'raise' ? '你加注了' : '你赢了'}。
      请用中文说一句简短的骚话（15字以内），符合赌徒的性格。
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "有点意思。";
  } catch (error) {
    return "Next hand.";
  }
};