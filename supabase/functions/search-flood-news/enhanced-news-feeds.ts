/**
 * 增強型新聞 RSS 整合
 * 整合台灣所有主要新聞媒體的 RSS 源
 */

interface NewsSource {
  name: string;
  rssUrl: string;
  type: 'national' | 'local' | 'weather' | 'government';
  encoding?: string;
  priority: number;
}

interface EnhancedNewsItem {
  title: string;
  url: string;
  content_snippet: string;
  source: string;
  publish_date: string;
  content_type: string;
  relevance_score: number;
  location_relevance: number;
  flood_relevance: number;
}

export class EnhancedNewsFeeds {
  private readonly newsSources: NewsSource[] = [
    // 全國性新聞媒體
    { name: '中央社', rssUrl: 'https://feeds.feedburner.com/cnanews', type: 'national', priority: 9 },
    { name: '自由時報', rssUrl: 'https://news.ltn.com.tw/rss/all.xml', type: 'national', priority: 8 },
    { name: '聯合新聞網', rssUrl: 'https://udn.com/rssfeed/news/2/6638?ch=news', type: 'national', priority: 8 },
    { name: '中時新聞網', rssUrl: 'https://www.chinatimes.com/rss/realtimenews.xml', type: 'national', priority: 7 },
    { name: '三立新聞', rssUrl: 'https://www.setn.com/Rss.aspx?ProjectID=1', type: 'national', priority: 7 },
    { name: 'TVBS新聞', rssUrl: 'https://news.tvbs.com.tw/rss/news', type: 'national', priority: 7 },
    { name: '東森新聞', rssUrl: 'https://news.ebc.net.tw/rss.xml', type: 'national', priority: 6 },
    { name: '民視新聞', rssUrl: 'https://www.ftvnews.com.tw/rss/news.xml', type: 'national', priority: 6 },
    
    // 氣象與災害專業媒體
    { name: '中央氣象署', rssUrl: 'https://www.cwb.gov.tw/rss/forecast.xml', type: 'weather', priority: 10 },
    { name: '災害應變中心', rssUrl: 'https://www.emic.gov.tw/rss/disaster.xml', type: 'government', priority: 9 },
    
    // 地方新聞媒體
    { name: '台北市政府', rssUrl: 'https://www.gov.taipei/News/RSS', type: 'local', priority: 8 },
    { name: '新北市政府', rssUrl: 'https://www.ntpc.gov.tw/rss/news', type: 'local', priority: 8 },
    { name: '台中市政府', rssUrl: 'https://www.taichung.gov.tw/rss/news', type: 'local', priority: 7 },
    { name: '台南市政府', rssUrl: 'https://www.tainan.gov.tw/rss/news', type: 'local', priority: 7 },
    { name: '高雄市政府', rssUrl: 'https://www.kcg.gov.tw/rss/news', type: 'local', priority: 7 },
    
    // 專業災害媒體
    { name: '天氣風險', rssUrl: 'https://www.weatherrisk.com/rss/news.xml', type: 'weather', priority: 8 },
    { name: '台灣防災資訊網', rssUrl: 'https://alerts.ncdr.nat.gov.tw/rss/alerts.xml', type: 'government', priority: 9 },
    
    // 國際新聞與搜尋引擎新聞 (已驗證可用)
    { name: 'Google News 淹水', rssUrl: 'https://news.google.com/rss/search?q=淹水%20OR%20積水%20OR%20水災%20OR%20豪雨&hl=zh-TW&gl=TW&ceid=TW:zh-Hant', type: 'national', priority: 9 },
    { name: 'Google News 台灣', rssUrl: 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', type: 'national', priority: 7 },
    { name: 'Yahoo新聞台灣', rssUrl: 'https://tw.news.yahoo.com/rss', type: 'national', priority: 6 },
    
    // 災害預警專用 Google News 搜尋
    { name: 'Google News 災害', rssUrl: 'https://news.google.com/rss/search?q=颱風%20OR%20暴雨%20OR%20災害警報&hl=zh-TW&gl=TW&ceid=TW:zh-Hant', type: 'weather', priority: 8 }
  ];

  constructor() {
    console.log(`🌐 初始化增強型新聞整合: ${this.newsSources.length} 個新聞源`);
  }

  /**
   * 獲取所有新聞源的淹水相關新聞
   */
  async fetchAllFloodNews(locationKeywords: string): Promise<EnhancedNewsItem[]> {
    console.log(`🔍 開始從 ${this.newsSources.length} 個新聞源獲取淹水資訊`);
    
    const results: EnhancedNewsItem[] = [];
    const fetchPromises: Promise<EnhancedNewsItem[]>[] = [];

    // 按優先級分組並行處理
    const highPriority = this.newsSources.filter(s => s.priority >= 8);
    const mediumPriority = this.newsSources.filter(s => s.priority >= 6 && s.priority < 8);
    
    // 先處理高優先級源
    for (const source of highPriority) {
      fetchPromises.push(this.fetchFromSource(source, locationKeywords));
    }
    
    // 等待高優先級完成
    const highPriorityResults = await Promise.allSettled(fetchPromises);
    
    // 處理結果
    highPriorityResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
        console.log(`✅ ${highPriority[index].name}: ${result.value.length} 篇`);
      } else {
        console.log(`❌ ${highPriority[index].name}: ${result.reason?.message || '失敗'}`);
      }
    });

    // 如果高優先級結果不足，處理中優先級
    if (results.length < 10) {
      const mediumPromises: Promise<EnhancedNewsItem[]>[] = [];
      
      for (const source of mediumPriority) {
        mediumPromises.push(this.fetchFromSource(source, locationKeywords));
      }
      
      const mediumResults = await Promise.allSettled(mediumPromises);
      
      mediumResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
          console.log(`✅ ${mediumPriority[index].name}: ${result.value.length} 篇`);
        } else {
          console.log(`❌ ${mediumPriority[index].name}: ${result.reason?.message || '失敗'}`);
        }
      });
    }

    // 去重並按相關性排序
    const uniqueResults = this.deduplicateNews(results);
    const sortedResults = uniqueResults
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 25);

    console.log(`📊 新聞整合完成: ${sortedResults.length} 篇高相關性新聞`);
    
    return sortedResults;
  }

  /**
   * 從單一新聞源獲取資料
   */
  private async fetchFromSource(source: NewsSource, locationKeywords: string): Promise<EnhancedNewsItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(source.rssUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodRiskRadar/1.0; +https://flood-risk-radar.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let xmlText = await response.text();
      
      // 處理編碼問題
      if (source.encoding === 'big5') {
        // 處理 Big5 編碼 (如需要)
        xmlText = this.convertBig5ToUtf8(xmlText);
      }

      const items = await this.parseRSSFeed(xmlText, source);
      const relevantItems = this.filterRelevantNews(items, locationKeywords, source);

      return relevantItems;

    } catch (error) {
      console.log(`${source.name} 獲取失敗:`, error.message);
      return [];
    }
  }

  /**
   * 解析 RSS/Atom Feed
   */
  private async parseRSSFeed(xmlText: string, source: NewsSource): Promise<any[]> {
    const items: any[] = [];
    
    // 支援 RSS 2.0
    const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    
    // 支援 Atom
    const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    
    let match;
    let isAtom = xmlText.includes('<feed');
    
    const regex = isAtom ? atomEntryRegex : rssItemRegex;
    
    while ((match = regex.exec(xmlText)) !== null && items.length < 20) {
      const itemContent = match[1];
      
      let title, link, description, pubDate;
      
      if (isAtom) {
        // Atom format
        title = this.extractXMLContent(itemContent, 'title');
        const linkMatch = itemContent.match(/<link[^>]*href="([^"]*)"[^>]*>/i);
        link = linkMatch ? linkMatch[1] : '';
        description = this.extractXMLContent(itemContent, 'summary') || this.extractXMLContent(itemContent, 'content');
        pubDate = this.extractXMLContent(itemContent, 'updated') || this.extractXMLContent(itemContent, 'published');
      } else {
        // RSS format
        title = this.extractXMLContent(itemContent, 'title');
        link = this.extractXMLContent(itemContent, 'link');
        description = this.extractXMLContent(itemContent, 'description');
        pubDate = this.extractXMLContent(itemContent, 'pubDate') || this.extractXMLContent(itemContent, 'dc:date');
      }

      if (title && link) {
        items.push({
          title: this.cleanText(title),
          url: this.cleanText(link),
          content_snippet: this.cleanText(description || ''),
          publish_date: this.parseDate(pubDate),
          source: source.name,
          priority: source.priority
        });
      }
    }

    return items;
  }

  /**
   * 篩選相關新聞
   */
  private filterRelevantNews(items: any[], locationKeywords: string, source: NewsSource): EnhancedNewsItem[] {
    return items.map(item => {
      const locationRelevance = this.calculateLocationRelevance(item.title, item.content_snippet, locationKeywords);
      const floodRelevance = this.calculateFloodRelevance(item.title, item.content_snippet);
      const relevanceScore = this.calculateTotalRelevance(locationRelevance, floodRelevance, source);

      return {
        title: item.title,
        url: item.url,
        content_snippet: item.content_snippet,
        source: item.source,
        publish_date: item.publish_date,
        content_type: this.getContentType(source.type),
        relevance_score: relevanceScore,
        location_relevance: locationRelevance,
        flood_relevance: floodRelevance
      };
    }).filter(item => item.relevance_score > 2); // 只保留相關性 > 2 的新聞
  }

  /**
   * 計算地理相關性
   */
  private calculateLocationRelevance(title: string, content: string, targetLocation: string): number {
    let score = 0;
    const locationParts = targetLocation.split(/[市區縣鄉鎮,，\s]+/).filter(p => p.length > 1);
    const text = (title + ' ' + content).toLowerCase();
    
    // 精確匹配
    locationParts.forEach(part => {
      const partLower = part.toLowerCase();
      const titleLower = title.toLowerCase();
      const contentLower = content.toLowerCase();
      
      // 標題匹配權重更高
      if (titleLower.includes(partLower)) {
        score += partLower.length >= 3 ? 4 : 3;
      }
      
      // 內容匹配
      if (contentLower.includes(partLower)) {
        score += partLower.length >= 3 ? 2 : 1;
      }
      
      // 完全匹配加分
      if (text.includes(targetLocation.toLowerCase())) {
        score += 3;
      }
    });
    
    return Math.min(score, 10);
  }

  /**
   * 計算淹水相關性
   */
  private calculateFloodRelevance(title: string, content: string): number {
    const floodTerms = [
      { terms: ['淹水', '積水', '水災', '洪災'], weight: 5 },
      { terms: ['豪雨', '暴雨', '大雨', '強降雨'], weight: 4 },
      { terms: ['颱風', '颶風', '熱帶氣旋'], weight: 4 },
      { terms: ['梅雨', '鋒面', '低氣壓'], weight: 3 },
      { terms: ['排水', '下水道', '溝渠', '水溝'], weight: 3 },
      { terms: ['淹沒', '浸水', '溢堤', '潰堤'], weight: 4 },
      { terms: ['水位上漲', '水位警戒', '河川氾濫'], weight: 4 },
      { terms: ['災情', '災害', '受災', '災區'], weight: 3 },
      { terms: ['封路', '道路中斷', '交通中斷'], weight: 2 },
      { terms: ['停班停課', '警戒區', '撤離'], weight: 3 },
      { terms: ['抽水', '抽水機', '抽水站'], weight: 2 },
      { terms: ['看海', '划船'], weight: 1 } // 網路用語
    ];
    
    let score = 0;
    const text = (title + ' ' + content).toLowerCase();
    const titleLower = title.toLowerCase();
    
    floodTerms.forEach(({ terms, weight }) => {
      terms.forEach(term => {
        if (text.includes(term)) {
          score += weight;
          // 標題中的關鍵字權重加倍
          if (titleLower.includes(term)) {
            score += weight;
          }
        }
      });
    });
    
    return Math.min(score, 15);
  }

  /**
   * 計算總相關性評分
   */
  private calculateTotalRelevance(locationRelevance: number, floodRelevance: number, source: NewsSource): number {
    let score = locationRelevance + floodRelevance;
    
    // 來源權重加成
    const sourceBonus = {
      'government': 2,
      'weather': 1.5,
      'national': 1.2,
      'local': 1
    };
    
    score *= (sourceBonus[source.type] || 1);
    
    // 優先級加成
    score += source.priority * 0.1;
    
    return Math.round(score * 10) / 10;
  }

  private getContentType(sourceType: string): string {
    const typeMap = {
      'government': '政府資訊',
      'weather': '氣象資料',
      'national': '全國新聞',
      'local': '地方新聞'
    };
    return typeMap[sourceType] || '新聞';
  }

  private extractXMLContent(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*?>(.*?)<\/${tag}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseDate(dateString: string): string {
    try {
      if (!dateString) return new Date().toISOString();
      
      // 處理各種日期格式
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // 處理中文日期格式
      const chineseDateMatch = dateString.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
      if (chineseDateMatch) {
        const [, year, month, day] = chineseDateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      }
      
      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  private convertBig5ToUtf8(text: string): string {
    // 簡單的 Big5 轉換處理，實際需要更複雜的實現
    return text;
  }

  /**
   * 新聞去重
   */
  private deduplicateNews(newsItems: EnhancedNewsItem[]): EnhancedNewsItem[] {
    const seen = new Set<string>();
    const uniqueItems: EnhancedNewsItem[] = [];
    
    // 按相關性降序排列，保留最相關的
    const sortedItems = newsItems.sort((a, b) => b.relevance_score - a.relevance_score);
    
    for (const item of sortedItems) {
      const key = this.generateDedupeKey(item);
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }
    
    return uniqueItems;
  }

  private generateDedupeKey(item: EnhancedNewsItem): string {
    // 使用 URL 和標題的組合作為去重鍵
    const urlKey = item.url.replace(/[?&]utm_[^&]*/g, '').toLowerCase();
    const titleKey = item.title.toLowerCase().replace(/\s+/g, '').slice(0, 20);
    
    return `${urlKey}|${titleKey}`;
  }
}