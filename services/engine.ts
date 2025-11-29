import { Card, Suit, GameState, Position, Color } from '../types';
import { SUITS, RANKS } from '../constants';

// --- Helpers ---

export const getSuitColor = (suit: Suit): Color => {
  return (suit === Suit.Hearts || suit === Suit.Diamonds) ? Color.Red : Color.Black;
};

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: false,
      });
    });
  });
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const initializeGame = (): GameState => {
  const deck = shuffleDeck(generateDeck());
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  // Deal to tableau
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      const card = deck.pop();
      if (card) {
        if (i === j) card.faceUp = true; // Top card face up
        tableau[j].push(card);
      }
    }
  }

  return {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
  };
};

// --- Move Validation ---

export const canMoveToFoundation = (card: Card, foundationPile: Card[]): boolean => {
  if (foundationPile.length === 0) {
    return card.rank === 1; // Must be Ace
  }
  const topCard = foundationPile[foundationPile.length - 1];
  return topCard.suit === card.suit && card.rank === topCard.rank + 1;
};

export const canMoveToTableau = (card: Card, tableauPile: Card[]): boolean => {
  if (tableauPile.length === 0) {
    return card.rank === 13; // Must be King
  }
  const topCard = tableauPile[tableauPile.length - 1];
  return getSuitColor(card.suit) !== getSuitColor(topCard.suit) && card.rank === topCard.rank - 1;
};

// --- Execution ---

// Helper to check if a card is accessible (top of waste, top of foundation, or face-up in tableau)
export const getCardAtPosition = (state: GameState, pos: Position): Card | null => {
  if (pos.type === 'stock') return null; // Can't select directly from stock usually
  if (pos.type === 'waste') {
    return state.waste.length > 0 ? state.waste[state.waste.length - 1] : null;
  }
  if (pos.type === 'foundation') {
    const pile = state.foundations[pos.index];
    return pile.length > 0 ? pile[pile.length - 1] : null;
  }
  if (pos.type === 'tableau') {
    const pile = state.tableau[pos.index];
    // In tableau, we might click a card that is not the top one, but is part of a valid face-up stack.
    // However, for this helper let's just return the top card for simple checks,
    // handling stacks requires index inside the pile which we don't have in simple Position.
    // We'll rely on the UI passing the specific card index if needed.
    return pile.length > 0 ? pile[pile.length - 1] : null;
  }
  return null;
};

export const checkWin = (state: GameState): boolean => {
  return state.foundations.every(pile => pile.length === 13);
};
