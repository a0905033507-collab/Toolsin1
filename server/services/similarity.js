const stringSimilarity = require('string-similarity');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/websites.json');

/**
 * 获取网站的文本内容用于相似度比较
 */
async function getWebsiteContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // 移除脚本和样式
    $('script, style, noscript').remove();

    // 获取标题
    const title = $('title').text().trim();

    // 获取meta描述
    const description = $('meta[name="description"]').attr('content') || '';

    // 获取主要文本内容
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);

    return {
      title,
      description,
      content: `${title} ${description} ${bodyText}`.toLowerCase()
    };
  } catch (error) {
    console.error(`获取网站内容失败 ${url}:`, error.message);
    return { title: '', description: '', content: '' };
  }
}

/**
 * 比较两个网站的相似度
 */
function calculateSimilarity(content1, content2, website1, website2) {
  // 1. URL相似度
  const urlSimilarity = stringSimilarity.compareTwoStrings(website1.url, website2.url);

  // 2. 名称相似度
  const nameSimilarity = stringSimilarity.compareTwoStrings(
    website1.name.toLowerCase(),
    website2.name.toLowerCase()
  );

  // 3. 内容相似度
  const contentSimilarity = stringSimilarity.compareTwoStrings(
    content1.content,
    content2.content
  );

  // 4. 分类是否相同
  const sameCategory = website1.category === website2.category ? 0.2 : 0;

  // 综合评分（权重：URL 20%, 名称 30%, 内容 40%, 分类 10%）
  const totalSimilarity =
    urlSimilarity * 0.2 +
    nameSimilarity * 0.3 +
    contentSimilarity * 0.4 +
    sameCategory;

  return {
    score: totalSimilarity,
    details: {
      url: urlSimilarity,
      name: nameSimilarity,
      content: contentSimilarity,
      category: sameCategory > 0
    }
  };
}

/**
 * 检查所有网站的相似度
 */
async function checkSimilarWebsites() {
  try {
    // 读取数据
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const { websites } = JSON.parse(data);

    if (websites.length < 2) {
      console.log('网站数量不足，无需检查相似度');
      return;
    }

    console.log(`开始检查 ${websites.length} 个网站的相似度...`);

    // 获取所有网站内容
    const websiteContents = new Map();
    for (const website of websites) {
      const content = await getWebsiteContent(website.url);
      websiteContents.set(website.id, content);
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 查找相似的网站
    const suggestions = [];
    const processed = new Set();

    for (let i = 0; i < websites.length; i++) {
      for (let j = i + 1; j < websites.length; j++) {
        const website1 = websites[i];
        const website2 = websites[j];

        const key = `${website1.id}-${website2.id}`;
        if (processed.has(key)) continue;

        const content1 = websiteContents.get(website1.id);
        const content2 = websiteContents.get(website2.id);

        const similarity = calculateSimilarity(content1, content2, website1, website2);

        // 相似度阈值：0.6以上认为是相似网站
        if (similarity.score >= 0.6) {
          processed.add(key);

          // 查找是否已有包含这些网站的建议
          let existingSuggestion = suggestions.find(s =>
            s.websites.some(w => w.id === website1.id || w.id === website2.id)
          );

          if (existingSuggestion) {
            // 添加到现有建议
            if (!existingSuggestion.websites.find(w => w.id === website1.id)) {
              existingSuggestion.websites.push(website1);
            }
            if (!existingSuggestion.websites.find(w => w.id === website2.id)) {
              existingSuggestion.websites.push(website2);
            }
          } else {
            // 创建新建议
            suggestions.push({
              id: Date.now().toString() + Math.random().toString(36).substring(2),
              websites: [website1, website2],
              similarity: similarity.score,
              createdAt: new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      }
    }

    if (suggestions.length > 0) {
      console.log(`发现 ${suggestions.length} 组相似网站`);

      // 保存建议
      const fullData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
      fullData.suggestions = suggestions;
      await fs.writeFile(DATA_FILE, JSON.stringify(fullData, null, 2));
    } else {
      console.log('未发现相似网站');
    }

    return suggestions;

  } catch (error) {
    console.error('检查相似度失败:', error);
    throw error;
  }
}

module.exports = { checkSimilarWebsites, getWebsiteContent, calculateSimilarity };
