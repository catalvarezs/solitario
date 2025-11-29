import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy, Spade } from 'lucide-react';
import { Card as CardComponent } from './components/Card';
import { GameState, Position, Card } from './types';
import { initializeGame, canMoveToFoundation, canMoveToTableau, checkWin } from './services/engine';

// --- Types needed locally ---
interface Selection {
  position: Position;
  cardIndex?: number;
}

// Logo Component
const AceLogo = () => (
  <div className="relative w-8 h-10 bg-neutral-200 rounded sm:rounded-md flex items-center justify-center shadow-lg border border-neutral-400">
    <span className="absolute top-0.5 left-0.5 text-[8px] leading-none font-bold text-black font-mono">A</span>
    <Spade size={16} className="text-black fill-current" />
    <span className="absolute bottom-0.5 right-0.5 text-[8px] leading-none font-bold text-black rotate-180 font-mono">A</span>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [showWin, setShowWin] = useState(false);
  const [dimensions, setDimensions] = useState({ height: window.innerHeight });

  // Handle Resize for dynamic calculations
  useEffect(() => {
    const handleResize = () => setDimensions({ height: window.innerHeight });
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

  const saveToHistory = () => {
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(gameState))]);
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

  // --- Actions ---

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

  const handleAttemptMove = (targetPos: Position) => {
    if (!selection) return;

    const sourcePos = selection.position;
    
    if (sourcePos.type === targetPos.type && sourcePos.index === targetPos.index) {
      setSelection(null);
      return;
    }

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

    if (movingCards.length === 0 || !movingCards[0]) {
      setSelection(null);
      return;
    }

    const leadCard = movingCards[0];
    let validMove = false;

    if (targetPos.type === 'foundation') {
      if (movingCards.length === 1) {
        const targetPile = gameState.foundations[targetPos.index];
        if (canMoveToFoundation(leadCard, targetPile)) {
          validMove = true;
        }
      }
    } else if (targetPos.type === 'tableau') {
      const targetPile = gameState.tableau[targetPos.index];
      if (canMoveToTableau(leadCard, targetPile)) {
        validMove = true;
      }
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

      if (source.type === 'waste') {
        newWaste.pop();
      } else if (source.type === 'foundation') {
        newFoundations[source.index].pop();
      } else if (source.type === 'tableau') {
        const count = cards.length;
        const pile = newTableau[source.index];
        pile.splice(pile.length - count, count);
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1].faceUp = true;
        }
      }

      if (target.type === 'foundation') {
        newFoundations[target.index].push(cards[0]);
      } else if (target.type === 'tableau') {
        newTableau[target.index].push(...cards);
      }

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

  const handleCardClick = (pos: Position, cardIndex?: number) => {
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

    handleAttemptMove(pos);
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

  /**
   * Helper to calculate the 'top' percentage style for a card in a tableau column.
   * Compresses the stack if it exceeds the available height.
   */
  const getCardOffsetStyle = (pileLength: number, cardIndex: number, faceUp: boolean, cards: Card[]) => {
    // These values are percentages of the container height
    const FACE_DOWN_MARGIN = 2; // tighter for face down
    const FACE_UP_MARGIN = 5;   // standard overlap
    const CARD_HEIGHT_PERCENT = 18; // Approximate height of a card relative to tableau area (depends on CSS aspect ratio, but used for logic)
    
    // Determine max available vertical space (100% of parent)
    // If the standard stacking exceeds 100%, we squash.
    
    // Calculate what the height would be with standard spacing
    let theoreticalHeight = 0;
    for(let i=0; i<pileLength; i++) {
        if (i === 0) {
             theoreticalHeight += CARD_HEIGHT_PERCENT; 
        } else {
            const isPrevFaceUp = cards[i-1].faceUp;
            theoreticalHeight += isPrevFaceUp ? FACE_UP_MARGIN : FACE_DOWN_MARGIN;
        }
    }
    
    let scaleFactor = 1;
    // Buffer to ensure we don't hit exact bottom edge
    if (theoreticalHeight > 95) {
        scaleFactor = 95 / theoreticalHeight;
    }

    // Now calculate position for THIS card
    let currentTop = 0;
    for(let i=0; i<cardIndex; i++) {
        const isPrevFaceUp = cards[i].faceUp;
        currentTop += (isPrevFaceUp ? FACE_UP_MARGIN : FACE_DOWN_MARGIN) * scaleFactor;
    }
    
    return { top: `${currentTop}%` };
  };

  return (
    <div className="h-full w-full flex flex-col bg-black text-neutral-300 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 bg-neutral-900 border-b border-neutral-800 z-20">
        <div className="flex items-center gap-3">
          <AceLogo />
          <h1 className="text-lg font-bold tracking-widest text-neutral-200 uppercase hidden sm:block">
            Solitaire
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-end mr-2 sm:mr-4">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Moves</span>
                <span className="text-sm font-mono text-neutral-200">{gameState.moves}</span>
            </div>
          <button onClick={undo} disabled={history.length === 0} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-colors disabled:opacity-20" title="Undo">
            <RotateCcw size={18} />
          </button>
          <button onClick={resetGame} className="px-4 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-900 rounded hover:bg-neutral-300 transition-colors uppercase tracking-wide">
            New Game
          </button>
        </div>
      </div>

      {/* Main Game Surface */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 h-full relative">
        
        {/* Top Section: Stock/Waste & Foundations */}
        <div className="flex justify-between items-start shrink-0 h-[18vh] min-h-[5rem] max-h-[10rem]">
          
          {/* Left: Stock & Waste */}
          <div className="flex gap-2 sm:gap-4 h-full">
            {/* Stock */}
            <div className="relative aspect-[2/3] h-full">
               {gameState.stock.length > 0 ? (
                  <CardComponent 
                    onClick={handleStockClick}
                    className="h-full w-auto hover:brightness-110 shadow-lg" 
                  />
               ) : (
                  <div 
                    onClick={handleStockClick}
                    className="h-full w-full rounded-md border-2 border-dashed border-neutral-800 flex items-center justify-center cursor-pointer hover:border-neutral-600 hover:bg-neutral-900 transition-colors group"
                  >
                    <RotateCcw size={24} className="text-neutral-700 group-hover:text-neutral-500" />
                  </div>
               )}
            </div>

            {/* Waste */}
            <div className="relative aspect-[2/3] h-full">
              {gameState.waste.length > 0 ? (
                <CardComponent 
                  card={gameState.waste[gameState.waste.length - 1]} 
                  onClick={() => handleCardClick({ type: 'waste', index: 0 })}
                  onDoubleClick={() => handleDoubleClick({ type: 'waste', index: 0 })}
                  selected={selection?.position.type === 'waste'}
                  className="h-full w-auto shadow-lg"
                />
              ) : (
                <div className="h-full w-full rounded-md border border-neutral-900 bg-neutral-900/30" />
              )}
            </div>
          </div>

          {/* Right: Foundations */}
          <div className="flex gap-2 sm:gap-4 h-full">
            {gameState.foundations.map((pile, i) => (
              <div key={`foundation-${i}`} className="relative aspect-[2/3] h-full">
                {pile.length > 0 ? (
                  <CardComponent 
                    card={pile[pile.length - 1]} 
                    onClick={() => handleCardClick({ type: 'foundation', index: i })}
                    selected={selection?.position.type === 'foundation' && selection.position.index === i}
                    className="h-full w-auto shadow-lg"
                  />
                ) : (
                  <CardComponent 
                    isPlaceholder 
                    placeholderContent={['♥', '♦', '♣', '♠'][i]} 
                    onClick={() => handleCardClick({ type: 'foundation', index: i })}
                    className="h-full w-auto border-neutral-800 bg-neutral-900/20 opacity-50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Tableau */}
        <div className="flex-1 flex justify-between items-stretch gap-1 sm:gap-2 relative min-h-0 pt-2 border-t border-neutral-800/50">
          {gameState.tableau.map((pile, pileIndex) => (
            <div key={`tableau-${pileIndex}`} className="flex-1 relative h-full">
              
              {/* Hit area for empty column */}
              <div 
                className={`absolute inset-0 z-0 rounded-lg transition-colors ${pile.length === 0 ? 'bg-neutral-900/30 border border-neutral-800/30 hover:bg-neutral-900/50' : ''}`}
                onClick={() => pile.length === 0 && handleCardClick({ type: 'tableau', index: pileIndex })}
              />
              
              {/* Cards in column */}
              {pile.map((card, cardIndex) => {
                const isSelected = selection?.position.type === 'tableau' && 
                                   selection.position.index === pileIndex && 
                                   selection.cardIndex === cardIndex;
                
                // Dynamic styling for squishing
                const style = getCardOffsetStyle(pile.length, cardIndex, card.faceUp, pile);

                return (
                  <div 
                    key={card.id} 
                    className="absolute w-full transition-[top] duration-300 ease-out"
                    style={{ 
                      ...style,
                      zIndex: cardIndex + 1,
                      height: '18vh', // Match approximate logic height
                      maxHeight: '10rem', // Cap max height for large screens
                      minHeight: '3.5rem' // Ensure visible on tiny screens
                    }}
                  >
                    <div className="relative w-full h-full aspect-[2/3] mx-auto">
                        <CardComponent 
                        card={card}
                        selected={isSelected}
                        onClick={() => handleCardClick({ type: 'tableau', index: pileIndex }, cardIndex)}
                        onDoubleClick={() => handleDoubleClick({ type: 'tableau', index: pileIndex })}
                        className="w-full h-full"
                        />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Win Overlay */}
      {showWin && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 text-center shadow-2xl w-full max-w-sm mx-4">
            <Trophy size={64} className="mx-auto text-yellow-500 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Victory!</h2>
            <div className="w-16 h-1 bg-neutral-800 mx-auto mb-4 rounded-full"></div>
            <p className="text-neutral-400 mb-8 uppercase tracking-widest text-sm">
              Solved in <span className="text-white font-mono text-lg ml-1">{gameState.moves}</span> moves
            </p>
            <button 
              onClick={resetGame}
              className="w-full py-4 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-all active:scale-95"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}