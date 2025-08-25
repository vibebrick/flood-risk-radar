const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

// 提供靜態檔案
app.use(express.static('src'));
app.use(express.static('public'));
app.use(express.static('.'));

// SPA 路由處理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 開發伺服器已啟動: http://localhost:${port}`);
  console.log('📝 開啟瀏覽器查看即時預覽');
  console.log('🔄 手動重新整理頁面查看變更');
});
