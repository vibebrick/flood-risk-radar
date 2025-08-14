import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  data?: any;
}

export const Verification: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: '數據庫淹水事件總數', status: 'pending', message: '等待測試' },
    { name: '歷史數據匯入功能', status: 'pending', message: '等待測試' },
    { name: '政府數據同步功能', status: 'pending', message: '等待測試' },
    { name: '地址地理編碼功能', status: 'pending', message: '等待測試' },
    { name: '淹水新聞搜尋功能', status: 'pending', message: '等待測試' },
  ]);

  const updateTestResult = (index: number, update: Partial<TestResult>) => {
    setTestResults(prev => prev.map((test, i) => 
      i === index ? { ...test, ...update } : test
    ));
  };

  const runTest = async (testIndex: number) => {
    updateTestResult(testIndex, { status: 'running', message: '測試中...' });

    try {
      switch (testIndex) {
        case 0: // Database flood incidents count
          const { data, error } = await supabase
            .from('flood_incidents')
            .select('*', { count: 'exact' });
          
          if (error) throw error;
          
          updateTestResult(0, {
            status: 'success',
            message: `數據庫包含 ${data?.length || 0} 筆淹水事件記錄`,
            data: { count: data?.length || 0 }
          });
          break;

        case 1: // Historical data seeding
          const { data: seedResult, error: seedError } = await supabase.functions
            .invoke('seed-historical-flood-data', {
              body: {}
            });
          
          if (seedError) throw seedError;
          
          updateTestResult(1, {
            status: 'success',
            message: `歷史數據匯入成功：${seedResult.message}`,
            data: seedResult
          });
          break;

        case 2: // Government data sync
          const { data: syncResult, error: syncError } = await supabase.functions
            .invoke('sync-government-flood-data', {
              body: {}
            });
          
          if (syncError) throw syncError;
          
          updateTestResult(2, {
            status: 'success',
            message: `政府數據同步成功：${syncResult.message}`,
            data: syncResult
          });
          break;

        case 3: // Geocoding service
          const { data: geocodeResult, error: geocodeError } = await supabase.functions
            .invoke('geocoding-service', {
              body: {
                address: '台南市安南區安中路一段',
                content: '台南市安南區安中路一段因大雨積水'
              }
            });
          
          if (geocodeError) throw geocodeError;
          
          updateTestResult(3, {
            status: 'success',
            message: `地理編碼成功：準確度 ${(geocodeResult.confidence * 100).toFixed(1)}%`,
            data: geocodeResult
          });
          break;

        case 4: // Flood news search
          const { data: newsResult, error: newsError } = await supabase.functions
            .invoke('search-flood-news', {
              body: {
                query: '台南淹水',
                location: { latitude: 23.0, longitude: 120.2 },
                radius: 500
              }
            });
          
          if (newsError) throw newsError;
          
          updateTestResult(4, {
            status: 'success',
            message: `搜尋成功：找到 ${newsResult.articles?.length || 0} 篇新聞，${newsResult.heatmapPoints?.length || 0} 個熱點`,
            data: newsResult
          });
          break;
      }
    } catch (error: any) {
      updateTestResult(testIndex, {
        status: 'error',
        message: `測試失敗：${error.message}`
      });
    }
  };

  const runAllTests = async () => {
    for (let i = 0; i < testResults.length; i++) {
      await runTest(i);
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <AlertCircle className="h-5 w-5 text-yellow-600 animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">通過</Badge>;
      case 'error':
        return <Badge variant="destructive">失敗</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">進行中</Badge>;
      default:
        return <Badge variant="outline">待測試</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            第一階段實施驗證
          </h1>
          <p className="text-muted-foreground">
            驗證淹水熱點數據系統是否成功建立
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">系統功能測試</h2>
            <Button onClick={runAllTests} className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              執行所有測試
            </Button>
          </div>

          <div className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <h3 className="font-medium">{test.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(test.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(index)}
                      disabled={test.status === 'running'}
                    >
                      測試
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {test.message}
                </p>

                {test.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary">詳細資料</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">驗證標準</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">✅ 成功標準</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• flood_incidents 表格包含 300+ 筆記錄</li>
                <li>• 歷史數據匯入功能正常運作</li>
                <li>• 政府數據同步功能可執行</li>
                <li>• 地理編碼準確度大於 80%</li>
                <li>• 搜尋功能返回真實熱點數據</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">🎯 預期效果</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 不同搜尋半徑顯示一致的核心熱點</li>
                <li>• 地理位置準確度達街道級別</li>
                <li>• 系統能處理台灣繁體中文地址</li>
                <li>• 每小時自動更新政府資料</li>
                <li>• 替換原有的隨機熱點數據</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};