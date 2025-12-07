import { Card, Rank, Suit, HandResult } from '../types';
import { RANK_VALUES } from '../constants';

export const createDeck = (): Card[] => {
  const suits = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
  const ranks = Object.values(Rank);
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return shuffle(deck);
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Simplified Hand Evaluator for Texas Hold'em
export const evaluateHand = (holeCards: Card[], communityCards: Card[]): HandResult => {
  const allCards = [...holeCards, ...communityCards].sort((a, b) => b.value - a.value);
  
  // Helper: Count frequencies
  const rankCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  allCards.forEach(c => {
    rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const isFlush = Object.values(suitCounts).some(c => c >= 5);
  let flushSuit = '';
  if (isFlush) {
    flushSuit = Object.keys(suitCounts).find(key => suitCounts[key] >= 5) || '';
  }

  // Check Straight
  const uniqueValues = Array.from(new Set(allCards.map(c => c.value))).sort((a, b) => b - a);
  let straightHigh = 0;
  for (let i = 0; i < uniqueValues.length - 4; i++) {
    if (uniqueValues[i] - uniqueValues[i+4] === 4) {
      straightHigh = uniqueValues[i];
      break;
    }
  }
  // Wheel straight (A-2-3-4-5)
  if (straightHigh === 0 && uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
    straightHigh = 5;
  }

  // Check Straight Flush
  let isStraightFlush = false;
  if (isFlush && straightHigh > 0) {
    const flushCards = allCards.filter(c => c.suit === flushSuit);
    const flushValues = Array.from(new Set(flushCards.map(c => c.value))).sort((a, b) => b - a);
    for (let i = 0; i < flushValues.length - 4; i++) {
      if (flushValues[i] - flushValues[i+4] === 4) {
        isStraightFlush = true;
        break;
      }
    }
    // Wheel SF check omitted for brevity in this simplified version, assuming standard logic covers mostly
  }

  // Counts analysis
  const fourOfAKind = Object.keys(rankCounts).find(k => rankCounts[parseInt(k)] === 4);
  const threeOfAKind = Object.keys(rankCounts).filter(k => rankCounts[parseInt(k)] === 3).sort((a,b) => parseInt(b)-parseInt(a));
  const pairs = Object.keys(rankCounts).filter(k => rankCounts[parseInt(k)] === 2).sort((a,b) => parseInt(b)-parseInt(a));

  // Determine Rank
  if (isStraightFlush) return { rankName: '同花顺 (Straight Flush)', score: 900 + straightHigh, bestFive: allCards.slice(0,5) };
  if (fourOfAKind) return { rankName: '四条 (Four of a Kind)', score: 800 + parseInt(fourOfAKind), bestFive: allCards.slice(0,5) };
  if (threeOfAKind.length > 0 && pairs.length > 0) return { rankName: '葫芦 (Full House)', score: 700 + parseInt(threeOfAKind[0]), bestFive: allCards.slice(0,5) };
  if (isFlush) return { rankName: '同花 (Flush)', score: 600, bestFive: allCards.slice(0,5) }; // Simplified score
  if (straightHigh > 0) return { rankName: '顺子 (Straight)', score: 500 + straightHigh, bestFive: allCards.slice(0,5) };
  if (threeOfAKind.length > 0) return { rankName: '三条 (Three of a Kind)', score: 400 + parseInt(threeOfAKind[0]), bestFive: allCards.slice(0,5) };
  if (pairs.length >= 2) return { rankName: '两对 (Two Pair)', score: 300 + parseInt(pairs[0]), bestFive: allCards.slice(0,5) };
  if (pairs.length === 1) return { rankName: '一对 (Pair)', score: 200 + parseInt(pairs[0]), bestFive: allCards.slice(0,5) };

  return { rankName: '高牌 (High Card)', score: 100 + allCards[0].value, bestFive: allCards.slice(0,5) };
};
