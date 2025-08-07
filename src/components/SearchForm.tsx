import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (location: { latitude: number; longitude: number; address: string }, radius: number) => void;
  isSearching?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isSearching = false }) => {
  const [query, setQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState(500);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const radiusOptions = [
    { value: 300, label: '300公尺' },
    { value: 500, label: '500公尺' },
    { value: 800, label: '800公尺' },
  ];

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    try {
      // Use Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=tw&limit=1&accept-language=zh-TW,zh,en`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        onSearch({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: result.display_name
        }, selectedRadius);
        setShowSuggestions(false);
      } else {
        alert('找不到該地址，請嘗試其他關鍵字');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('搜尋時發生錯誤，請稍後再試');
    }
  };

  const handleInputChange = async (value: string) => {
    setQuery(value);
    
    if (value.length > 2) {
      try {
        // Get suggestions from Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=tw&limit=5&accept-language=zh-TW,zh,en`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
    onSearch({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name
    }, selectedRadius);
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            搜尋建物名稱或地址
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="例如：台北101、台北市信義區信義路五段7號"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            
            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{suggestion.display_name}</span>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            搜尋半徑
          </label>
          <div className="flex gap-2">
            {radiusOptions.map((option) => (
              <Badge
                key={option.value}
                variant={selectedRadius === option.value ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
                onClick={() => setSelectedRadius(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={() => handleSearch()}
          disabled={!query.trim() || isSearching}
          className="w-full"
          variant="hero"
          size="lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              搜尋中...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              開始搜尋淹水風險
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};