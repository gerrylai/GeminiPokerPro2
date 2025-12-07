import React from 'react';
import { Player, Card, GameStage } from '../types';
import CardComponent from './CardComponent';

interface TableProps {
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentTurn: number;
  dealerIndex: number;
  stage: GameStage;
}

// Helper to position players in an ellipse
const getPositionStyle = (index: number, totalPlayers: number) => {
  // Rotate so index 0 (Human) is at bottom center (90 degrees in math, 270 in CSS logic if top is 0)
  // Let's use standard trig: Bottom is 90deg (PI/2).
  // Total Circle = 2*PI. 
  // We want Player 0 at bottom.
  
  const angle = (index / totalPlayers) * 2 * Math.PI + (Math.PI / 2); 
  const xRadius = 42; // Percentage of container width
  const yRadius = 38; // Percentage of container height
  
  const left = 50 + xRadius * Math.cos(angle);
  const top = 50 + yRadius * Math.sin(angle);

  return { left: `${left}%`, top: `${top}%` };
};

const Table: React.FC<TableProps> = ({ players, communityCards, pot, currentTurn, dealerIndex, stage }) => {
  
  return (
    <div className="relative w-full max-w-5xl aspect-[16/9] md:aspect-[2/1] bg-felt border-8 border-felt-dark rounded-full shadow-2xl mx-auto my-4 md:my-8 flex items-center justify-center ring-4 ring-black/20">
      
      {/* Community Cards */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2 md:gap-4 z-10">
        {communityCards.map((card, idx) => (
          <CardComponent key={`${card.rank}-${card.suit}`} card={card} size="md" />
        ))}
        {Array.from({ length: 5 - communityCards.length }).map((_, idx) => (
          <div key={`placeholder-${idx}`} className="w-10 h-14 md:w-14 md:h-20 border-2 border-dashed border-white/20 rounded-md" />
        ))}
      </div>

      {/* Pot */}
      <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 text-gold font-bold bg-black/40 px-4 py-1 rounded-full border border-gold/30 backdrop-blur-sm z-0">
        底池: {pot}
      </div>

      {/* Players */}
      {players.map((player, idx) => {
        const style = getPositionStyle(idx, players.length);
        const isActive = idx === currentTurn;
        const isWinner = false; // Logic handled in parent for effects

        return (
          <div 
            key={player.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-24 md:w-32 transition-all duration-300 ${player.status === 'FOLDED' ? 'opacity-50 grayscale' : ''}`}
            style={style}
          >
            {/* Cards */}
            <div className="flex -space-x-4 mb-1 relative z-20">
              {player.hand.map((card, cIdx) => (
                <CardComponent 
                  key={cIdx} 
                  card={card} 
                  hidden={player.type === 'BOT' && stage !== 'SHOWDOWN' && player.status !== 'FOLDED'} // Only show bot cards at showdown
                  size="sm"
                  className={cIdx === 1 ? "transform translate-y-1 rotate-6" : "transform -rotate-6"}
                />
              ))}
            </div>

            {/* Avatar & Info */}
            <div className={`relative bg-gray-900/90 text-white rounded-lg p-2 w-full text-center border-2 shadow-lg ${isActive ? 'border-gold glow' : 'border-gray-600'} ${player.status === 'FOLDED' ? 'border-red-900 bg-black' : ''}`}>
               {/* Dealer Button */}
               {idx === dealerIndex && (
                  <div className="absolute -top-3 -right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold border-2 border-gray-400 text-xs shadow-md z-30">D</div>
               )}

              <div className="text-xs md:text-sm font-bold truncate">{player.name}</div>
              <div className="text-gold text-xs">💰 {player.chips}</div>
              {player.bet > 0 && (
                 <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600/90 px-2 py-0.5 rounded-full text-xs font-bold shadow min-w-[3rem]">
                   +{player.bet}
                 </div>
              )}
               {player.lastAction && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-gray-700/80 px-2 rounded whitespace-nowrap animate-bounce">
                  {player.lastAction}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Table;