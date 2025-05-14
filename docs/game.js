// ===== 基本資料 =====
let timeLeft = 60;
let isTyping = false;
let hints = new Set();
let items = new Set();

// 每個熱區的狀態
let states = {
  window:    { viewed: 0 },
  poster:    { viewed: 0, hasRemoved: false },
  bookshelf: { viewed: 0, done: false },
  bed:       { hasHint: false, solved: false },
  locker:    { hasHint: false, solved: false },
  wardrobe:  { hasHint: false, solved: false }
};

// NPC 對話
const npcDialogs = [
  "姐姐你在找什麼?蛋蛋也想幫忙",
  "...基圍?蛋蛋好像在哪裡看到過",
  "希望爸媽快點回家",
  "蛋蛋記得1640!",
  "希望爸媽快點回家，蛋蛋餓了...",
  "姊姊好像很忙的樣子。",
  "蛋蛋想看山河令演唱會!"
];
let npcCount = 0, npcSeq = [], npcAltIdx = 0;

// 隨機抽三句
function initNpc() {
  const idx = npcDialogs.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [idx[i],idx[j]] = [idx[j],idx[i]];
  }
  npcSeq = idx.slice(0,3);
}

// ===== 更新提示 & 道具 =====
function addHint(text) {
  if (hints.has(text)) return;
  hints.add(text);
  const icons = {
    '床底下有小盒子':'icons/hint.png',
    '床底下小盒子的密碼為1640':'icons/hint.png',
    '南京一夜在衣櫥':'icons/hint.png',
    '白色西裝口袋內有小盒子':'icons/hint.png',
    '兩個人的生日':'icons/hint.png',
    '置物櫃內有盒子':'icons/hint.png',
    '海報可以使用除膠劑':'icons/hint.png'
  };
  const panel = document.getElementById('hint-panel');
  const slot  = document.createElement('div');
  slot.className = 'slot';
  slot.title = text;  // 鼠标悬停显示提示文字
  slot.innerHTML = `<img src="${icons[text]||'icons/default.png'}" alt="">`;
  panel.appendChild(slot);
}

function addItem(text) {
  if (items.has(text)) return;
  items.add(text);
  const icons = {
    '鑰匙':'icons/int.png',
    '基圍':'icons/int.png',
    '除膠劑':'icons/int.png'
  };
  const panel = document.getElementById('item-panel');
  const slot  = document.createElement('div');
  slot.className = 'slot';
  slot.title = text;
  slot.innerHTML = `<img src="${icons[text]||'icons/default-item.png'}" alt="">`;
  panel.appendChild(slot);
}

// ===== 打字機 & 點擊等待 =====
async function typeText(el, text, delay=40) {
  return new Promise(res=>{
    el.textContent = '';
    let i=0;
    const iv = setInterval(()=>{
      el.textContent += text[i]||'';
      i++;
      if(i>text.length){ clearInterval(iv); res(); }
    }, delay);
  });
}

async function waitForClick(){
  return new Promise(res=>{
    function handler(){ document.removeEventListener('click',handler); res(); }
    document.addEventListener('click',handler);
  });
}

// ===== 顯示文字 & 扣時 =====
async function showMessages(lines, cost=1) {
  if(isTyping) return;
  isTyping = true;
  const box = document.getElementById('message');
  box.innerHTML = '';
  for(const line of lines){
    await typeText(box, line);
    await waitForClick();
  }
  let actual = cost;
  if(cost===5) actual = Math.floor(Math.random()*6)+5;
  if(actual>0) changeTime(-actual);
  isTyping = false;
}

// ===== 是非題選擇 =====
async function showChoice(question){
  if(isTyping) return false;
  isTyping = true;
  const box = document.getElementById('message');
  box.innerHTML = '';
  await typeText(box, question);
  const yes = document.createElement('button'), no = document.createElement('button');
  yes.textContent='是'; no.textContent='否';
  yes.style.marginRight='10px';
  box.append(yes,no);
  return new Promise(res=>{
    yes.onclick=()=>{ isTyping=false; box.innerHTML=''; res(true); };
    no.onclick =()=>{ isTyping=false; box.innerHTML=''; res(false); };
  });
}

// ===== 时间 & 失败画面 =====
function changeTime(delta) {
  timeLeft = Math.max(0, timeLeft+delta);
  document.getElementById('time').textContent = `${timeLeft}`;
  if(timeLeft===0){
    const container = document.getElementById('game-container');
    container.innerHTML = '';
    const div = document.createElement('div');
    Object.assign(div.style,{
      display:'flex',flexDirection:'column',
      justifyContent:'center',alignItems:'center',
      width:'100%',height:'100%',
      backgroundColor:'rgba(0,0,0,0.9)',color:'#fff'
    });
    const p  = document.createElement('p');
    p.style.fontSize='36px';
    p.textContent="爸媽回來了!你被當場抓到....無法獲得基圍";
    const btn= document.createElement('button');
    btn.textContent='重新開始';
    Object.assign(btn.style,{marginTop:'20px',padding:'10px 20px',fontSize:'20px'});
    btn.onclick=()=>location.reload();
    div.append(p,btn);
    container.append(div);
  }
}

// ===== NPC 逻辑 =====
function handleNpc(){
  if(hints.has('南京一夜在衣櫥')) return { msgs:['...ZZZ.ZZ'], hint:null, cost:0 };
  if(npcCount===3)           return { msgs:['1640是床底下小盒子的密碼!'], hint:'床底下小盒子的密碼為1640', cost:0 };
  if(npcCount<3)            return { msgs:[npcDialogs[npcSeq[npcCount]]], hint:null, cost:1 };
  const alt=['1640是床底下小盒子的密碼!','姊姊沒找到嗎?就在床底下喔~'];
  return { msgs:[alt[npcAltIdx++%2]], hint:null, cost:0 };
}

// ===== 初始化 & 綁定熱區 =====
function init(){
  initNpc();
  const map = {
    npc: async () => { if (isTyping) return; const { msgs, hint, cost } = handleNpc(); await showMessages(msgs, cost); if (hint) addHint(hint); npcCount++; },
    window: async () => {
      if (isTyping) return;
      if (items.has('鑰匙') && items.has('基圍')) {
        const container = document.getElementById('game-container');
        container.innerHTML = '';
        const div = document.createElement('div');
        Object.assign(div.style, { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', color: '#fff' });
        const p = document.createElement('p'); p.style.fontSize = '36px'; p.textContent = '🎉 你成功逃脫並獲得了基圍 🎉';
        const btn = document.createElement('button'); btn.textContent = '重新開始'; Object.assign(btn.style, { marginTop: '20px', padding: '10px 20px', fontSize: '20px' }); btn.onclick = () => location.reload();
        div.append(p, btn); container.append(div);
        return;
      }
      if (!items.has('鑰匙') && !items.has('基圍')) {
        const arr = ['窗戶外面是漂亮的花園。', '如果打開窗戶就可以逃離房間...'];
        if (states.window.viewed < 2) { await showMessages([arr[states.window.viewed]], 1); states.window.viewed++; }
        else await showMessages(['已經搜索完畢了。'], 0);
      } else if (!items.has('鑰匙')) await showMessages(['我需要鑰匙才打開窗戶...'], 1);
      else if (!items.has('基圍')) await showMessages(['還沒找到基圍，我不能離開...'], 1);
    },
    poster: async () => { if (isTyping) return; if (items.has('除膠劑') && !states.poster.hasRemoved) { await showMessages(['你小心翼翼地將除膠劑點在海報接縫處，', '將海報掀開後，獲得了一把金色的鑰匙。'], 1); addItem('鑰匙'); states.poster.hasRemoved = true; } else if (!items.has('除膠劑') && states.poster.viewed < 2) { const opts = [['海報上是TF雙人照，你陷入了美好的回憶...', '回過神來發現已經過了5分鐘。'], ['海報上有一處不明顯的凸起，', '但海報黏的很緊，無法撕開。']]; await showMessages(opts[states.poster.viewed], states.poster.viewed++ === 0 ? 5 : 1); } else await showMessages(['已經搜索完畢了。'], 0); },
    bookshelf: async () => { if (isTyping) return; if (!states.bookshelf.done) { if (states.bookshelf.viewed === 0) { await showMessages(['獲得雙人PB，陷入回憶，扣5分鐘'], 5); states.bookshelf.viewed = 1; } else { await showMessages(['獲得紙條，上面寫著：海報可以使用除膠劑'], 1); addHint('海報可以使用除膠劑'); states.bookshelf.done = true; } } else await showMessages(['已經沒什麼好搜尋的了...'], 0); },
    bed: async () => {
      if (isTyping) return;
      // 床底 熱區
      if (!states.bed.hasHint) {
        // 初次搜索提示
        await showMessages([
          '床底下一塵不染，顯示著房間主人愛好整潔。',
          '床底下似乎空無一物，但直覺告訴你需要仔細搜索。',
          '你將頭探入床底並往上看，在床架底部找到了一個帶密碼鎖的小盒子。'
        ], 1);
        addHint('床底下有小盒子');
        states.bed.hasHint = true;
        return;
      }
      if (!states.bed.solved) {
        // 已獲提示，檢查是否有密碼提示
        if (!hints.has('床底下小盒子的密碼為1640')) {
          // 無密碼提示：出現選擇框
          const retry = await showChoice('我不知道密碼耶...要猜猜看嗎?');
          if (!retry) {
            await showMessages(['還是不要亂猜...'], 0);
            return;
          }
        }
        // 有密碼提示或選擇繼續後，直接輸入密碼
        const input = prompt('請輸入床底小盒子的密碼：');
        if (input === '1640') {
          await showMessages([
            '解開密碼後，你打開盒子',
            '看到裡面有一把扇子和紅色的手持風扇...',
            '你陷入回憶中，回過神來發現已經過了5分鐘。',
            '你仔細查看風扇',
            '後面貼著一張小紙條，',
            '寫著：南京一夜在衣櫥。'
          ], 5);
          addHint('南京一夜在衣櫥');
          states.bed.solved = true;
        } else {
          await showMessages(['猜錯密碼了，浪費了一點時間...'], 5);
        }
      } else {
        await showMessages(['已經搜索完畢了。'], 0);
      }
    },
        locker: async () => {
      if (isTyping) return;
      // 置物櫃 熱區
      if (!states.locker.hasHint) {
        // 初次搜索提示
        await showMessages([
          '找到兩雙襪子，繡著GJ❤ZZH，但此外沒有任何提示...',
          '找到一件老頭背心，但此外沒有任何提示...',
          '找到一個中型的盒子，需要密碼...'
        ], 1);
        addHint('置物櫃內有盒子');
        states.locker.hasHint = true;
        return;
      }
      if (!states.locker.solved) {
        // 已獲提示，檢查是否有密碼提示
        if (!hints.has('兩個人的生日')) {
          // 無密碼提示：出現選擇框
          const retry = await showChoice('我不知道密碼耶...要猜猜看嗎?');
          if (!retry) {
            await showMessages(['還是不要亂猜...'], 0);
            return;
          }
        }
        // 有密碼提示或選擇繼續後，直接輸入密碼
        const input = prompt('請輸入置物櫃密碼：');
        if (input === '51129') {
          await showMessages([
            '解開密碼後，居然拿到了基圍!',
            '你的手不停地顫抖，回過神來發現已經過了5分鐘。'
          ], 5);
          addItem('基圍');
          states.locker.solved = true;
        } else {
          await showMessages(['猜錯密碼了，浪費了一點時間...'], 5);
        }
      } else {
        await showMessages(['已經搜索完畢了。'], 0);
      }
    },
        wardrobe: async () => {
      if (isTyping) return;
      // 衣櫥 熱區
      if (!states.wardrobe.hasHint) {
        // 初次搜索提示
        await showMessages([
          '衣櫥裡掛著滿滿的衣服。',
          '衣櫥深處似乎有人蹲過的痕跡。',
          '你在衣櫥內的口袋裡發現了一個小盒子。'
        ], 1);
        addHint('白色西裝口袋內有小盒子');
        states.wardrobe.hasHint = true;
        return;
      }
      if (!states.wardrobe.solved) {
        // 已獲提示，檢查是否有密碼提示
        if (!hints.has('南京一夜在衣櫥')) {
          // 無密碼提示：出現選擇框
          const retry = await showChoice('我不知道密碼耶...要猜猜看嗎?');
          if (!retry) {
            await showMessages(['還是不要亂猜...'], 0);
            return;
          }
        }
        // 有密碼提示或選擇繼續後，直接輸入密碼
        const input = prompt('請輸入衣櫥密碼：');
        if (input === '1031') {
          await showMessages([
            '解開密碼後，獲得了除膠劑，',
            '盒子內有一張紙條：兩個人的生日'
          ], 5);
          addItem('除膠劑');
          addHint('兩個人的生日');
          states.wardrobe.solved = true;
        } else {
          await showMessages(['猜錯密碼了，浪費了一點時間...'], 5);
        }
      } else {
        await showMessages(['已經搜索完畢了。'], 0);
      }
    }
  };
  for(const id in map){
    document.getElementById(id).addEventListener('click', map[id]);
  }
}

document.addEventListener('DOMContentLoaded', init);
