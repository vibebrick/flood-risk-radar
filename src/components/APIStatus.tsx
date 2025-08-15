import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { testEdgeFunctions } from '@/utils/edgeTestRunner';

interface APIService {
  name: string;
  status: 'success' | 'error' | 'warning' | 'checking';
  message: string;
  url?: string;
}

export function APIStatus() {
  const [services, setServices] = useState<APIService[]>([
    { name: '中央氣象署', status: 'checking', message: '檢查中...' },
    { name: '水利署', status: 'checking', message: '檢查中...' },
    { name: '災防署', status: 'checking', message: '檢查中...' },
    { name: 'GDELT新聞', status: 'checking', message: '檢查中...' },
    { name: 'RSS新聞', status: 'checking', message: '檢查中...' }
  ]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkAPIStatus = async () => {
    setIsRefreshing(true);
    
    try {
      // 測試氣象署地理編碼
      try {
        await testEdgeFunctions.testGeocoding('台北市信義區');
        updateServiceStatus('中央氣象署', 'success', 'API連線正常');
      } catch (error) {
        updateServiceStatus('中央氣象署', 'error', 'API金鑰需要設定');
      }

      // 測試淹水新聞搜尋功能
      try {
        const searchResult = await testEdgeFunctions.testFloodSearch('台北市', 25.033, 121.565);
        if (searchResult?.news?.length > 0) {
          updateServiceStatus('RSS新聞', 'success', `找到 ${searchResult.news.length} 則新聞`);
        } else {
          updateServiceStatus('RSS新聞', 'warning', '暫無相關新聞');
        }
      } catch (error) {
        updateServiceStatus('RSS新聞', 'error', '新聞搜尋失敗');
      }

      // 檢查淹水事件資料庫
      try {
        const count = await testEdgeFunctions.getFloodIncidentsCount();
        if (count > 0) {
          updateServiceStatus('水利署', 'success', `資料庫有 ${count} 筆記錄`);
        } else {
          updateServiceStatus('水利署', 'warning', '資料庫尚無資料');
        }
      } catch (error) {
        updateServiceStatus('水利署', 'error', '資料庫連線失敗');
      }

      // 模擬其他API狀態
      updateServiceStatus('災防署', 'warning', 'API金鑰待申請');
      updateServiceStatus('GDELT新聞', 'warning', '查詢格式需優化');

    } catch (error) {
      console.error('API狀態檢查失敗:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateServiceStatus = (name: string, status: APIService['status'], message: string) => {
    setServices(prev => prev.map(service => 
      service.name === name ? { ...service, status, message } : service
    ));
  };

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const getStatusIcon = (status: APIService['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: APIService['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500 text-white">正常</Badge>;
      case 'error':
        return <Badge variant="destructive">錯誤</Badge>;
      case 'warning':
        return <Badge variant="secondary">警告</Badge>;
      case 'checking':
        return <Badge variant="outline">檢查中</Badge>;
    }
  };

  const successCount = services.filter(s => s.status === 'success').length;
  const totalCount = services.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              API 整合狀態
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkAPIStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              系統整合度: {successCount}/{totalCount} ({Math.round(successCount/totalCount*100)}%)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground">{service.message}</div>
                </div>
              </div>
              {getStatusBadge(service.status)}
            </div>
          ))}
        </div>
        
        {successCount < totalCount && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> 部分API尚未完全整合。請確認已申請必要的API金鑰。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}