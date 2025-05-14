// ===== 全局狀態 =====
let timeLeft = 60;
let isTyping = false;
const hints = new Set();
const items = new Set();

// 每個熱區狀態
const states = {
  window:    { viewed: 0, done: false },
  poster:    { viewed: 0, removed: false, done: false },
  bookshelf: { viewed: 0, done: false },
  bed: { hint: false, solved: false, count: 0 },
  locker:    { hint: false, solved: false },
  wardrobe:  { hint: false, solved: false },
  npc:       { count: 0, seq: [], altIdx: 0 }
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

// 打字機效果
async function typeText(el, text, delay = 40) {
  return new Promise(res => {
    el.textContent = "";
    let i = 0;
    const iv = setInterval(() => {
      el.textContent += text[i] || "";
      i++;
      if (i > text.length) {
        clearInterval(iv);
        res();
      }
    }, delay);
  });
}

// 等待下一次點擊
async function waitForClick() {
  return new Promise(res => {
    function handler() {
      document.removeEventListener("click", handler);
      res();
    }
    document.addEventListener("click", handler);
  });
}

// 顯示訊息並扣時間
async function showMessages(lines, cost = 1) {
  if (isTyping) return;
  isTyping = true;
  const box = document.getElementById("message");
  box.innerHTML = "";
  for (const line of lines) {
    await typeText(box, line);
    await waitForClick();
  }
  let actual = cost;
  if (cost === 5) actual = Math.floor(Math.random() * 6) + 5;
  if (actual > 0) changeTime(-actual);
  isTyping = false;
}

// 是非選擇
async function showChoice(question) {
  if (isTyping) return false;
  isTyping = true;
  const box = document.getElementById("message");
  box.innerHTML = "";
  await typeText(box, question);
  const yes = document.createElement("button");
  const no  = document.createElement("button");
  yes.textContent = "是"; no.textContent = "否";
  yes.style.marginRight = "10px";
  box.append(yes, no);
  return new Promise(res => {
    yes.onclick = () => { isTyping = false; box.innerHTML = ""; res(true); };
    no.onclick  = () => { isTyping = false; box.innerHTML = ""; res(false); };
  });
}

// 時間更新與失敗畫面
function changeTime(delta) {
  timeLeft = Math.max(0, timeLeft + delta);
  document.getElementById("time").textContent = timeLeft;
  if (timeLeft === 0) {
    const lp = document.querySelector(".left-panel");
    lp.innerHTML = "";
    const div = document.createElement("div");
    Object.assign(div.style, {
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      width: "100%", height: "100vh",
      background: "#000", color: "#fff"
    });
    const p = document.createElement("p");
    p.style.fontSize = "28px";
    p.textContent = "爸媽回來了!你被當場抓到....無法獲得基圍";
    const btn = document.createElement("button");
    btn.textContent = "重新開始";
    Object.assign(btn.style, {
      marginTop: "20px", padding: "10px 20px", fontSize: "20px"
    });
    btn.onclick = () => location.reload();
    div.append(p, btn);
    lp.append(div);
  }
}

// 新增提示/道具
function addHintItem(text, isItem = false) {
  if ((isItem && items.has(text)) || (!isItem && hints.has(text))) return;
  if (isItem) items.add(text); else hints.add(text);
  const bar = document.getElementById("hint-item-bar");
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.textContent = text;
  slot.onclick = () => alert(text);
  bar.appendChild(slot);
}

// NPC 對話邏輯
function handleNpc() {
  const s = states.npc;
  if (s.count === 3) {
    s.count++;
    addHintItem("床底下小盒子的密碼為1640", false);
    return { lines: ["1640是床底下小盒子的密碼!"], cost: 0 };
  }
  if (s.count > 3) {
    const alt = [
      "1640是床底下小盒子的密碼!",
      "姊姊沒找到嗎?就在床底下喔~"
    ];
    const line = alt[s.altIdx++ % alt.length];
    return { lines: [line], cost: 0 };
  }
  if (s.seq.length === 0) {
    const idx = npcDialogs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    s.seq = idx.slice(0, 3);
  }
  const line = npcDialogs[s.seq[s.count % 3]];
  s.count++;
  return { lines: [line], cost: 1 };
}

// 橫向滾動
function scrollGame(dir) {
  const wrap = document.querySelector(".game-area-wrapper");
  wrap.scrollBy({ left: dir * 200, behavior: "smooth" });
}

// 各熱區事件處理
const handlers = {
  window: async () => {
    if (!states.window.done) {
      if (!items.has("鑰匙") && !items.has("基圍")) {
        const arr = [
          "窗戶外面是漂亮的花園。",
          "如果打開窗戶就可以逃離房間..."
        ];
        await showMessages([arr[states.window.viewed++] ], 1);
        if (states.window.viewed >= 2) states.window.done = true;
      } else if (!items.has("鑰匙")) {
        await showMessages(["我需要鑰匙才打開窗戶..."], 1);
      } else if (!items.has("基圍")) {
        await showMessages(["還沒找到基圍，我不能離開..."], 1);
      } else {
        // 成功逃脫
        const lp = document.querySelector(".left-panel");
        lp.innerHTML = "";
        const div = document.createElement("div");
        Object.assign(div.style, {
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          width: "100%", height: "100vh",
          background: "#000", color: "#fff"
        });
        const p = document.createElement("p");
        p.style.fontSize = "36px";
        p.textContent = "🎉 你成功逃脫並獲得了基圍 🎉";
        const btn = document.createElement("button");
        btn.textContent = "重新開始";
        Object.assign(btn.style, {
          marginTop: "20px", padding: "10px 20px", fontSize: "20px"
        });
        btn.onclick = () => location.reload();
        div.append(p, btn);
        lp.append(div);
      }
    }
  },

  npc: async () => {
    const { lines, cost } = handleNpc();
    await showMessages(lines, cost);
  },

  poster: async () => {
    if (!states.poster.done) {
      if (!items.has("除膠劑")) {
        if (!states.poster.removed) {
          const rand = Math.random() < 0.5;
          if (rand) {
            await showMessages([
              "海報上是TF雙人照，你陷入了美好的回憶...",
              "回過神來發現已經過了5分鐘。"
            ], 5);
            addHintItem("海報可以使用除膠劑", false);
          } else {
            await showMessages([
              "海報上有一處不明顯的凸起，",
              "但海報黏的很緊，無法撕開。"
            ], 1);
          }
          states.poster.removed = true;
        } else {
          await showMessages(["已經搜索完畢了。"], 0);
        }
      } else {
        await showMessages([
          "你小心翼翼地將除膠劑點在海報接縫處，",
          "將海報掀開後，獲得了一把金色的鑰匙。"
        ], 1);
        addHintItem("鑰匙", true);
        states.poster.done = true;
      }
    }
  },

  bookshelf: async () => {
    if (!states.bookshelf.done) {
      await showMessages([
        "獲得雙人PB，陷入回憶。",
        "獲得紙條，上面寫著：海報可以使用除膠劑"
      ], 5);
      addHintItem("雙人PB", false);
      addHintItem("海報可以使用除膠劑", false);
      states.bookshelf.done = true;
    } else {
      await showMessages(["已經沒什麼好搜尋的了..."], 0);
    }
  },

 bed: async () => {
    if (isTyping) return;

    // 尚未觸發提示階段，依序三次顯示三句
    if (!states.bed.hint) {
      const lines = [
        "床底下一塵不染，顯示著房間主人愛好整潔。",
        "床底下似乎空無一物，但直覺告訴你需要仔細搜索。",
        "你將頭探入床底並往上看，在床架底部找到了一個帶密碼鎖的小盒子。"
      ];
      await showMessages([ lines[ states.bed.count ] ], 1);
      states.bed.count++;
      if (states.bed.count >= lines.length) {
        addHintItem("床底下有小盒子", false);
        states.bed.hint = true;
      }
      return;
    }

    // 已經看到提示，但還沒解鎖
    if (!states.bed.solved) {
      if (!hints.has("床底下小盒子的密碼為1640")) {
        const retry = await showChoice("我不知道密碼耶...要猜猜看嗎?");
        if (!retry) {
          await showMessages(["還是不要亂猜..."], 0);
          return;
        }
      }
      const input = prompt("請輸入床底小盒子的密碼：");
      if (input === "1640") {
        await showMessages([
          "解開密碼後，你打開盒子",
          "看到裡面有一把扇子和紅色的手持風扇...",
          "你陷入回憶中，回過神來發現已經過了5分鐘。",
          "你仔細查看風扇",
          "後面貼著一張小紙條，",
          "寫著：南京一夜在衣櫥。"
        ], 5);
        addHintItem("南京一夜在衣櫥", false);
        states.bed.solved = true;
      } else {
        await showMessages(["猜錯密碼了，浪費了一點時間..."], 5);
      }
      return;
    }

    // 全部完成後顯示搜尋完畢
    await showMessages(["已經搜索完畢了。"], 0);
  },  // ← 这行逗号是必要的，后面紧接下一个键值对

  locker: async () => {
    if (!states.locker.hint) {
      await showMessages([
        "找到兩雙襪子，繡著GJ❤ZZH，但此外沒有任何提示...",
        "找到一件老頭背心，但此外沒有任何提示...",
        "找到一個中型的盒子，需要密碼..."
      ], 1);
      addHintItem("置物櫃內有盒子", false);
      states.locker.hint = true;
    } else if (!states.locker.solved) {
      if (!hints.has("兩個人的生日總和")) {
        const retry = await showChoice("我不知道密碼耶...要猜猜看嗎?");
        if (!retry) {
          await showMessages(["還是不要亂猜..."], 0);
          return;
        }
      }
      const input = prompt("請輸入置物櫃密碼：");
      if (input === "51129") {
        await showMessages([
          "解開密碼後，居然拿到了基圍!",
          "你的手不停地顫抖，回過神來發現已經過了5分鐘。"
        ], 5);
        addHintItem("基圍", true);
        states.locker.solved = true;
      } else {
        await showMessages(["猜錯密碼了，浪費了一點時間..."], 5);
      }
    }
  },

  wardrobe: async () => {
    if (!states.wardrobe.hint) {
      await showMessages([
        "衣櫥裡掛著滿滿的衣服。",
        "衣櫥深處似乎有人蹲過的痕跡。",
        "你在衣櫥內的口袋裡發現了一個小盒子。"
      ], 1);
      addHintItem("白色西裝口袋內有小盒子", false);
      states.wardrobe.hint = true;
    } else if (!states.wardrobe.solved) {
      if (!hints.has("南京一夜在衣櫥")) {
        const retry = await showChoice("我不知道密碼耶...要猜猜看嗎?");
        if (!retry) {
          await showMessages(["還是不要亂猜..."], 0);
          return;
        }
      }
      const input = prompt("請輸入衣櫥密碼：");
      if (input === "1031") {
        await showMessages([
          "解開密碼後，獲得了除膠劑，",
          "盒子內有一張紙條：兩個人的生日總和"
        ], 5);
        addHintItem("除膠劑", true);
        addHintItem("兩個人的生日總和", false);
        states.wardrobe.solved = true;
      } else {
        await showMessages(["猜錯密碼了，浪費了一點時間..."], 5);
      }
    }
  }
};

// ===== 初始化 =====
async function init() {
  // 綁定熱區
  for (const id in handlers) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", handlers[id]);
  }
  // 開場劇情
  await showMessages([
    "今天是個好天氣",
    "爸媽出門去喝咖啡",
    "我打算趁他們不在",
    "帶著蛋蛋一起來找基圍~"
  ], 0);
}

document.addEventListener("DOMContentLoaded", init);
