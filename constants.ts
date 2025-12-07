import { Rank } from './types';

export const INITIAL_CHIPS = 2000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export const SUIT_COLORS: Record<string, string> = {
  '♥': 'text-red-600',
  '♦': 'text-red-600',
  '♣': 'text-slate-900',
  '♠': 'text-slate-900',
};

export const BOT_NAMES = [
  "阿尔法狗 (Alpha)", 
  "深蓝 (DeepBlue)", 
  "双子星 (Gemini)", 
  "沃森 (Watson)", 
  "深思 (DeepThought)", 
  "天网 (Skynet)", 
  "贾维斯 (Jarvis)"
];

export const RANK_VALUES: Record<Rank, number> = {
  [Rank.TWO]: 2, [Rank.THREE]: 3, [Rank.FOUR]: 4, [Rank.FIVE]: 5,
  [Rank.SIX]: 6, [Rank.SEVEN]: 7, [Rank.EIGHT]: 8, [Rank.NINE]: 9,
  [Rank.TEN]: 10, [Rank.JACK]: 11, [Rank.QUEEN]: 12, [Rank.KING]: 13, [Rank.ACE]: 14,
};
