// 内容脚本，用于与页面交互
// 这个脚本注入到所有页面中

// 创建一个浮动按钮，用于快速打开侧边栏
function createFloatingButton() {
  // 检查是否已经存在
  if (document.getElementById('health-assistant-btn')) return;
  
  // 创建按钮
  const button = document.createElement('div');
  button.id = 'health-assistant-btn';
  button.innerHTML = '🏃';
  button.title = '健康小助手';
  
  // 设置样式
  button.style.position = 'fixed';
  button.style.right = '20px';
  button.style.bottom = '20px';
  button.style.width = '50px';
  button.style.height = '50px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = '#3a86ff';
  button.style.color = 'white';
  button.style.display = 'flex';
  button.style.justifyContent = 'center';
  button.style.alignItems = 'center';
  button.style.fontSize = '24px';
  button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  button.style.cursor = 'pointer';
  button.style.zIndex = '9999';
  button.style.transition = 'transform 0.2s, background-color 0.2s';
  
  // 鼠标悬停效果
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  // 点击事件
  button.addEventListener('click', () => {
    // 发送消息给后台脚本，打开侧边栏
    chrome.runtime.sendMessage({ action: 'openSidebar' });
    
    // 动画效果
    button.style.transform = 'scale(0.9)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 100);
  });
  
  // 添加到页面
  document.body.appendChild(button);
}

// 使用MutationObserver监听DOM变化，确保在动态加载的页面上也能正常工作
function observeDOM() {
  // 只在页面完全加载后运行
  if (document.readyState === 'complete') {
    createFloatingButton();
  } else {
    window.addEventListener('load', createFloatingButton);
  }
  
  // 创建一个observer实例
  const observer = new MutationObserver((mutations) => {
    // 如果按钮被移除，重新添加
    if (!document.getElementById('health-assistant-btn')) {
      createFloatingButton();
    }
  });
  
  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 初始化
observeDOM();

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkStatus') {
    // 回复当前状态
    sendResponse({ exists: !!document.getElementById('health-assistant-btn') });
  }
}); 