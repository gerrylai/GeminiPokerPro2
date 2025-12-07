export enum Suit {
  HEARTS = '♥',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠',
}

export enum Rank {
  TWO = '2', THREE = '3', FOUR = '4', FIVE = '5', SIX = '6', SEVEN = '7',
  EIGHT = '8', NINE = '9', TEN = '10', JACK = 'J', QUEEN = 'Q', KING = 'K', ACE = 'A',
}

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-14 for comparison
}

export enum PlayerType {
  HUMAN = 'HUMAN',
  BOT = 'BOT',
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  FOLDED = 'FOLDED',
  ALL_IN = 'ALL_IN',
  BUSTED = 'BUSTED',
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  chips: number;
  bet: number; // Current round bet
  status: PlayerStatus;
  hand: Card[];
  position: number; // 0-7
  isDealer?: boolean;
  lastAction?: string;
  avatarSeed?: number;
}

export enum GameStage {
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
}

export interface HandResult {
  rankName: string;
  score: number;
  bestFive: Card[];
}

export enum AppMode {
  LOBBY = 'LOBBY',
  GAME = 'GAME',
}