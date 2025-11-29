import React from 'react';
import { Card as CardType, Suit } from '../types';
import { RANK_NAMES, COLOR_MAP } from '../constants';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface CardProps {
  card?: CardType;
  onClick?: () => void;
  onDoubleClick?: () => void;
  selected?: boolean;
  className?: string;
  isPlaceholder?: boolean;
  placeholderContent?: string;
}

const SuitIcon: React.FC<{ suit: Suit, className?: string }> = ({ suit, className }) => {
  switch (suit) {
    case Suit.Hearts: return <Heart className={`fill-current ${className}`} />;
    case Suit.Diamonds: return <Diamond className={`fill-current ${className}`} />;
    case Suit.Clubs: return <Club className={`fill-current ${className}`} />;
    case Suit.Spades: return <Spade className={`fill-current ${className}`} />;
  }
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  onDoubleClick,
  selected, 
  className = '', 
  isPlaceholder,
  placeholderContent 
}) => {
  
  // Placeholder styling (empty piles)
  if (isPlaceholder) {
    return (
      <div 
        onClick={onClick}
        className={`
          relative w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 
          rounded-md border-2 border-dashed border-neutral-800 
          flex items-center justify-center text-neutral-800
          transition-colors hover:border-neutral-700 cursor-pointer
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}
          ${className}
        `}
      >
        {placeholderContent && <span className="text-2xl opacity-20">{placeholderContent}</span>}
      </div>
    );
  }

  // Face down card
  if (!card || !card.faceUp) {
    return (
      <div 
        onClick={onClick}
        className={`
          relative w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 
          bg-card-back rounded-md shadow-sm border border-neutral-800
          flex items-center justify-center overflow-hidden cursor-pointer
          transition-transform hover:brightness-110 active:scale-95
          ${className}
        `}
      >
        {/* Pattern on back */}
        <div className="absolute inset-1 border border-neutral-700 rounded-sm opacity-50" />
        <div className="w-6 h-6 rounded-full border-2 border-neutral-700 opacity-20" />
      </div>
    );
  }

  // Face up card
  const textColor = COLOR_MAP[card.suit];
  const rankStr = RANK_NAMES[card.rank] || card.rank.toString();

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      className={`
        relative w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 
        bg-card-base rounded-md shadow-lg cursor-pointer select-none
        transition-all duration-100 ease-out
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black -translate-y-1' : 'hover:-translate-y-0.5'}
        ${className}
      `}
    >
      {/* Top Left Corner */}
      <div className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center ${textColor}`}>
        <span className="text-xs sm:text-base font-bold font-mono leading-none tracking-tighter">{rankStr}</span>
        <SuitIcon suit={card.suit} className="w-2 h-2 sm:w-3 sm:h-3 mt-[1px]" />
      </div>

      {/* Center Big Icon */}
      <div className={`absolute inset-0 flex items-center justify-center ${textColor}`}>
        <SuitIcon suit={card.suit} className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 opacity-90" />
      </div>

      {/* Bottom Right Corner (Rotated) */}
      <div className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center rotate-180 ${textColor}`}>
        <span className="text-xs sm:text-base font-bold font-mono leading-none tracking-tighter">{rankStr}</span>
        <SuitIcon suit={card.suit} className="w-2 h-2 sm:w-3 sm:h-3 mt-[1px]" />
      </div>
    </div>
  );
};