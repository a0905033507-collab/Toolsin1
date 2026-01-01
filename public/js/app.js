// API基础URL
const API_BASE = '/api/websites';

// 全局状态
let websites = [];
let categories = [];
let suggestions = [];
let currentFilter = 'all';

// DOM元素
const urlInput = document.getElementById('urlInput');
const nameInput = document.getElementById('nameInput');
const addBtn = document.getElementById('addBtn');
const websitesContainer = document.getElementById('websitesContainer');
const emptyState = document.getElementById('emptyState');
const categoryFilter = document.getElementById('categoryFilter');
const refreshBtn = document.getElementById('refreshBtn');
const suggestionAlert = document.getElementById('suggestionAlert');
const suggestionCount = document.getElementById('suggestionCount');
const viewSuggestionsBtn = document.getElementById('viewSuggestionsBtn');
const suggestionModal = document.getElementById('suggestionModal');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const loadingOverlay = document.getElementById('loadingOverlay');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    addBtn.addEventListener('click', addWebsite);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addWebsite();
    });
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addWebsite();
    });
    categoryFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderWebsites();
    });
    refreshBtn.addEventListener('click', loadData);
    viewSuggestionsBtn.addEventListener('click', showSuggestions);

    // 模态框关闭
    const closeBtn = suggestionModal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        suggestionModal.classList.remove('show');
    });

    // 点击模态框外部关闭
    suggestionModal.addEventListener('click', (e) => {
        if (e.target === suggestionModal) {
            suggestionModal.classList.remove('show');
        }
    });
}

// 显示/隐藏加载动画
function showLoading(show = true) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 加载数据
async function loadData() {
    try {
        const response = await fetch(API_BASE);
        const data = await response.json();

        websites = data.websites || [];
        categories = data.categories || [];
        suggestions = data.suggestions || [];

        updateCategoryFilter();
        renderWebsites();
        updateSuggestionAlert();
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败', 'danger');
    }
}

// 更新分类筛选器
function updateCategoryFilter() {
    const currentValue = categoryFilter.value;

    // 清空选项
    categoryFilter.innerHTML = '<option value="all">全部分类</option>';

    // 添加分类选项
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // 恢复之前的选择
    if (currentValue && categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

// 渲染网站列表
function renderWebsites() {
    const filteredWebsites = currentFilter === 'all'
        ? websites
        : websites.filter(w => w.category === currentFilter);

    if (filteredWebsites.length === 0) {
        websitesContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    websitesContainer.innerHTML = filteredWebsites.map(website => `
        <div class="website-card" data-id="${website.id}">
            <img
                src="${website.favicon}"
                alt="${website.name}"
                class="website-icon"
                onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><text y=\\".9em\\" font-size=\\"90\\">🔗</text></svg>'"
            />
            <div class="website-name">${escapeHtml(website.name)}</div>
            <span class="website-category">${escapeHtml(website.category)}</span>
            <div class="website-url" title="${escapeHtml(website.url)}">
                ${escapeHtml(new URL(website.url).hostname)}
            </div>
            <div class="website-actions">
                <button class="btn-delete" onclick="deleteWebsite('${website.id}')">删除</button>
            </div>
        </div>
    `).join('');

    // 为网站卡片添加点击事件
    document.querySelectorAll('.website-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-delete')) {
                const id = card.getAttribute('data-id');
                const website = websites.find(w => w.id === id);
                if (website) {
                    window.open(website.url, '_blank');
                }
            }
        });
    });
}

// 添加网站
async function addWebsite() {
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();

    if (!url) {
        showNotification('请输入网址', 'warning');
        return;
    }

    // 验证URL格式
    try {
        new URL(url);
    } catch {
        showNotification('请输入有效的网址', 'warning');
        return;
    }

    showLoading();

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, name })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加失败');
        }

        const newWebsite = await response.json();

        // 清空输入框
        urlInput.value = '';
        nameInput.value = '';

        showNotification('网站添加成功！', 'success');

        // 重新加载数据
        await loadData();

    } catch (error) {
        console.error('添加网站失败:', error);
        showNotification(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// 删除网站
async function deleteWebsite(id) {
    if (!confirm('确定要删除这个网站吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除失败');
        }

        showNotification('网站已删除', 'success');
        await loadData();

    } catch (error) {
        console.error('删除网站失败:', error);
        showNotification('删除失败', 'danger');
    }
}

// 更新建议提示
function updateSuggestionAlert() {
    if (suggestions.length > 0) {
        suggestionCount.textContent = suggestions.length;
        suggestionAlert.style.display = 'flex';
    } else {
        suggestionAlert.style.display = 'none';
    }
}

// 显示相似度建议
function showSuggestions() {
    if (suggestions.length === 0) {
        showNotification('暂无建议', 'info');
        return;
    }

    suggestionsContainer.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item" data-suggestion-id="${suggestion.id}">
            <div class="suggestion-header">
                发现 ${suggestion.websites.length} 个相似的网站 (相似度: ${(suggestion.similarity * 100).toFixed(1)}%)
            </div>
            <div class="similar-websites" id="similar-websites-${suggestion.id}">
                ${suggestion.websites.map(website => `
                    <div class="similar-website-item" data-website-id="${website.id}">
                        <img
                            src="${website.favicon}"
                            alt="${website.name}"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><text y=\\".9em\\" font-size=\\"90\\">🔗</text></svg>'"
                        />
                        <div style="font-size: 0.875rem; font-weight: 500;">${escapeHtml(website.name)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                            ${escapeHtml(new URL(website.url).hostname)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="suggestion-actions">
                <button class="btn btn-sm btn-merge" onclick="handleSuggestion('${suggestion.id}', 'merge')">
                    保留选中，删除其他
                </button>
                <button class="btn btn-sm btn-dismiss" onclick="handleSuggestion('${suggestion.id}', 'dismiss')">
                    忽略建议
                </button>
            </div>
        </div>
    `).join('');

    // 为网站项添加选择功能
    document.querySelectorAll('.similar-website-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('selected');
        });
        // 默认选中第一个
        if (item.parentElement.querySelector('.similar-website-item') === item) {
            item.classList.add('selected');
        }
    });

    suggestionModal.classList.add('show');
}

// 处理建议
async function handleSuggestion(suggestionId, action) {
    const suggestionElement = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    const selectedItems = suggestionElement.querySelectorAll('.similar-website-item.selected');

    if (action === 'merge') {
        if (selectedItems.length === 0) {
            showNotification('请至少选择一个要保留的网站', 'warning');
            return;
        }

        const keepIds = Array.from(selectedItems).map(item =>
            item.getAttribute('data-website-id')
        );

        if (!confirm(`确定要保留选中的 ${keepIds.length} 个网站，删除其他网站吗？`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/suggestions/${suggestionId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'merge', keepIds })
            });

            if (!response.ok) {
                throw new Error('处理失败');
            }

            showNotification('已处理建议', 'success');
            suggestionModal.classList.remove('show');
            await loadData();

        } catch (error) {
            console.error('处理建议失败:', error);
            showNotification('处理失败', 'danger');
        }
    } else if (action === 'dismiss') {
        try {
            const response = await fetch(`${API_BASE}/suggestions/${suggestionId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'dismiss', keepIds: [] })
            });

            if (!response.ok) {
                throw new Error('处理失败');
            }

            showNotification('已忽略建议', 'success');
            suggestionModal.classList.remove('show');
            await loadData();

        } catch (error) {
            console.error('处理建议失败:', error);
            showNotification('处理失败', 'danger');
        }
    }
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
