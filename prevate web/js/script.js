/**
 * 语言切换功能
 * Language switching functionality
 */

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示中文内容
    switchLanguage('zh');
});

/**
 * 切换显示语言
 * @param {string} lang - 语言代码 ('zh' 中文, 'en' 英文)
 */
function switchLanguage(lang) {
    // 获取所有内容区域
    const contents = document.querySelectorAll('.content');
    // 获取所有语言切换按钮
    const buttons = document.querySelectorAll('.tab-btn');
    
    // 隐藏所有内容
    contents.forEach(content => {
        content.classList.remove('active');
    });
    
    // 移除所有按钮的激活状态
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    // 显示选定语言的内容
    document.getElementById(`${lang}-content`).classList.add('active');
    
    // 激活对应的按钮
    buttons.forEach(button => {
        if (button.textContent === (lang === 'zh' ? '中文' : 'English')) {
            button.classList.add('active');
        }
    });
} 