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
    { name: '中央氣象署', status: 'checking', message: '檢查地理編碼API...' },
    { name: '水利署', status: 'warning', message: '未申請API' },
    { name: '災防署', status: 'warning', message: '未申請API' },
    { name: 'GDELT新聞', status: 'warning', message: '未整合' },
    { name: 'RSS新聞', status: 'checking', message: '檢查搜尋功能...' }
  ]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkAPIStatus = async () => {
    setIsRefreshing(true);
    
    try {
      // 測試氣象署地理編碼
      try {
        const result = await testEdgeFunctions.testGeocoding('台北市信義區');
        if (result?.success) {
          updateServiceStatus('中央氣象署', 'success', '地理編碼API正常');
        } else {
          updateServiceStatus('中央氣象署', 'warning', '地理編碼有問題');
        }
      } catch (error) {
        console.error('CWA geocoding test error:', error);
        updateServiceStatus('中央氣象署', 'error', `地理編碼失敗: ${error.message}`);
      }

      // 測試淹水新聞搜尋功能（僅測試基本搜尋，不涉及真實API）
      try {
        const searchResult = await testEdgeFunctions.testFloodSearch('台北市', 25.033, 121.565);
        if (searchResult?.success && searchResult.news?.length >= 0) {
          updateServiceStatus('RSS新聞', 'success', `基本搜尋正常 (${searchResult.news?.length || 0} 則模擬資料)`);
        } else {
          updateServiceStatus('RSS新聞', 'error', `搜尋功能失敗: ${searchResult?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Flood search test error:', error);
        updateServiceStatus('RSS新聞', 'error', `搜尋功能失敗: ${error.message}`);
      }

      // 淹水事件資料庫檢查（保持水利署為未申請狀態，因為這是模擬資料）
      try {
        const count = await testEdgeFunctions.getFloodIncidentsCount();
        if (count > 0) {
          // 即使有資料，也標記為模擬資料
          updateServiceStatus('水利署', 'warning', `未申請API (${count} 筆模擬資料)`);
        } else {
          updateServiceStatus('水利署', 'warning', '未申請API');
        }
      } catch (error) {
        updateServiceStatus('水利署', 'warning', '未申請API');
      }

      // 保持災防署和GDELT為未申請/未整合狀態
      // 不進行任何API測試，維持初始警告狀態

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
              <strong>系統狀態說明:</strong> 目前僅中央氣象署地理編碼和基本搜尋功能已整合。其他API需要申請相關機關的使用權限。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}