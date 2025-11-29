export enum Suit {
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣',
  Spades = '♠'
}

export enum Color {
  Red = 'RED',
  Black = 'BLACK'
}

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1 (Ace) to 13 (King)
  faceUp: boolean;
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface Position {
  type: PileType;
  index: number; // For tableau (0-6) or foundation (0-3). 0 for stock/waste.
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][]; // 4 piles
  tableau: Card[][]; // 7 piles
  score: number;
  moves: number;
}

export interface Move {
  source: Position;
  destination: Position;
  count?: number; // How many cards to move (for tableau stacks)
}