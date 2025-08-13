import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

// Reusable loading spinner
export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}> = ({ size = 'md', text, className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

// Map loading skeleton
export const MapLoadingSkeleton: React.FC = () => (
  <div className="w-full h-[500px] rounded-lg overflow-hidden">
    <Skeleton className="w-full h-full" />
    <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
      <div className="text-center space-y-2">
        <LoadingSpinner size="md" />
        <div className="text-muted-foreground text-sm">載入地圖中...</div>
      </div>
    </div>
  </div>
);

// News results loading skeleton
export const NewsLoadingSkeleton: React.FC = () => (
  <Card className="p-6 shadow-card">
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </Card>
);

// Search form loading state
export const SearchFormLoadingSkeleton: React.FC = () => (
  <Card className="p-4 shadow-card">
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  </Card>
);

// Network status indicator
export const NetworkStatusIndicator: React.FC<{ 
  isOnline: boolean;
  className?: string;
}> = ({ isOnline, className = '' }) => (
  <div className={`flex items-center gap-2 text-sm ${className}`}>
    {isOnline ? (
      <>
        <Wifi className="h-4 w-4 text-success" />
        <span className="text-success">已連線</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4 text-destructive" />
        <span className="text-destructive">離線</span>
      </>
    )}
  </div>
);

// Progressive loading component
export const ProgressiveLoader: React.FC<{
  stages: string[];
  currentStage: number;
  error?: string;
  onRetry?: () => void;
}> = ({ stages, currentStage, error, onRetry }) => (
  <div className="text-center space-y-4">
    <LoadingSpinner size="lg" />
    
    <div className="space-y-2">
      {stages.map((stage, index) => (
        <div 
          key={index}
          className={`text-sm flex items-center justify-center gap-2 ${
            index < currentStage 
              ? 'text-success' 
              : index === currentStage 
                ? 'text-primary' 
                : 'text-muted-foreground'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            index < currentStage 
              ? 'bg-success' 
              : index === currentStage 
                ? 'bg-primary animate-pulse' 
                : 'bg-muted'
          }`} />
          {stage}
        </div>
      ))}
    </div>
    
    {error && (
      <div className="text-center space-y-2">
        <div className="text-destructive text-sm">{error}</div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
          >
            重試
          </button>
        )}
      </div>
    )}
  </div>
);

// Global loading overlay
export const GlobalLoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
}> = ({ isVisible, message = '載入中...' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="p-6 shadow-card">
        <LoadingSpinner size="lg" text={message} />
      </Card>
    </div>
  );
};