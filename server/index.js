const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const websitesRouter = require('./routes/websites');
const { checkSimilarWebsites } = require('./services/similarity');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.use('/api/websites', websitesRouter);

// 每周日凌晨2点检查相似网站
cron.schedule('0 2 * * 0', async () => {
  console.log('开始每周相似度检查...');
  try {
    await checkSimilarWebsites();
  } catch (error) {
    console.error('相似度检查失败:', error);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('网站整合工具已启动！');
});
