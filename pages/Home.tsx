import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Item } from '../types';
import { ItemCard } from '../components/ItemCard';
import { ChevronDown, Filter } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: '2km', label: '2 km' },
  { value: '10km', label: '10 km' },
  { value: 'global', label: 'Global' },
];

export const Home: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await api.items.getLostItems();
    setItems(data);
    setLoading(false);
  };

  const selectedLabel = filterOptions.find(f => f.value === selectedFilter)?.label || 'All';

  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Lost Reports</h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-brand-800 border-brand-700 text-white hover:bg-brand-700 hover:text-white"
            >
              <Filter size={16} className="mr-2 text-brand-400" />
              Filter: {selectedLabel}
              <ChevronDown size={16} className="ml-2 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-brand-800 border-brand-700">
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`text-white hover:bg-brand-700 cursor-pointer ${selectedFilter === option.value ? 'bg-brand-700' : ''
                  }`}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 bg-brand-800 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No lost items reported nearby.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
