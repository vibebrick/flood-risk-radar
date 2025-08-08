import React, { useState } from 'react';
import { SearchForm } from '@/components/SearchForm';
import { FloodRiskMap } from '@/components/FloodRiskMap';
import { NewsResults } from '@/components/NewsResults';
import { SearchStats } from '@/components/SearchStats';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Droplets, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  content_snippet?: string;
  publish_date?: string;
}

const Index = () => {
  const [searchLocation, setSearchLocation] = useState<SearchLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(500);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<Array<{ latitude: number; longitude: number; weight?: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [currentSearchStats, setCurrentSearchStats] = useState<{
    location_name: string;
    search_count: number;
  } | null>(null);
  const { toast } = useToast();

  const handleSearch = async (location: SearchLocation, radius: number) => {
    setIsSearching(true);
    setIsNewsLoading(true);
    setSearchLocation(location);
    setSearchRadius(radius);

    try {
      // Call the edge function to search for news and update database
      const { data, error } = await supabase.functions.invoke('search-flood-news', {
        body: {
          searchLocation: location,
          searchRadius: radius
        }
      });

      if (error) throw error;

      if (data.success) {
        setNews((data.news || []).slice().sort((a: any, b: any) => {
          const da = a?.publish_date ? new Date(a.publish_date as string).getTime() : 0;
          const db = b?.publish_date ? new Date(b.publish_date as string).getTime() : 0;
          return db - da;
        }));
        setHeatmapPoints(data.points || []);
        
        // Get updated search stats for current location
        const { data: searchData, error: searchError } = await supabase
          .from('flood_searches')
          .select('location_name, search_count')
          .eq('latitude', location.latitude)
          .eq('longitude', location.longitude)
          .eq('search_radius', radius)
          .single();

        if (!searchError && searchData) {
          setCurrentSearchStats(searchData);
        }

        toast({
          title: "搜尋完成",
          description: `找到 ${data.news.length} 筆相關新聞資料${data.cached ? ' (來自快取)' : ''}`,
        });
      } else {
        throw new Error(data.error || '搜尋失敗');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "搜尋錯誤",
        description: "無法完成搜尋，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setIsNewsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-water-light">
      {/* Header */}
      <header className="bg-gradient-hero text-primary-foreground shadow-water">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8" />
            <h1 className="text-3xl font-bold">淹水風險雷達</h1>
          </div>
          <p className="text-primary-foreground/90 text-lg">
            協助您評估房屋購買地點的淹水風險，提供相關新聞和歷史資料
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Search and Stats */}
          <div className="lg:col-span-1 space-y-6">
            <SearchForm
              onSearch={handleSearch}
              isSearching={isSearching}
            />

            <SearchStats currentSearch={currentSearchStats} />

            {/* Risk Level Indicator */}
            {searchLocation && (
              <Card className="p-4 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <Droplets className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">風險評估</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">基於新聞數量</span>
                    <Badge variant={news.length === 0 ? "accent" : news.length < 3 ? "warning" : "destructive"}>
                      {news.length === 0 ? "低風險" : news.length < 3 ? "中風險" : "高風險"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>此評估僅供參考，實際風險需要專業評估</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Map and Results */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">搜尋區域地圖</h2>
                {searchLocation && (
                  <Badge variant="outline" className="ml-auto">
                    半徑 {searchRadius}m
                  </Badge>
                )}
              </div>
              <FloodRiskMap
                searchLocation={searchLocation || undefined}
                searchRadius={searchRadius}
                heatmapPoints={heatmapPoints}
                onLocationSelect={(location) => handleSearch(location, searchRadius)}
              />
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                點擊地圖或使用上方圖釘工具，選擇位置後開始搜尋該地點的淹水風險資訊
              </p>
            </Card>

            <NewsResults news={news} isLoading={isNewsLoading} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              資料來源：公開資訊、新聞報導、政府機關公告
            </p>
            <p className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              此工具僅供參考，實際風險評估建議諮詢專業機構
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
