import React from 'react';
import { Category } from '../types';
import { playSound } from '../services/audioService';

interface CategoryFilterProps {
  selected: Category | 'ALL';
  onSelect: (c: Category | 'ALL') => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onSelect }) => {
  const categories = ['ALL', ...Object.values(Category)];

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 pt-2 no-scrollbar px-1">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => {
            onSelect(cat as Category | 'ALL');
            playSound('pop');
          }}
          className={`
            px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shadow-sm
            ${selected === cat 
              ? 'bg-gradient-warm text-white shadow-lg scale-105' 
              : 'bg-white/80 text-gray-500 hover:bg-white hover:text-[#CF4B00] hover:shadow-md'}
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;