// ==========================================
// 0. 安全弹窗拦截逻辑 (页面加载即执行)
// ==========================================
const securityModal = document.getElementById('security-modal');
const securityContent = document.getElementById('security-content');
const agreeBtn = document.getElementById('agree-btn');
const agreeCheckbox = document.getElementById('agree-checkbox');
let isTimerStarted = false;

// 锁定底层页面，防止用户在没同意前滑动底部主页面
document.body.style.overflow = 'hidden';

if (securityContent && agreeBtn) {
    // 监听滑动事件
    securityContent.addEventListener('scroll', () => {
        if (isTimerStarted) return; 
        
        // 检测是否滑动到了底部 (容差 10px)
        if (securityContent.scrollTop + securityContent.clientHeight >= securityContent.scrollHeight - 10) {
            isTimerStarted = true; 
            let timeLeft = 8; // 8 秒倒数
            agreeBtn.innerText = `请认真阅读 (${timeLeft}s)`;
            
            // 每秒执行一次倒数
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    agreeBtn.innerText = `请认真阅读 (${timeLeft}s)`;
                } else {
                    clearInterval(timer);
                    agreeBtn.innerText = "我已知晓并同意";
                    agreeBtn.disabled = false;
                }
            }, 1000);
        }
    });

    // 点击“我已知晓”后进入主页
    agreeBtn.addEventListener('click', () => {
        securityModal.style.display = 'none'; // 隐藏弹窗
        document.body.style.overflow = 'auto'; // 恢复主页面滑动
        // 自动帮用户把底部的协议勾选框打上勾
        if(agreeCheckbox) agreeCheckbox.checked = true;
    });
}

// ==========================================
// 1. 初始化 Telegram WebApp 实例
// ==========================================
const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand(); // 自动展开占满屏幕
    
    // 获取用户昵称显示
    if (tg.initDataUnsafe?.user) {
        const username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
        document.getElementById('user-display').innerText = '@' + username;
    }
}

// 全局变量，记录当前选择的套餐
let currentPlan = { transfers: 1, energy: 32000, cost: 3.2 };

// ==========================================
// 2. 切换套餐选项功能
// ==========================================
function selectPlan(transfers, energy, cost, element) {
    currentPlan = { transfers, energy, cost };
    
    // 切换按钮高亮样式
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // 动态更新底部价格
    document.getElementById('original-price').innerText = (transfers * 13.5) + ' TRX';
    document.getElementById('pay-price').innerText = cost + ' TRX';
}

// ==========================================
// 3. 核心：提交订单功能（包含完整验证）
// ==========================================
function submitOrder() {
    // 验证勾选协议
    const isAgreed = agreeCheckbox.checked;
    if (!isAgreed) {
        if (tg?.showAlert) tg.showAlert("请先勾选《钱包安全保护须知》！");
        else alert("请先勾选《钱包安全保护须知》！");
        return;
    }

    // 验证 TRON 地址
    const address = document.getElementById('tron-address').value.trim();
    if (!address || !address.startsWith('T') || address.length !== 34) {
        if (tg?.showAlert) tg.showAlert("请输入正确的 TRON (T开头，34位) 钱包地址！");
        else alert("请输入正确的 TRON (T开头，34位) 钱包地址！");
        return;
    }

    // 组装数据
    const orderData = {
        action: "buy_energy",
        transfers: currentPlan.transfers,
        energy: currentPlan.energy,
        cost: currentPlan.cost,
        address: address
    };

    // 发送回 Python 机器人
    if (tg?.sendData) {
        tg.sendData(JSON.stringify(orderData));
        tg.close(); // 提交完自动关闭小程序面板
    } else {
        alert("【本地测试模式】订单数据已准备发送：\n\n" + JSON.stringify(orderData, null, 2));
    }
}

// ==========================================
// 4. 分享专属推广链接功能
// ==========================================
function shareReferral() {
    const userId = tg?.initDataUnsafe?.user?.id || 'demo_user';
    const botUsername = 'your_bot_username_here'; // 这里改成你的机器人真实ID
    const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    
    navigator.clipboard.writeText(refLink).then(() => {
        if (tg?.showAlert) tg.showAlert("🎁 您的专属邀请链接已复制！\n分享给好友，赚取 20% 佣金！\n\n" + refLink);
        else alert("🎁 您的专属邀请链接已复制！\n分享给好友，赚取 20% 佣金！\n\n" + refLink);
    });
}

// ==========================================
// 5. 实时动态播报跑马灯逻辑 (每 5 秒切换一次)
// ==========================================
function generateRandomAddress() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let addr = 'T';
    for(let i=0; i<3; i++) addr += chars.charAt(Math.floor(Math.random() * chars.length));
    addr += '***'; 
    for(let i=0; i<4; i++) addr += chars.charAt(Math.floor(Math.random() * chars.length));
    return addr;
}

const energyOptions = ['32,000', '64,000', '160,000', '320,000', '640,000'];

function updateLiveFeed() {
    const liveTextEl = document.getElementById('live-text');
    if(!liveTextEl) return;

    // 1. 旧文本向上滑动并淡出
    liveTextEl.style.opacity = '0';
    liveTextEl.style.transform = 'translateY(-15px)';

    // 2. 等待 0.5 秒动画结束后，更换文字并从下方滑入
    setTimeout(() => {
        const randomAddr = generateRandomAddress();
        const randomEnergy = energyOptions[Math.floor(Math.random() * energyOptions.length)];
        
        liveTextEl.innerHTML = `<span class="hl-addr">${randomAddr}</span> 刚刚成功租赁 <span class="hl-energy">${randomEnergy} 能量</span>`;
        
        liveTextEl.style.transition = 'none';
        liveTextEl.style.transform = 'translateY(15px)';
        void liveTextEl.offsetWidth; // 触发重绘

        liveTextEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        liveTextEl.style.opacity = '1';
        liveTextEl.style.transform = 'translateY(0)';
    }, 500); 
}

// 启动跑马灯定时器
setInterval(updateLiveFeed, 5000);