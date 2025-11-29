import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Trophy, Spade, Undo2 } from 'lucide-react';
import { Card as CardComponent } from './components/Card';
import { GameState, Position, Card } from './types';
import { initializeGame, canMoveToFoundation, canMoveToTableau, checkWin } from './services/engine';

// --- Helpers ---

// Tailwind breakpoints matching
const getBreakpoint = () => {
  if (typeof window === 'undefined') return 'md';
  if (window.innerWidth >= 768) return 'md';
  if (window.innerWidth >= 640) return 'sm';
  return 'xs';
};

// Card heights based on Card.tsx classes (h-16=64, h-24=96, h-36=144)
const CARD_HEIGHTS = {
  xs: 64,
  sm: 96,
  md: 144
};

// --- Components ---

const AceLogo = () => (
  <div className="relative w-7 h-9 bg-neutral-100 rounded flex items-center justify-center shadow-lg border border-neutral-300">
    <span className="absolute top-0.5 left-0.5 text-[6px] leading-none font-bold text-black font-mono">A</span>
    <Spade size={14} className="text-black fill-current" />
    <span className="absolute bottom-0.5 right-0.5 text-[6px] leading-none font-bold text-black rotate-180 font-mono">A</span>
  </div>
);

// --- Main App ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [selection, setSelection] = useState<{ position: Position; cardIndex?: number } | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [showWin, setShowWin] = useState(false);
  
  // Layout state
  const [breakpoint, setBreakpoint] = useState(getBreakpoint());
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint());
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize
  useEffect(() => {
    setGameState(initializeGame());
  }, []);

  // Win Check
  useEffect(() => {
    if (checkWin(gameState)) {
      setShowWin(true);
    }
  }, [gameState.foundations]);

  // --- Logic ---

  const saveToHistory = () => {
    setHistory(prev => [...prev.slice(-20), JSON.parse(JSON.stringify(gameState))]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setGameState(previous);
    setHistory(prev => prev.slice(0, -1));
    setSelection(null);
  };

  const resetGame = () => {
    setHistory([]);
    setGameState(initializeGame());
    setSelection(null);
    setShowWin(false);
  };

  const handleStockClick = () => {
    saveToHistory();
    setSelection(null);
    setGameState(prev => {
      const newStock = [...prev.stock];
      const newWaste = [...prev.waste];

      if (newStock.length === 0) {
        if (newWaste.length === 0) return prev;
        return {
          ...prev,
          stock: newWaste.reverse().map(c => ({ ...c, faceUp: false })),
          waste: [],
          moves: prev.moves + 1
        };
      }

      const card = newStock.pop();
      if (card) {
        card.faceUp = true;
        newWaste.push(card);
      }

      return {
        ...prev,
        stock: newStock,
        waste: newWaste,
        moves: prev.moves + 1
      };
    });
  };

  const handleCardClick = (pos: Position, cardIndex?: number) => {
    // 1. Select source
    if (!selection) {
      let isValidSource = false;
      if (pos.type === 'waste' && gameState.waste.length > 0) isValidSource = true;
      if (pos.type === 'foundation' && gameState.foundations[pos.index].length > 0) isValidSource = true;
      if (pos.type === 'tableau') {
        const pile = gameState.tableau[pos.index];
        if (pile.length > 0) {
          const targetIndex = cardIndex !== undefined ? cardIndex : pile.length - 1;
          if (pile[targetIndex].faceUp) isValidSource = true;
        }
      }

      if (isValidSource) {
        setSelection({ position: pos, cardIndex });
      }
      return;
    }

    // 2. Deselect if clicking same
    if (selection.position.type === pos.type && selection.position.index === pos.index) {
      if (pos.type === 'tableau') {
        if (selection.cardIndex === cardIndex) {
          setSelection(null);
          return;
        }
      } else {
        setSelection(null);
        return;
      }
    }

    // 3. Attempt Move
    handleAttemptMove(pos);
  };

  const handleAttemptMove = (targetPos: Position) => {
    if (!selection) return;
    const sourcePos = selection.position;
    
    // Gather moving cards
    let movingCards: Card[] = [];
    let sourcePile: Card[] = [];
    
    if (sourcePos.type === 'waste') {
      sourcePile = gameState.waste;
      movingCards = [sourcePile[sourcePile.length - 1]];
    } else if (sourcePos.type === 'foundation') {
      sourcePile = gameState.foundations[sourcePos.index];
      movingCards = [sourcePile[sourcePile.length - 1]];
    } else if (sourcePos.type === 'tableau') {
      sourcePile = gameState.tableau[sourcePos.index];
      const splitIndex = selection.cardIndex !== undefined ? selection.cardIndex : sourcePile.length - 1;
      movingCards = sourcePile.slice(splitIndex);
    }

    if (!movingCards.length || !movingCards[0]) {
      setSelection(null);
      return;
    }

    // Validate
    let validMove = false;
    if (targetPos.type === 'foundation') {
      if (movingCards.length === 1) {
        if (canMoveToFoundation(movingCards[0], gameState.foundations[targetPos.index])) validMove = true;
      }
    } else if (targetPos.type === 'tableau') {
      if (canMoveToTableau(movingCards[0], gameState.tableau[targetPos.index])) validMove = true;
    }

    if (validMove) {
      executeMove(sourcePos, targetPos, movingCards);
    } else {
      setSelection(null);
    }
  };

  const executeMove = (source: Position, target: Position, cards: Card[]) => {
    saveToHistory();
    setGameState(prev => {
      const newStock = [...prev.stock];
      const newWaste = [...prev.waste];
      const newFoundations = prev.foundations.map(p => [...p]);
      const newTableau = prev.tableau.map(p => [...p]);

      // Remove from source
      if (source.type === 'waste') newWaste.pop();
      else if (source.type === 'foundation') newFoundations[source.index].pop();
      else if (source.type === 'tableau') {
        const count = cards.length;
        const pile = newTableau[source.index];
        pile.splice(pile.length - count, count);
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1].faceUp = true;
        }
      }

      // Add to target
      if (target.type === 'foundation') newFoundations[target.index].push(cards[0]);
      else if (target.type === 'tableau') newTableau[target.index].push(...cards);

      return {
        ...prev,
        stock: newStock,
        waste: newWaste,
        foundations: newFoundations,
        tableau: newTableau,
        moves: prev.moves + 1
      };
    });
    setSelection(null);
  };

  const handleDoubleClick = (pos: Position) => {
    let card: Card | undefined;
    if (pos.type === 'waste') card = gameState.waste[gameState.waste.length - 1];
    else if (pos.type === 'tableau') card = gameState.tableau[pos.index][gameState.tableau[pos.index].length - 1];
    
    if (!card) return;

    const foundationIndex = gameState.foundations.findIndex(f => canMoveToFoundation(card!, f));
    if (foundationIndex !== -1) {
      executeMove(pos, { type: 'foundation', index: foundationIndex }, [card]);
    }
  };

  // --- Layout Calculation ---

  // Calculates the positions for a single pile
  const calculatePileLayout = (pile: Card[]) => {
    const cardHeight = CARD_HEIGHTS[breakpoint];
    
    // Constant Spacing configuration - Tighter (Junta más las cartas)
    // Face Down: Just a small rim (approx 8%)
    const FACE_DOWN_OFFSET = Math.max(cardHeight * 0.08, 6); 
    
    // Face Up: Just enough to see the corner rank/suit (approx 20% or min 26px)
    // We prioritize seeing the rank, covering the rest to save space.
    const FACE_UP_OFFSET = Math.max(cardHeight * 0.20, 26); 
    
    let currentHeight = 0;
    const offsets: number[] = [0];
    
    for (let i = 1; i < pile.length; i++) {
      const prevCard = pile[i - 1];
      const offset = prevCard.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
      currentHeight += offset;
      offsets.push(currentHeight);
    }
    
    const totalHeight = currentHeight + cardHeight;
    return { positions: offsets, totalHeight };
  };

  // Memoize all pile layouts to calculate container height
  const { tableauLayouts, maxTableauHeight } = useMemo(() => {
    const layouts = gameState.tableau.map(pile => calculatePileLayout(pile));
    const maxHeight = Math.max(...layouts.map(l => l.totalHeight));
    // Ensure container is at least the available screen space so background looks full
    const minHeight = Math.max(300, windowHeight - 200); 
    
    return { 
      tableauLayouts: layouts, 
      maxTableauHeight: Math.max(minHeight, maxHeight) 
    };
  }, [gameState.tableau, breakpoint, windowHeight]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-neutral-950 text-neutral-300 font-sans relative">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 bg-neutral-950/90 border-b border-white/5 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <AceLogo />
          <h1 className="text-sm font-bold tracking-[0.2em] text-neutral-400 uppercase block">
            Solitaire
          </h1>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-bold">Moves</span>
                <span className="text-sm font-mono text-neutral-200 leading-none">{gameState.moves}</span>
            </div>
          <button 
            onClick={undo} 
            disabled={history.length === 0} 
            className="p-2 hover:bg-white/10 text-neutral-400 hover:text-white rounded-full transition-colors disabled:opacity-20 active:scale-95" 
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button 
            onClick={resetGame} 
            className="px-4 py-1.5 text-[10px] sm:text-xs font-bold bg-neutral-200 text-neutral-900 rounded hover:bg-white transition-colors uppercase tracking-widest shadow-lg active:scale-95"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-1 relative">
        
        {/* Top Section: Stock/Waste & Foundations */}
        {/* Reduced height to bring tableau closer (minimal buffer for shadows) */}
        <div className="flex justify-between items-start shrink-0 h-[68px] sm:h-[100px] md:h-[148px]">
          
          {/* Stock & Waste */}
          <div className="flex gap-2 sm:gap-4 h-full">
            <div className="relative">
               {gameState.stock.length > 0 ? (
                  <div className="relative">
                      {/* Fake stack effect for depth */}
                      {gameState.stock.length > 1 && (
                         <div className="absolute top-1 left-1 w-full h-full rounded-md bg-neutral-800 border border-neutral-700" />
                      )}
                      <CardComponent 
                        onClick={handleStockClick}
                        className="hover:brightness-110 shadow-xl" 
                      />
                  </div>
               ) : (
                  <div 
                    onClick={handleStockClick}
                    className="w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 rounded-md border-2 border-dashed border-neutral-800 flex items-center justify-center cursor-pointer hover:border-neutral-600 hover:bg-white/5 transition-all group"
                  >
                    <RotateCcw size={20} className="text-neutral-700 group-hover:text-neutral-500" />
                  </div>
               )}
            </div>

            <div className="relative">
              {gameState.waste.length > 0 && (
                <CardComponent 
                  card={gameState.waste[gameState.waste.length - 1]} 
                  onClick={() => handleCardClick({ type: 'waste', index: 0 })}
                  onDoubleClick={() => handleDoubleClick({ type: 'waste', index: 0 })}
                  selected={selection?.position.type === 'waste'}
                  className="shadow-xl"
                />
              )}
            </div>
          </div>

          {/* Foundations */}
          <div className="flex gap-2 sm:gap-4 h-full">
            {gameState.foundations.map((pile, i) => (
              <div key={`foundation-${i}`} className="relative">
                {pile.length > 0 ? (
                  <CardComponent 
                    card={pile[pile.length - 1]} 
                    onClick={() => handleCardClick({ type: 'foundation', index: i })}
                    selected={selection?.position.type === 'foundation' && selection.position.index === i}
                    className="shadow-xl"
                  />
                ) : (
                  <CardComponent 
                    isPlaceholder 
                    placeholderContent={['♥', '♦', '♣', '♠'][i]} 
                    onClick={() => handleCardClick({ type: 'foundation', index: i })}
                    className="border-neutral-800 bg-neutral-900/40 opacity-40 hover:opacity-60"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div 
          className="flex justify-between gap-1 relative border-t border-white/5 pt-1 transition-[height] duration-200"
          style={{ height: maxTableauHeight + 40 }} // Add buffer for bottom selection
        >
          {gameState.tableau.map((pile, pileIndex) => {
            const layout = tableauLayouts[pileIndex];

            return (
              <div key={`tableau-${pileIndex}`} className="flex-1 relative h-full">
                
                {/* Empty Pile Click Area */}
                <div 
                  className="absolute top-0 left-0 w-full h-32 z-0 cursor-pointer group"
                  onClick={() => pile.length === 0 && handleCardClick({ type: 'tableau', index: pileIndex })}
                >
                   {pile.length === 0 && (
                       <div className="mx-auto w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 rounded-md border border-neutral-800/50 bg-neutral-900/20 group-hover:bg-neutral-900/40 transition-colors" />
                   )}
                </div>

                {/* Cards */}
                {pile.map((card, cardIndex) => {
                  const isSelected = selection?.position.type === 'tableau' && 
                                     selection.position.index === pileIndex && 
                                     selection.cardIndex === cardIndex;
                  
                  const topPx = layout.positions[cardIndex];
                  
                  return (
                    <div 
                      key={card.id}
                      className="absolute w-full left-0 pointer-events-none"
                      style={{ 
                        top: `${topPx}px`,
                        zIndex: cardIndex + 1,
                      }}
                    >
                      {/* Inner wrapper to center card horizontally in column and enable pointer events on card only */}
                      <div className="flex justify-center w-full pointer-events-auto">
                          <CardComponent 
                              card={card}
                              selected={isSelected}
                              onClick={() => handleCardClick({ type: 'tableau', index: pileIndex }, cardIndex)}
                              onDoubleClick={() => handleDoubleClick({ type: 'tableau', index: pileIndex })}
                              className="shadow-md hover:shadow-lg"
                          />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Overlay */}
      {showWin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-neutral-900 p-10 rounded-xl border border-neutral-800 text-center shadow-2xl w-full max-w-sm mx-4 transform transition-all hover:scale-105">
            <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trophy size={40} className="text-yellow-500" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tighter">VICTORY</h2>
            <p className="text-neutral-500 mb-8 font-mono text-sm">
              Solved in {gameState.moves} moves
            </p>
            <button 
              onClick={resetGame}
              className="w-full py-3 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors uppercase tracking-widest text-sm"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}