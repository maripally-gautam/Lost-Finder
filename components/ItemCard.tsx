import React from 'react';
import { Item } from '../types';
import { MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  item: Item;
  onClick?: () => void;
  showPrivate?: boolean;
}

export const ItemCard: React.FC<Props> = ({ item, onClick, showPrivate }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-brand-800 rounded-xl overflow-hidden border border-brand-700 shadow-lg mb-4 cursor-pointer hover:border-brand-500 transition-all"
    >
      <div className="flex">
        {/* Image Section */}
        <div className="w-32 h-32 bg-brand-900 relative flex-shrink-0">
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.title} 
              className={`w-full h-full object-cover ${!showPrivate ? 'blur-sm scale-110' : ''}`} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
              No Image
            </div>
          )}
          
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase
            ${item.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
              item.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/50'
            }`}>
            {item.priority}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-100 truncate pr-2">
                {item.title}
              </h3>
              <span className="text-[10px] text-slate-400 bg-brand-900 px-1.5 py-0.5 rounded">
                {item.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center text-[11px] text-slate-500">
              <MapPin size={12} className="mr-1 text-brand-500" />
              <span>~{item.location.address || 'Unknown Area'}</span>
            </div>
            <div className="flex items-center text-[11px] text-slate-500">
              <Clock size={12} className="mr-1" />
              <span>{formatDistanceToNow(item.timestamp)} ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
