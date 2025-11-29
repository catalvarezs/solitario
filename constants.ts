import { Suit } from './types';

export const SUITS = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // Ace to King

export const PILE_NAMES = {
  stock: 'Baraja',
  waste: 'Descarte',
  foundation: 'Fundación',
  tableau: 'Tablero'
};

export const RANK_NAMES: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K'
};

export const COLOR_MAP: Record<Suit, string> = {
  [Suit.Hearts]: 'text-card-red',
  [Suit.Diamonds]: 'text-card-red',
  [Suit.Clubs]: 'text-card-black',
  [Suit.Spades]: 'text-card-black',
};