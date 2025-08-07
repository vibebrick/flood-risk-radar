import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, MapPin, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HotSpot {
  location_name: string;
  search_count: number;
  latitude: number;
  longitude: number;
}

interface SearchStatsProps {
  currentSearch?: {
    location_name: string;
    search_count: number;
  };
}

export const SearchStats: React.FC<SearchStatsProps> = ({ currentSearch }) => {
  const [hotSpots, setHotSpots] = useState<HotSpot[]>([]);
  const [totalSearches, setTotalSearches] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSearchStats();
  }, []);

  const fetchSearchStats = async () => {
    try {
      // Get hot spots (top 5 most searched locations)
      const { data: hotSpotsData, error: hotSpotsError } = await supabase
        .from('flood_searches')
        .select('location_name, search_count, latitude, longitude')
        .order('search_count', { ascending: false })
        .limit(5);

      if (hotSpotsError) throw hotSpotsError;

      // Get total search count
      const { data: totalData, error: totalError } = await supabase
        .from('flood_searches')
        .select('search_count');

      if (totalError) throw totalError;

      const total = totalData?.reduce((sum, item) => sum + item.search_count, 0) || 0;

      setHotSpots(hotSpotsData || []);
      setTotalSearches(total);
    } catch (error) {
      console.error('Error fetching search stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">搜尋統計</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-water-light rounded-lg">
            <div className="flex items-center justify-center gap-2 text-primary mb-1">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">總搜尋次數</span>
            </div>
            <div className="text-2xl font-bold text-primary">{totalSearches.toLocaleString()}</div>
          </div>

          <div className="text-center p-3 bg-gradient-water-light rounded-lg">
            <div className="flex items-center justify-center gap-2 text-primary mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">熱門地點</span>
            </div>
            <div className="text-2xl font-bold text-primary">{hotSpots.length}</div>
          </div>
        </div>

        {currentSearch && (
          <div className="p-3 bg-accent/20 rounded-lg border border-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">目前搜尋地點</span>
              </div>
              <Badge variant="accent">{currentSearch.search_count} 次搜尋</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {currentSearch.location_name}
            </p>
          </div>
        )}

        {hotSpots.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              熱門搜尋地點
            </h4>
            <div className="space-y-2">
              {hotSpots.map((spot, index) => (
                <div
                  key={`${spot.latitude}-${spot.longitude}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm text-foreground truncate">
                      {spot.location_name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {spot.search_count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};