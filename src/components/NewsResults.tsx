import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Globe } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  content_snippet?: string;
  publish_date?: string;
  content_type?: string;
}

interface NewsResultsProps {
  news: NewsItem[];
  isLoading?: boolean;
}

export const NewsResults: React.FC<NewsResultsProps> = ({ news, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card className="p-6 shadow-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">相關新聞與討論</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (news.length === 0) {
    return (
      <Card className="p-6 shadow-card">
        <div className="text-center py-8">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">暫無相關新聞</h3>
          <p className="text-muted-foreground">
            目前沒有找到該區域的淹水相關新聞，這可能是個好消息！
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">相關新聞與討論</h3>
          <Badge variant="secondary">{news.length} 筆資料</Badge>
        </div>
        
        <div className="space-y-4">
          {news.map((item) => (
            <Card key={item.id} className="p-4 border border-border hover:shadow-card transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground leading-tight">
                        {item.title}
                      </h4>
                      {item.content_type && (
                        <Badge 
                          variant={
                            item.content_type.includes('PTT') || item.content_type.includes('Dcard') || 
                            item.content_type.includes('Facebook') || item.content_type.includes('Line') ||
                            item.content_type.includes('Instagram') ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {item.content_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                
                {item.content_snippet && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.content_snippet}
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.source && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <span>{item.source}</span>
                    </div>
                  )}
                  {item.publish_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.publish_date).toLocaleDateString('zh-TW')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};