const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 获取网站的图标
 * @param {string} url - 网站URL
 * @returns {string} - 图标URL
 */
async function getFavicon(url) {
  try {
    // 标准化URL
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    // 尝试多种方法获取favicon
    const faviconUrls = [
      // 1. Google的favicon服务
      `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
      // 2. 标准favicon路径
      `${baseUrl}/favicon.ico`,
      // 3. Apple touch icon
      `${baseUrl}/apple-touch-icon.png`,
    ];

    // 尝试从HTML中解析favicon
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // 查找各种可能的favicon链接
      const iconSelectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]'
      ];

      for (const selector of iconSelectors) {
        const href = $(selector).attr('href');
        if (href) {
          const iconUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
          faviconUrls.unshift(iconUrl);
          break;
        }
      }
    } catch (error) {
      console.log('无法解析HTML获取favicon，使用默认方法');
    }

    // 返回第一个可用的URL（优先使用Google的服务，因为最稳定）
    return faviconUrls[0];

  } catch (error) {
    console.error('获取favicon失败:', error.message);
    // 返回默认图标
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">🔗</text></svg>';
  }
}

module.exports = { getFavicon };
