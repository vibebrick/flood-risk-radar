import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { searchLocation, getSuggestions } from '@/utils/geocoding';

interface SearchFormProps {
  onSearch: (location: { latitude: number; longitude: number; address: string }, radius: number) => void;
  onRadiusChange?: (radius: number) => void;
  isSearching?: boolean;
  defaultRadius?: number;
}

export const SearchForm: React.FC<SearchFormProps> = ({ 
  onSearch, 
  onRadiusChange, 
  isSearching = false, 
  defaultRadius = 500 
}) => {
  const [query, setQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState(defaultRadius);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const radiusOptions = [
    { value: 300, label: '300公尺' },
    { value: 500, label: '500公尺' },
    { value: 800, label: '800公尺' },
  ];

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setError('');
    
    try {
      const { results } = await searchLocation(searchQuery);
      
      if (results.length > 0) {
        const result = results[0];
        onSearch({
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address
        }, selectedRadius);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : '搜尋時發生未知錯誤');
    }
  };

  const handleInputChange = async (value: string) => {
    setQuery(value);
    setError(''); // Clear error when user types
    
    if (value.length > 2) {
      setIsLoadingSuggestions(true);
      try {
        const { suggestions: newSuggestions } = await getSuggestions(value);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.address);
    setShowSuggestions(false);
    setError('');
    onSearch({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address
    }, selectedRadius);
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
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
            {isLoadingSuggestions && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            
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
                      <span className="text-sm">{suggestion.address}</span>
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
                onClick={() => {
                  setSelectedRadius(option.value);
                  onRadiusChange?.(option.value);
                }}
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