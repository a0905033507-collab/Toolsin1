const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 根据网站内容自动分类
 * @param {string} url - 网站URL
 * @param {string} name - 网站名称
 * @returns {string} - 分类名称
 */
async function categorizeWebsite(url, name) {
  try {
    // 基于域名的简单分类规则
    const urlLower = url.toLowerCase();
    const nameLower = (name || '').toLowerCase();

    // 分类关键词映射
    const categoryKeywords = {
      '社交媒体': ['facebook', 'twitter', 'instagram', 'linkedin', 'weibo', 'douyin', 'tiktok', 'youtube', 'bilibili', 'reddit'],
      '开发工具': ['github', 'gitlab', 'stackoverflow', 'codepen', 'jsfiddle', 'npm', 'docker', 'vercel'],
      '搜索引擎': ['google', 'bing', 'baidu', 'duckduckgo', 'yahoo'],
      '新闻资讯': ['news', 'cnn', 'bbc', 'nytimes', 'medium', 'techcrunch', '新闻', '资讯'],
      '电商购物': ['amazon', 'ebay', 'taobao', 'jd', 'tmall', 'shop', 'store', '购物', '商城'],
      '视频娱乐': ['youtube', 'netflix', 'bilibili', 'twitch', 'vimeo', 'video', '视频'],
      '教育学习': ['coursera', 'udemy', 'khan', 'edx', 'edu', 'education', '教育', '学习', 'mooc'],
      '设计创意': ['dribbble', 'behance', 'figma', 'canva', 'adobe', 'design', '设计'],
      '生产力工具': ['notion', 'trello', 'asana', 'slack', 'zoom', 'docs', 'office'],
      '金融理财': ['bank', 'paypal', 'stripe', 'finance', 'trading', '银行', '理财'],
    };

    // 检查URL和名称中的关键词
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (urlLower.includes(keyword) || nameLower.includes(keyword)) {
          return category;
        }
      }
    }

    // 尝试从网页内容中获取更多信息
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // 获取meta标签和标题进行分析
      const description = $('meta[name="description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content') || '';
      const title = $('title').text() || '';

      const content = (description + ' ' + keywords + ' ' + title).toLowerCase();

      // 再次检查内容中的关键词
      for (const [category, categoryKeywords] of Object.entries(categoryKeywords)) {
        for (const keyword of categoryKeywords) {
          if (content.includes(keyword)) {
            return category;
          }
        }
      }
    } catch (error) {
      console.log('无法获取网页内容进行分类');
    }

    // 默认分类
    return '其他';

  } catch (error) {
    console.error('分类失败:', error.message);
    return '未分类';
  }
}

module.exports = { categorizeWebsite };
