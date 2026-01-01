const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { getFavicon } = require('../services/favicon');
const { categorizeWebsite } = require('../services/categorize');

const DATA_FILE = path.join(__dirname, '../data/websites.json');

// 确保数据文件存在
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ websites: [], categories: [], suggestions: [] }, null, 2));
  }
}

// 读取数据
async function readData() {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// 写入数据
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// 获取所有网站
router.get('/', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

// 添加新网站
router.post('/', async (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url) {
      return res.status(400).json({ error: '网址不能为空' });
    }

    const data = await readData();

    // 检查网址是否已存在
    const exists = data.websites.find(w => w.url === url);
    if (exists) {
      return res.status(400).json({ error: '该网站已存在' });
    }

    // 获取网站图标和分类
    const favicon = await getFavicon(url);
    const category = await categorizeWebsite(url, name);

    const website = {
      id: Date.now().toString(),
      url,
      name: name || new URL(url).hostname,
      favicon,
      category,
      addedAt: new Date().toISOString()
    };

    data.websites.push(website);

    // 更新分类列表
    if (category && !data.categories.includes(category)) {
      data.categories.push(category);
    }

    await writeData(data);
    res.json(website);
  } catch (error) {
    console.error('添加网站失败:', error);
    res.status(500).json({ error: '添加网站失败: ' + error.message });
  }
});

// 删除网站
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();

    data.websites = data.websites.filter(w => w.id !== id);
    await writeData(data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除网站失败' });
  }
});

// 更新网站
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await readData();

    const index = data.websites.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '网站不存在' });
    }

    data.websites[index] = { ...data.websites[index], ...updates };
    await writeData(data);

    res.json(data.websites[index]);
  } catch (error) {
    res.status(500).json({ error: '更新网站失败' });
  }
});

// 获取相似度建议
router.get('/suggestions', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.suggestions || []);
  } catch (error) {
    res.status(500).json({ error: '读取建议失败' });
  }
});

// 处理相似度建议
router.post('/suggestions/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, keepIds } = req.body; // action: 'merge', 'delete', 'dismiss'
    const data = await readData();

    const suggestionIndex = data.suggestions.findIndex(s => s.id === id);
    if (suggestionIndex === -1) {
      return res.status(404).json({ error: '建议不存在' });
    }

    const suggestion = data.suggestions[suggestionIndex];

    if (action === 'merge' || action === 'delete') {
      // 删除不保留的网站
      const idsToDelete = suggestion.websites
        .filter(w => !keepIds.includes(w.id))
        .map(w => w.id);

      data.websites = data.websites.filter(w => !idsToDelete.includes(w.id));
    }

    // 移除已处理的建议
    data.suggestions.splice(suggestionIndex, 1);

    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '处理建议失败' });
  }
});

module.exports = router;
