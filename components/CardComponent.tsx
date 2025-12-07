import React from 'react';
import { Card } from '../types';
import { SUIT_COLORS } from '../constants';

interface CardProps {
  card?: Card;
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CardComponent: React.FC<CardProps> = ({ card, hidden, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs rounded',
    md: 'w-10 h-14 md:w-14 md:h-20 text-sm md:text-lg rounded-md',
    lg: 'w-14 h-20 md:w-20 md:h-28 text-lg md:text-2xl rounded-lg',
  };

  if (hidden) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-blue-900 border-2 border-white shadow-card flex items-center justify-center ${className}`}
        style={{ 
          backgroundImage: 'repeating-linear-gradient(45deg, #1e3a8a 0, #1e3a8a 10px, #172554 10px, #172554 20px)'
        }}
      >
        <div className="w-full h-full border border-opacity-20 border-white rounded-sm"></div>
      </div>
    );
  }

  if (!card) return <div className={`${sizeClasses[size]} opacity-0 ${className}`} />;

  return (
    <div className={`${sizeClasses[size]} bg-white shadow-card flex flex-col items-center justify-between p-1 select-none transform hover:-translate-y-1 transition-transform ${SUIT_COLORS[card.suit]} ${className}`}>
      <div className="self-start leading-none font-bold">{card.rank}</div>
      <div className="text-xl md:text-3xl leading-none">{card.suit}</div>
      <div className="self-end leading-none font-bold transform rotate-180">{card.rank}</div>
    </div>
  );
};

export default CardComponent;