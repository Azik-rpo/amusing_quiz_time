let playerName = "";
let score = 0;
let currentQuestion = 0;
let maxTime = 30;
let time = 30;
let timerInterval;
let selectedAnswer = null;
let isAnswered = false;
let isGameActive = false;
let currentRoom = null;
let socket = null;
let introAutoHideTimeout = null;
let questionQueue = [];
let recentQuestionHistory = [];
const MIN_QUIZ_QUESTIONS = 20;
const MAX_QUIZ_QUESTIONS = 40;
const BACKEND_URL = 'https://backend-in5k.onrender.com';

const shopItems = [
  { id: 'head-1', category: 'head', name: 'Неоновая бейсболка', price: 200, description: 'Яркий кибер-стиль для головы.' },
  { id: 'head-2', category: 'head', name: 'Хай-тек шлем', price: 200, description: 'Защита и стиль в одном.' },
  { id: 'head-3', category: 'head', name: 'Виртуальная корона', price: 300, description: 'Царь цифрового мира.' },
  { id: 'head-4', category: 'head', name: 'Голографический обод', price: 300, description: 'Футуристический аксессуар.' },
  { id: 'head-5', category: 'head', name: 'Ретро-очки', price: 400, description: 'Для любителей киберпанка.' },
  { id: 'head-6', category: 'head', name: 'Сетчатый капюшон', price: 400, description: 'Мистический ночной образ.' },
  { id: 'torso-1', category: 'torso', name: 'Кибер-жилет', price: 200, description: 'Лёгкий бронежилет для цифрового героя.' },
  { id: 'torso-2', category: 'torso', name: 'Неоновая куртка', price: 200, description: 'Яркий верх для аркадного сеттинга.' },
  { id: 'torso-3', category: 'torso', name: 'Пуленепробиваемая рубашка', price: 300, description: 'Стиль и защита в одном.' },
  { id: 'torso-4', category: 'torso', name: 'Голографический плащ', price: 300, description: 'Плащ из светящихся линий.' },
  { id: 'torso-5', category: 'torso', name: 'Киберпанк жилет', price: 400, description: 'Максимум крутости для персонажа.' },
  { id: 'torso-6', category: 'torso', name: 'Термокуртка', price: 400, description: 'Тепло и технологично.' },
  { id: 'legs-1', category: 'legs', name: 'Неоновые штаны', price: 200, description: 'Подчёркнутый ход для геймеров.' },
  { id: 'legs-2', category: 'legs', name: 'Штаны с линиями', price: 200, description: 'Светящаяся дорожка по ногам.' },
  { id: 'legs-3', category: 'legs', name: 'Тактические леггинсы', price: 300, description: 'Удобство для любой миссии.' },
  { id: 'legs-4', category: 'legs', name: 'Холодные брюки', price: 300, description: 'Стильный защитный низ.' },
  { id: 'legs-5', category: 'legs', name: 'Кибер-ботинки', price: 400, description: 'Мощный шаг в цифровой реальности.' },
  { id: 'legs-6', category: 'legs', name: 'Легкие штаны-панели', price: 400, description: 'Футуристический походный стиль.' }
];

// Initialize socket connection
function initSocket() {
  const serverUrl = 'https://backend-in5k.onrender.com';
  
  socket = io(serverUrl, { reconnection: true });
  
  socket.on('connect', () => console.log('Connected to server'));
  socket.on('room-joined', (data) => {
    console.log('Room joined:', data);
    showCharacter('Подключено к комнате! 🎯');
  });
  socket.on('player-joined', (data) => {
    console.log('Player joined:', data.playerName);
  });
  socket.on('game-started', () => {
    showCharacter('Игра началась! 🚀');
  });
  socket.on('player-finished', (data) => {
    console.log(`${data.playerName} завершил игру с ${data.score} очков`);
  });
  socket.on('disconnect', () => console.log('Disconnected from server'));
}

// Settings & Audio defaults
// Local file paths - place the audio files in the project root or adjust paths accordingly
const MUSIC_TRACKS = ['./ariamath.mp3', './genesis.mp3'];
let settings = { musicEnabled: true, trackIndex: 0, showCharacter: true };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('aqt_settings') || 'null');
    if (s) settings = Object.assign(settings, s);
  } catch (e) { console.warn('Failed to load settings', e); }
}

function saveSettings() {
  try { localStorage.setItem('aqt_settings', JSON.stringify(settings)); } catch(e){}
}

// Audio initialization
function initAudio() {
  const bg = document.getElementById('bgMusic');
  if (!bg) return;
  bg.src = MUSIC_TRACKS[settings.trackIndex];
  bg.loop = true;
  bg.volume = 0.45;
  if (settings.musicEnabled) {
    bg.play().catch(()=>{ console.log('Autoplay prevented'); showEnableSoundPrompt(); });
  }
  updateMusicUI();
}

function showEnableSoundPrompt() {
  const el = document.getElementById('enableSoundPrompt'); if (!el) return;
  el.classList.remove('hidden');
}

function hideEnableSoundPrompt() { const el = document.getElementById('enableSoundPrompt'); if (!el) return; el.classList.add('hidden'); }

function enableSound() {
  settings.musicEnabled = true; saveSettings();
  const bg = document.getElementById('bgMusic'); if (!bg) return;
  bg.play().then(()=>{
    hideEnableSoundPrompt(); updateMusicUI();
  }).catch(e=>{
    console.warn('Enable sound failed', e);
  });
}

function playBackground() {
  const bg = document.getElementById('bgMusic'); if (!bg) return;
  bg.play().catch(()=>{});
}

function pauseBackground() {
  const bg = document.getElementById('bgMusic'); if (!bg) return;
  bg.pause();
}

function toggleMusic() {
  settings.musicEnabled = !settings.musicEnabled;
  saveSettings();
  if (settings.musicEnabled) playBackground(); else pauseBackground();
  updateMusicUI();
}

function switchMusicTrack() {
  settings.trackIndex = (settings.trackIndex + 1) % MUSIC_TRACKS.length;
  saveSettings();
  const bg = document.getElementById('bgMusic'); if (!bg) return;
  bg.src = MUSIC_TRACKS[settings.trackIndex];
  if (settings.musicEnabled) { bg.play().catch(()=>{}); }
  updateMusicUI();
}

function updateMusicUI() {
  const lbl = document.getElementById('currentTrackLabel'); if (lbl) lbl.innerText = (MUSIC_TRACKS[settings.trackIndex] || '').split('/').pop();
  const mBtn = document.getElementById('musicToggleBtn'); if (mBtn) mBtn.innerText = settings.musicEnabled ? 'Выключить' : 'Включить';
  const cBtn = document.getElementById('charToggleBtn'); if (cBtn) cBtn.innerText = settings.showCharacter ? 'Скрыть' : 'Показать';
  const charBox = document.getElementById('characterBox'); if (charBox) charBox.style.display = settings.showCharacter ? 'flex' : 'none';
}

function toggleCharacter() {
  settings.showCharacter = !settings.showCharacter;
  saveSettings();
  updateMusicUI();
}

function openSettings() { document.getElementById('settingsModal').style.display = 'flex'; updateMusicUI(); }
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

// Particles background
function initParticles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth; let h = canvas.height = window.innerHeight;
  const particles = [];
  for (let i=0;i<80;i++) particles.push({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.6, r: Math.random()*2+0.6, hue: 180 + Math.random()*140 });
  function resize(){ w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  function draw(){
    ctx.clearRect(0,0,w,h);
    // animated gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, 'rgba(2,6,20,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    particles.forEach(p=>{
      p.x += p.vx; p.y += p.vy;
      if (p.x<0) p.x=w; if (p.x>w) p.x=0; if (p.y<0) p.y=h; if (p.y>h) p.y=0;
      ctx.beginPath(); ctx.fillStyle = `hsla(${p.hue},100%,60%,0.9)`; ctx.shadowBlur = 12; ctx.shadowColor = `hsla(${p.hue},100%,60%,0.9)`; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function initApp() {
  loadSettings();
  initSocket();
  initAudio();
  initParticles();
  handleHashImport();
  renderLobby();
  updateSupportButtonVisibility();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', initApp);
}

function next(id) {
  const current = document.querySelector('.screen.active');
  const target = document.getElementById(id);
  if (!target || current === target) return;

  const showTarget = () => {
    target.classList.add('active', 'screen-enter');
    target.addEventListener('animationend', function onOpen() {
      target.classList.remove('screen-enter');
      target.removeEventListener('animationend', onOpen);
    }, { once: true });
  };

  if (current) {
    current.classList.add('screen-exit');
    current.addEventListener('animationend', function onClose() {
      current.classList.remove('active', 'screen-exit');
      current.removeEventListener('animationend', onClose);
      showTarget();
    }, { once: true });
  } else {
    showTarget();
  }
}

function punishPlayer() {
  const blockTime = Date.now() + 2 * 60 * 1000;
  localStorage.setItem('blockedUntil', blockTime);
  alert('🚫 Ты вышел из игры! Подожди 2 минуты!');
  next('loginScreen');
  isGameActive = false;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isGameActive && document.getElementById('game').classList.contains('active')) {
    punishPlayer();
  }
});

function checkBlock() {
  const blockedUntil = Number(localStorage.getItem('blockedUntil'));
  if (blockedUntil && Date.now() < blockedUntil) {
    const seconds = Math.ceil((blockedUntil - Date.now()) / 1000);
    alert('⏳ Подожди ' + seconds + ' секунд перед входом!');
    return false;
  }
  return true;
}

function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function getCurrentUser() {
  const users = getUsers();
  if (!playerName) return null;
  const user = users[playerName];
  if (!user) return null;
  let shouldSave = false;
  if (typeof user.coins !== 'number') { user.coins = 0; shouldSave = true; }
  if (!user.wardrobe) { user.wardrobe = { head: [], torso: [], legs: [] }; shouldSave = true; }
  if (!user.equipped) { user.equipped = { head: null, torso: null, legs: null }; shouldSave = true; }
  if (shouldSave) saveCurrentUser(user);
  return user;
}

function saveCurrentUser(user) {
  if (!playerName || !user) return;
  const users = getUsers();
  users[playerName] = user;
  users[playerName].lastLogin = Date.now();
  saveUsers(users);
}

function updateSupportButtonVisibility() {
  const button = document.querySelector('.support-button');
  if (!button) return;
  button.classList.toggle('visible', !!playerName);
}

function openSupportModal() {
  const modal = document.getElementById('supportModal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.getElementById('supportStatus').innerText = '';
  document.getElementById('supportForm').classList.add('hidden');
  document.getElementById('selectedSupportCategory').innerText = '';
  document.getElementById('supportMessage').value = '';
  document.getElementById('supportSendBtn').disabled = true;
}

function closeSupportModal() {
  const modal = document.getElementById('supportModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 220);
}

function selectSupportCategory(category) {
  const form = document.getElementById('supportForm');
  const label = document.getElementById('selectedSupportCategory');
  const sendBtn = document.getElementById('supportSendBtn');
  if (!form || !label || !sendBtn) return;
  form.classList.remove('hidden');
  label.innerText = category;
  sendBtn.disabled = false;
}

function sendSupportRequest() {
  const category = document.getElementById('selectedSupportCategory')?.innerText;
  const message = document.getElementById('supportMessage')?.value.trim();
  const status = document.getElementById('supportStatus');
  if (!category || !message || !status) return;
  if (!playerName) {
    status.innerText = 'Сначала войдите в аккаунт.';
    return;
  }
  status.innerText = 'Отправка...';
  fetch(`${getServerUrl()}/api/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: playerName, category, message })
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (data?.status === 'sent') {
        status.innerText = 'Сообщение успешно отправлено';
        document.getElementById('supportMessage').value = '';
        document.getElementById('selectedSupportCategory').innerText = '';
        document.getElementById('supportForm').classList.add('hidden');
        document.getElementById('supportSendBtn').disabled = true;
      } else {
        throw new Error('Failed to send');
      }
    })
    .catch(() => {
      status.innerText = 'Ошибка отправки сообщения';
    });
}

function openShop() {
  const modal = document.getElementById('shopModal');
  if (!modal) return;
  modal.style.display = 'flex';
  selectShopCategory('head');
  renderShop();
}

function closeShop() {
  const modal = document.getElementById('shopModal');
  if (modal) modal.style.display = 'none';
}

function selectShopCategory(category) {
  const tabs = document.querySelectorAll('.shop-tab');
  tabs.forEach(tab => tab.classList.toggle('active', tab.id === `shopTab-${category}`));
  renderShopItems(category);
}

function renderShop() {
  const user = getCurrentUser();
  if (!user) return;
  const coinsEl = document.getElementById('shopCoins');
  const equippedEl = document.getElementById('shopEquipped');
  if (coinsEl) coinsEl.innerText = `${user.coins || 0}`;
  if (equippedEl) equippedEl.innerText = `${user.equipped.head || '—'} / ${user.equipped.torso || '—'} / ${user.equipped.legs || '—'}`;
  renderShopItems('head');
}

function renderShopItems(category) {
  const container = document.getElementById('shopItems');
  const user = getCurrentUser();
  if (!container || !user) return;
  const items = shopItems.filter(item => item.category === category);
  container.innerHTML = items.map(item => {
    const owned = user.wardrobe[item.category].includes(item.id);
    const equipped = user.equipped[item.category] === item.id;
    const actionText = owned ? (equipped ? 'Надето' : 'Надеть') : `Купить ${item.price} coins`;
    const disabled = !owned && user.coins < item.price;
    return `
      <div class="shop-card">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="item-price">${item.price} coins</div>
        <button onclick="${owned ? `equipShopItem('${item.id}')` : `buyShopItem('${item.id}')`}" ${owned && equipped ? 'disabled' : ''} ${disabled ? 'disabled' : ''}>${actionText}</button>
      </div>
    `;
  }).join('');
}

function buyShopItem(itemId) {
  const user = getCurrentUser();
  if (!user) return;
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;
  if (user.coins < item.price) {
    alert('Недостаточно монет');
    return;
  }
  user.coins -= item.price;
  if (!user.wardrobe[item.category].includes(item.id)) {
    user.wardrobe[item.category].push(item.id);
  }
  saveCurrentUser(user);
  renderLobby();
  renderShop();
  showCharacter(`Куплено: ${item.name}`);
}

function equipShopItem(itemId) {
  const user = getCurrentUser();
  if (!user) return;
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;
  user.equipped[item.category] = itemId;
  saveCurrentUser(user);
  renderLobby();
  renderShop();
  showCharacter(`Экипировано: ${item.name}`);
}

function cleanOldUsers(users) {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  Object.keys(users).forEach(name => {
    if (now - users[name].lastLogin > thirtyDays) {
      delete users[name];
    }
  });
  return users;
}

function login() {
  if (!checkBlock()) return;

  const name = document.getElementById('nameInput').value.trim();
  const pass = document.getElementById('passwordInput').value.trim();
  if (!name || !pass) {
    alert('Заполни все поля!');
    return;
  }

  const users = cleanOldUsers(getUsers());
  if (users[name]) {
    if (users[name].password !== pass) {
      alert('❌ Неверный пароль');
      return;
    }
    users[name].coins = users[name].coins || 0;
    users[name].wardrobe = users[name].wardrobe || { head: [], torso: [], legs: [] };
    users[name].equipped = users[name].equipped || { head: null, torso: null, legs: null };
    alert('С возвращением!');
  } else {
    users[name] = {
      password: pass,
      lastLogin: Date.now(),
      coins: 500,
      wardrobe: { head: [], torso: [], legs: [] },
      equipped: { head: null, torso: null, legs: null }
    };
    alert('Аккаунт создан!');
    showCharacter('Если не заходить 30 дней, аккаунт будет удалён.');
  }

  users[name].lastLogin = Date.now();
  saveUsers(users);
  playerName = name;
  document.getElementById('welcome').innerText = 'Привет, ' + name;
  updateSupportButtonVisibility();
  next('lobbyScreen');
  renderLobby();
  showCharacter('Добро пожаловать в лобби 🎮');
}

// --- Lobby & Custom Quiz System ---
function renderLobby() {
  const record = JSON.parse(localStorage.getItem('record') || 'null');
  document.getElementById('recordsDisplay').innerText = record ? `🏆 ${record.name} — ${record.score}` : 'Нет рекордов';
  const recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
  const recentEl = document.getElementById('recentGames');
  if (recentEl) {
    if (recent.length) {
      recentEl.innerHTML = recent.map(r => {
        const item = typeof r === 'string' ? parseLegacyRecent(r) : r;
        return `<div class="recent-item"><span>${item.name || 'Игрок'} — ${item.score} очков</span><span>${formatRelativeTime(item.timestamp || Date.now())}</span></div>`;
      }).join('');
    } else {
      recentEl.innerText = 'Пусто';
    }
  }
  renderCustomQuizzes();
  const user = getCurrentUser();
  const coinDisplay = document.getElementById('accountCoins');
  const equipDisplay = document.getElementById('equippedItems');
  const shopCoinDisplay = document.getElementById('shopCoins');
  const shopEquippedDisplay = document.getElementById('shopEquipped');
  if (user) {
    if (coinDisplay) coinDisplay.innerText = `Coins: ${user.coins || 0}`;
    if (equipDisplay) {
      const parts = ['head', 'torso', 'legs'].map(part => user.equipped?.[part] || '—');
      equipDisplay.innerText = `Экипировка: ${parts.join(' / ')}`;
    }
    if (shopCoinDisplay) shopCoinDisplay.innerText = `${user.coins || 0}`;
    if (shopEquippedDisplay) shopEquippedDisplay.innerText = `${user.equipped?.head || '—'} / ${user.equipped?.torso || '—'} / ${user.equipped?.legs || '—'}`;
  }
}

function openQuizCreator() {
  document.getElementById('quizTitle').value = '';
  document.getElementById('questionBuilder').innerHTML = '';
  document.getElementById('creatorErrors').innerText = '';
  for (let i=0;i<3;i++) addQuestionBuilder();
  updateQCount();
  document.getElementById('quizCreator').style.display = 'flex';
}

function closeQuizCreator() {
  document.getElementById('quizCreator').style.display = 'none';
}

function addQuestionBuilder(prefill) {
  const container = document.getElementById('questionBuilder');
  const currentCount = container.querySelectorAll('.qb-item').length;
  if (currentCount >= MAX_QUIZ_QUESTIONS) {
    const errors = document.getElementById('creatorErrors');
    if (errors) errors.innerText = `Максимум ${MAX_QUIZ_QUESTIONS} вопросов`; 
    return;
  }
  const idx = currentCount;
  const div = document.createElement('div');
  div.className = 'qb-item';
  div.draggable = true;
  div.innerHTML = `
    <div class="qb-header">
      <span class="qb-drag">☰</span>
      <span class="qb-num">Вопрос ${idx+1}</span>
      <button class="remove-q" onclick="this.parentNode.parentNode.remove(); updateQCount()">✕</button>
    </div>
    <label>Q: <input class="qb-q" placeholder="Текст вопроса"></label>
    <div class="qb-answers">
      <label><input type="radio" name="correct-${idx}" checked> <input class="qb-a" placeholder="Ответ 1"></label>
      <label><input type="radio" name="correct-${idx}"> <input class="qb-a" placeholder="Ответ 2"></label>
      <label><input type="radio" name="correct-${idx}"> <input class="qb-a" placeholder="(опционально) Ответ 3"></label>
      <label><input type="radio" name="correct-${idx}"> <input class="qb-a" placeholder="(опционально) Ответ 4"></label>
    </div>
  `;
  
  // drag-n-drop для переупорядочивания
  div.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('sourceId', div.id); e.dataTransfer.effectAllowed='move'; });
  div.addEventListener('dragover', (e)=>{ e.preventDefault(); div.style.opacity='0.5'; });
  div.addEventListener('dragleave', ()=>{ div.style.opacity='1'; });
  div.addEventListener('drop', (e)=>{ 
    e.preventDefault(); 
    const sourceId = e.dataTransfer.getData('sourceId');
    const items = Array.from(container.querySelectorAll('.qb-item'));
    const from = items.findIndex(x=>x.id === sourceId);
    const to = items.indexOf(div);
    if (from !== to && from>=0) {
      const dragged = items[from];
      if (from < to) container.insertBefore(dragged, div.nextSibling);
      else container.insertBefore(dragged, div);
      updateQCount();
    }
    div.style.opacity='1';
  });
  div.id = `qb_item_${Date.now()}`;
  
  if (prefill) {
    div.querySelector('.qb-q').value = prefill.q || '';
    const as = div.querySelectorAll('.qb-a');
    (prefill.answers||[]).forEach((a,i)=>{ if(as[i]) as[i].value = a; });
    if (typeof prefill.correct === 'number') {
      const radios = div.querySelectorAll('input[type=radio]');
      if (radios[prefill.correct]) radios[prefill.correct].checked = true;
    }
  }
  container.appendChild(div);
  updateQCount();
}

function updateQCount() {
  const items = Array.from(document.querySelectorAll('.qb-item'));
  const count = items.length;
  document.getElementById('qCount').innerText = count;
  const addBtn = document.getElementById('addQuestionBtn');
  if (addBtn) {
    addBtn.disabled = count >= MAX_QUIZ_QUESTIONS;
    addBtn.style.opacity = count >= MAX_QUIZ_QUESTIONS ? '0.55' : '1';
    addBtn.innerText = count >= MAX_QUIZ_QUESTIONS ? 'Максимум достигнут' : '+ Добавить вопрос';
  }
  items.forEach((item, index) => {
    const label = item.querySelector('.qb-num');
    if (label) label.innerText = `Вопрос ${index + 1}`;
    const radios = item.querySelectorAll('input[type=radio]');
    radios.forEach((radio) => {
      const name = radio.name.split('-')[0] + '-' + index;
      radio.name = name;
    });
  });
}

function loadTemplate() {
  const template = document.getElementById('templateSelect').value;
  document.getElementById('questionBuilder').innerHTML = '';
  let data = [];
  if (template === 'tech') {
    data = [
      { q: 'Что такое алгоритм?', answers: ['Последовательность действий', 'Переменная', 'Цикл'], correct: 0 },
      { q: 'Что такое переменная?', answers: ['Область памяти', 'Цикл', 'Функция'], correct: 0 },
      { q: 'Что такое функция?', answers: ['Блок кода', 'Переменная', 'Ошибка'], correct: 0 },
      { q: 'Что такое рекурсия?', answers: ['Функция вызывает себя', 'Цикл', 'Тип'], correct: 0 },
      { q: 'Что такое массив?', answers: ['Линейная структура', 'Функция', 'Класс'], correct: 0 },
      { q: 'Что такое цикл?', answers: ['Повторение кода', 'Тип данных', 'Функция'], correct: 0 },
      { q: 'ООП?', answers: ['Парадигма объектов', 'Язык', 'Тип'], correct: 0 },
      { q: 'SQL?', answers: ['Язык БД', 'Разметка', 'Фреймворк'], correct: 0 },
      { q: 'HTTP?', answers: ['Протокол', 'Язык', 'База'], correct: 0 },
      { q: 'API?', answers: ['Интерфейс', 'Функция', 'Переменная'], correct: 0 },
      { q: 'Git?', answers: ['Система контроля версий', 'Язык', '框架'], correct: 0 },
      { q: 'HTML?', answers: ['Язык разметки', 'Программирование', 'Стиль'], correct: 0 },
      { q: 'CSS?', answers: ['Язык стилей', 'Программирование', 'Разметка'], correct: 0 },
      { q: 'JavaScript?', answers: ['Язык скрипта', 'Разметка', 'Стиль'], correct: 0 },
      { q: 'Компилятор?', answers: ['Переводит в машинный код', 'Тип данных', 'Цикл'], correct: 0 },
      { q: 'Интерпретатор?', answers: ['Выполняет построчно', 'Язык', 'Переменная'], correct: 0 },
      { q: 'Класс?', answers: ['Шаблон', 'Переменная', 'Функция'], correct: 0 },
      { q: 'Объект?', answers: ['Экземпляр класса', 'Цикл', 'Тип'], correct: 0 },
      { q: 'Инкапсуляция?', answers: ['Сокрытие данных', 'Цикл', 'Переменная'], correct: 0 },
      { q: 'Наследование?', answers: ['Новый класс от существующего', 'Удаление', 'Функция'], correct: 0 },
      { q: 'Полиморфизм?', answers: ['Разные формы', 'Тип', 'Цикл'], correct: 0 }
    ];
  } else if (template === 'gen') {
    data = [
      { q: 'Столица России?', answers: ['Москва', 'Санкт-Петербург', 'Казань'], correct: 0 },
      { q: 'Столица Франции?', answers: ['Париж', 'Лион', 'Марсель'], correct: 0 },
      { q: 'Столица Японии?', answers: ['Токио', 'Осака', 'Киото'], correct: 0 },
      { q: '2+2=?', answers: ['4', '5', '3'], correct: 0 },
      { q: 'Квадратный корень из 16?', answers: ['4', '5', '3'], correct: 0 },
      { q: 'Сколько континентов?', answers: ['7', '6', '5'], correct: 0 },
      { q: 'Планета ближе всех к Солнцу?', answers: ['Меркурий', 'Венера', 'Марс'], correct: 0 },
      { q: 'Какой газ дышат растения?', answers: ['CO2', 'O2', 'N2'], correct: 0 },
      { q: 'Самое большое животное?', answers: ['Синий кит', 'Слон', 'Жираф'], correct: 0 },
      { q: 'Какой город "Босс"?', answers: ['Москва', 'Лондон', 'Нью-Йорк'], correct: 0 },
      { q: 'Сколько букв в алфавите?', answers: ['33', '32', '34'], correct: 0 },
      { q: 'Какой элемент № 1?', answers: ['Водород', 'Гелий', 'Литий'], correct: 0 },
      { q: 'Температура кипения воды?', answers: ['100°C', '90°C', '110°C'], correct: 0 },
      { q: 'Автор "Войны и мира"?', answers: ['Лев Толстой', 'Пушкин', 'Достоевский'], correct: 0 },
      { q: 'Сколько дней в году?', answers: ['365', '366', '364'], correct: 0 },
      { q: 'Сколько часов в сутках?', answers: ['24', '25', '23'], correct: 0 },
      { q: 'Сколько минут в часе?', answers: ['60', '61', '59'], correct: 0 },
      { q: 'Сколько секунд в минуте?', answers: ['60', '61', '59'], correct: 0 },
      { q: 'Столица США?', answers: ['Вашингтон', 'Нью-Йорк', 'Лос-Анджелес'], correct: 0 },
      { q: 'Самая длинная река?', answers: ['Нил', 'Амазонка', 'Волга'], correct: 0 },
      { q: 'Кто написал Бога не существует?', answers: ['Ницше', 'Маркс', 'Фрейд'], correct: 0 },
      { q: 'Авторство Библии?', answers: ['Не известен', 'Моисей', 'Иисус'], correct: 0 },
      { q: 'Какой год была революция?', answers: ['1917', '1920', '1915'], correct: 0 },
      { q: 'Когда был Октябрьский переворот?', answers: ['1917', '1920', '1915'], correct: 0 },
      { q: 'Кто первый космонавт?', answers: ['Гагарин', 'Королёв', 'Циолковский'], correct: 0 }
    ];
  }
  data.slice(0, 40).forEach(q => addQuestionBuilder(q));
}

function previewQuiz() {
  const items = Array.from(document.querySelectorAll('.qb-item'));
  const qs = items.map(item => {
    const q = item.querySelector('.qb-q').value.trim();
    const as = Array.from(item.querySelectorAll('.qb-a')).map(i=>i.value.trim()).filter(v=>v);
    const correct = Array.from(item.querySelectorAll('input[type=radio]')).findIndex(r=>r.checked);
    return { q, answers: as, correct };
  }).filter(x=>x.q && x.answers.length>=2);
  
  if (qs.length === 0) {
    alert('Добавьте хотя бы один вопрос для превью');
    return;
  }
  
  const preview = `
    <div style="color:#00ffcc; text-align:left; max-height:400px; overflow-y:auto;">
      <h3>Превью квиза</h3>
      <p>Вопросов: <strong>${qs.length}</strong></p>
      ${qs.slice(0, 5).map((q, i) => `
        <div style="border:1px solid #00ffcc; padding:10px; margin:8px 0; border-radius:8px;">
          <p><strong>Q${i+1}:</strong> ${q.q}</p>
          <ul style="margin:8px 0;">
            ${q.answers.map((a, idx) => `<li>${a} ${idx === q.correct ? '✓ (правильный)' : ''}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      ${qs.length > 5 ? `<p>... и ещё ${qs.length - 5} вопросов</p>` : ''}
    </div>`;
  
  alert(preview.replace(/<[^>]*>/g, ''));
}

function saveCustomQuiz() {
  const title = document.getElementById('quizTitle').value.trim() || 'Без названия';
  const items = Array.from(document.querySelectorAll('.qb-item'));
  const qs = items.map(item => {
    const q = item.querySelector('.qb-q').value.trim();
    const as = Array.from(item.querySelectorAll('.qb-a')).map(i=>i.value.trim()).filter(v=>v);
    const correct = Array.from(item.querySelectorAll('input[type=radio]')).findIndex(r=>r.checked);
    return { q, answers: as, correct };
  }).filter(x=>x.q && x.answers.length>=2);
  const errors = document.getElementById('creatorErrors');
  if (qs.length < MIN_QUIZ_QUESTIONS || qs.length > MAX_QUIZ_QUESTIONS) {
    errors.innerText = `Квиз должен содержать от ${MIN_QUIZ_QUESTIONS} до ${MAX_QUIZ_QUESTIONS} вопросов. Сейчас: ` + qs.length;
    return;
  }
  qs.forEach(item=>{ if (item.correct >= item.answers.length) item.correct = 0; });
  const quizzes = JSON.parse(localStorage.getItem('customQuizzes') || '[]');
  const id = 'qz_' + Date.now();
  quizzes.push({ id, title, questions: qs, author: playerName });
  localStorage.setItem('customQuizzes', JSON.stringify(quizzes));
  errors.innerText = '';
  closeQuizCreator();
  showCharacter('Квиз сохранён! Код для игры генерируйте: "Создать комнату"');
  renderCustomQuizzes();
}

function renderCustomQuizzes() {
  const container = document.getElementById('customQuizzesList');
  const quizzes = JSON.parse(localStorage.getItem('customQuizzes') || '[]');
  if (!container) return;
  if (quizzes.length === 0) {
    container.innerHTML = '<div class="recent-item">Пока нет квизов</div>';
    return;
  }
  container.innerHTML = quizzes.slice(-5).map(q=>`
    <div class="quiz-row">
      <div><strong>${q.title}</strong> — ${q.author}</div>
      <div class="quiz-actions">
        <button onclick="createRoomForQuiz('${q.id}')">Создать комнату</button>
        <button onclick="exportQuiz('${q.id}')">Поделиться</button>
      </div>
    </div>`).join('');
}

function exportQuiz(id) {
  const quizzes = JSON.parse(localStorage.getItem('customQuizzes') || '[]');
  const q = quizzes.find(x=>x.id===id);
  if (!q) return alert('Квиз не найден');
  const data = encodeURIComponent(JSON.stringify(q));
  // create shareable link with payload
  const link = `${location.origin}${location.pathname}#import=${data}`;
  navigator.clipboard && navigator.clipboard.writeText(link).then(()=>{
    alert('Ссылка в буфере обмена! Отправьте другим игрокам.');
  }, ()=>{ prompt('Скопируйте ссылку', link); });
}

function createRoomForQuiz(quizId) {
  const serverUrl = getServerUrl();
  fetch(`${serverUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId, hostName: playerName })
  })
  .then(r => r.json())
  .then(data => {
    const code = data.code;
    const link = `${location.origin}${location.pathname}#room=${code}`;
    currentRoom = code;
    navigator.clipboard && navigator.clipboard.writeText(link).then(()=>{
      alert('Комната создана! Ссылка скопирована. Код: ' + code);
    }, ()=>{ prompt('Комната создана. Скопируйте ссылку', link); });
  })
  .catch(e => {
    console.error('Failed to create room:', e);
    // Fallback to local room code
    const code = generateRoomCode();
    const rooms = JSON.parse(localStorage.getItem('rooms')||'{}');
    rooms[code] = { quizId, host: playerName, created: Date.now() };
    localStorage.setItem('rooms', JSON.stringify(rooms));
    const link = `${location.origin}${location.pathname}#room=${code}`;
    navigator.clipboard && navigator.clipboard.writeText(link).then(()=>{
      alert('Комната создана (локально). Ссылка скопирована. Код: ' + code);
    }, ()=>{ prompt('Комната создана. Скопируйте ссылку', link); });
  });
}

function joinByCode(code) {
  code = (code||'').trim();
  const serverUrl = getServerUrl();
  
  // Try server first
  fetch(`${serverUrl}/api/rooms/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName })
  })
  .then(r => {
    if (!r.ok) throw new Error('Room not found on server');
    return r.json();
  })
  .then(data => {
    currentRoom = code;
    if (socket) socket.emit('join-room', { code, playerName });
    
    const quizzes = JSON.parse(localStorage.getItem('customQuizzes')||'[]');
    const q = quizzes.find(x=>x.id===data.room.quizId);
    if (!q) {
      alert('Квиз не найден локально. Попросите хоста отправить ссылку импорта.');
      return;
    }
    questions.splice(0, questions.length, ...q.questions);
    currentQuestion = 0; score = 0; isGameActive = true; 
    next('game'); showQuestion(); closeJoinModal();
    showCharacter('Подключено к комнате ' + code);
  })
  .catch(e => {
    console.log('Server join failed, trying local:', e);
    // Fallback to local room
    const rooms = JSON.parse(localStorage.getItem('rooms')||'{}');
    const room = rooms[code];
    if (!room) return alert('Комната не найдена');
    const quizzes = JSON.parse(localStorage.getItem('customQuizzes')||'[]');
    const q = quizzes.find(x=>x.id===room.quizId);
    if (!q) return alert('Квиз у хоста не найден');
    questions.splice(0, questions.length, ...q.questions);
    currentQuestion = 0; score = 0; isGameActive = true; 
    next('game'); showQuestion(); closeJoinModal();
    showCharacter('Подключено к комнате ' + code);
  });
}

function generateRoomCode() {
  const chars = 'ABCDEFGHKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

function openJoinModal() { document.getElementById('joinModal').style.display = 'flex'; }
function closeJoinModal() { document.getElementById('joinModal').style.display = 'none'; }

// import quiz from URL hash payload
function handleHashImport() {
  const hash = location.hash || '';
  if (hash.startsWith('#import=')) {
    try {
      const data = decodeURIComponent(hash.replace('#import=',''));
      const qobj = JSON.parse(data);
      const quizzes = JSON.parse(localStorage.getItem('customQuizzes')||'[]');
      qobj.id = 'qz_' + Date.now();
      quizzes.push(qobj);
      localStorage.setItem('customQuizzes', JSON.stringify(quizzes));
      alert('Квиз импортирован в ваши квизы.');
      location.hash = '';
      renderLobby();
    } catch(e){console.error(e);}
  }
  if (hash.startsWith('#room=')) {
    const code = hash.replace('#room=','');
    // auto-join room
    setTimeout(()=>{ joinByCode(code); }, 300);
  }
}

window.addEventListener('load', ()=>{ handleHashImport(); });

// --- Events & Mini-games ---
let answersSinceEvent = 0;
let isEventActive = false;

function confirmAnswer() {
  if (isAnswered || isEventActive) return;
  if (!selectedAnswer) {
    showCharacter('Выбери ответ 🤨');
    return;
  }
  isAnswered = true;
  clearInterval(timerInterval);
  const question = questions[currentQuestion];
  const correctAnswer = question.answers[question.correct];
  if (selectedAnswer === correctAnswer) {
    score += 3;
    showCharacter('✓ Верно! 🎉');
  } else {
    showCharacter('✗ Неправильно 😔');
  }
  answersSinceEvent += 1;
  setTimeout(() => {
    if (answersSinceEvent % 5 === 0) {
      // trigger mini-game event
      openEventScreen();
    } else {
      nextQuestion();
    }
  }, 900);
}

let currentMiniGame = null;
let miniGameStage = null;
let miniGameTimer = null;
let miniGameCountdownTimer = null;
let miniGameState = null;
let eventTimeLeft = 0;

function openEventScreen() {
  isEventActive = true;
  next('eventScreen');
  answersSinceEvent = 0;
  eventTimeLeft = 60;
  updateEventTimerDisplay();
  currentMiniGame = chooseRandomMiniGame();
  document.getElementById('eventTitle').innerText = getMiniGameTitle(currentMiniGame);
  renderEventIntro();
}

function chooseRandomMiniGame() {
  const games = ['word', 'flappy', 'cps', 'maze', 'math'];
  return games[Math.floor(Math.random() * games.length)];
}

function getMiniGameTitle(type) {
  return {
    word: 'Word Game — Словесный вызов',
    flappy: 'Flappy Cyber',
    cps: 'CPS Challenge — Клики в секунду',
    maze: 'Maze Runner',
    math: 'Equation Rush'
  }[type] || 'Mini Game';
}

function getMiniGameDescription(type) {
  return {
    word: 'Построй как можно больше слов из предлагаемых букв. Чем длиннее слово — тем больше очков.',
    flappy: 'Кликни чтобы начать! Лети между неоновыми колоннами. Первый клик запускает игру.',
    cps: 'Кликай как можно быстрее в течение 20 секунд. Считаем количество кликов в секунду (CPS).',
    maze: 'Проберись сквозь лабиринт, съешь все точки и не поймайся призраком.',
    math: 'Решай примеры как можно быстрее. Сложность растёт по мере прогресса.'
  }[type] || '';
}

function renderEventIntro() {
  document.getElementById('eventTimer').innerText = '⏱ 01:00';
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="event-start-card neon-card">
      <p class="event-desc">${getMiniGameDescription(currentMiniGame)}</p>
      <button class="event-start-btn" onclick="startEventCountdown()">Начать</button>
      <p class="event-hint">Игра длится 60 секунд. По окончании вернёмся к викторине.</p>
    </div>`;
}

function startEventCountdown() {
  if (miniGameCountdownTimer) return;
  miniGameStage = 'countdown';
  let counter = 3;
  const body = document.getElementById('eventBody');
  body.innerHTML = `<div class="event-countdown"><span id="countdownNumber">3</span></div>`;
  miniGameCountdownTimer = setInterval(() => {
    counter -= 1;
    const counterEl = document.getElementById('countdownNumber');
    if (counterEl) counterEl.innerText = counter > 0 ? counter : 'Старт';
    if (counter < 0) {
      clearInterval(miniGameCountdownTimer);
      miniGameCountdownTimer = null;
      startMiniGame();
    }
  }, 1000);
}

function startMiniGame() {
  miniGameStage = 'playing';
  eventTimeLeft = 60;
  updateEventTimerDisplay();
  if (miniGameTimer) clearInterval(miniGameTimer);
  miniGameTimer = setInterval(() => {
    eventTimeLeft -= 1;
    updateEventTimerDisplay();
    if (eventTimeLeft <= 0) {
      finishMiniGame(0);
    }
  }, 1000);
  renderMiniGame(currentMiniGame);
  showCharacter('Игра началась! 🎮');
}

function renderMiniGame(type) {
  switch(type) {
    case 'word': renderWordGame(); break;
    case 'flappy': renderFlappyGame(); break;
    case 'cps': renderCPSChallenge(); break;
    case 'maze': renderMazeGame(); break;
    case 'math': renderMathGame(); break;
    default: renderWordGame(); break;
  }
}

function updateEventTimerDisplay() {
  const timer = document.getElementById('eventTimer');
  if (!timer) return;
  const minutes = String(Math.floor(eventTimeLeft / 60)).padStart(2, '0');
  const seconds = String(eventTimeLeft % 60).padStart(2, '0');
  timer.innerText = `⏱ ${minutes}:${seconds}`;
}

function endEvent() {
  if (!isEventActive) return;
  finishMiniGame(0);
}

function stopMiniGame() {
  if (miniGameCountdownTimer) {
    clearInterval(miniGameCountdownTimer);
    miniGameCountdownTimer = null;
  }
  if (miniGameTimer) {
    clearInterval(miniGameTimer);
    miniGameTimer = null;
  }
  if (miniGameState && miniGameState.cleanup) {
    miniGameState.cleanup();
  }
  miniGameState = null;
  miniGameStage = null;
}

function finishMiniGame(bonus) {
  stopMiniGame();
  isEventActive = false;
  const balancedBonus = Math.floor(bonus * 0.4);
  if (balancedBonus > 0) score += balancedBonus;
  next('game');
  showCharacter('Возвращаемся в викторину');
  nextQuestion();
}

const WORD_DICTIONARY = new Set([
  'word','game','code','neon','cyber','quiz','brain','logic','spark','flash','light','matrix','pixel','rocket','hyper','speed','shift','power','dream','skill','cloud','blade','wave','arc','dash','plan','track','dance','ghost','storm','pulse','drive','laser','crystal','sound','vision','digit','magic','focus','glow','shadow','signal','space','vector','virtual','boost','orbit','strike','fusion','zone','alpha','omega','sparkle','frame','drift','mirror','rider','legend','tempo','titan','cat','dog','bat','rat','hat','mat','sat','fat','net','wet','set','bet','get','let','met','pet','jet','cut','but','put','run','fun','sun','gun','nun','bun','dot','hot','lot','pot','not','got','bit','hit','fit','kit','lit','pit','sit','wit','car','bar','far','jar','tar','war','star','art','art','eat','fat','rat','bat','cat','mat','sat','pat','hat','that','what','chat','flat','scat','stat'
]);
const WORD_SOURCE = ['cyber', 'neon', 'matrix', 'galaxy', 'rocket', 'plasma', 'future', 'digital', 'signal', 'vector', 'pixel', 'crystal', 'shadow', 'energy', 'fusion', 'virtual', 'system', 'network', 'circuit', 'protocol', 'quantum', 'stellar', 'cosmic', 'atomic', 'static'];

function generateValidWordLetters() {
  let attempts = 0;
  let baseWord, letters, validWords;
  do {
    baseWord = WORD_SOURCE[Math.floor(Math.random() * WORD_SOURCE.length)];
    letters = shuffleArray(baseWord.split('')).concat('aeiou'.split('')).slice(0, 7);
    validWords = Array.from(WORD_DICTIONARY).filter(word => {
      if (word.length < 2) return false;
      const available = [...letters];
      for (const char of word.toLowerCase()) {
        const pos = available.indexOf(char);
        if (pos === -1) return false;
        available.splice(pos, 1);
      }
      return true;
    });
    attempts += 1;
  } while (validWords.length < 3 && attempts < 20);
  return { letters, validWords: validWords.slice(0, 5) };
}

function renderWordGame() {
  const body = document.getElementById('eventBody');
  const { letters, validWords } = generateValidWordLetters();
  miniGameState = { type: 'word', letters, entry: '', found: [], score: 0, validWords };
  body.innerHTML = `
    <div class="word-game neon-card">
      <div class="wg-top">
        <div class="wg-title">Составляй слова</div>
        <div class="wg-score">Очки: <span id="wgScore">0</span></div>
      </div>
      <div class="wg-letters" id="wgLetters"></div>
      <div class="wg-entry">
        <input id="wgInput" type="text" placeholder="Введите слово" autocomplete="off" maxlength="12">
        <button onclick="submitWordGame()">Проверить</button>
      </div>
      <div class="wg-actions">
        <button onclick="clearWordGame()">Очистить</button>
      </div>
      <div class="wg-hint">Используй только эти буквы. Каждое новое слово — + очки.</div>
      <div class="wg-found" id="wgFound"></div>
    </div>`;
  const lettersEl = document.getElementById('wgLetters');
  letters.forEach((letter, idx) => {
    const chip = document.createElement('button');
    chip.className = 'wg-chip';
    chip.innerText = letter.toUpperCase();
    chip.onclick = () => addWordLetter(idx);
    lettersEl.appendChild(chip);
  });
  document.getElementById('wgInput').addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') submitWordGame();
  });
}

function addWordLetter(index) {
  if (!miniGameState || miniGameState.type !== 'word') return;
  miniGameState.entry += miniGameState.letters[index];
  const input = document.getElementById('wgInput');
  if (input) input.value = miniGameState.entry;
}

function clearWordGame() {
  if (!miniGameState || miniGameState.type !== 'word') return;
  miniGameState.entry = '';
  const input = document.getElementById('wgInput');
  if (input) input.value = '';
}

function submitWordGame() {
  if (!miniGameState || miniGameState.type !== 'word') return;
  const input = document.getElementById('wgInput');
  if (!input) return;
  const word = input.value.trim().toLowerCase();
  if (!word) return;
  const normalized = word.replace(/[^a-zа-яё]/gi, '');
  if (miniGameState.found.includes(normalized)) {
    showCharacter('Уже использовано!');
    return;
  }
  const available = [...miniGameState.letters];
  for (const char of normalized) {
    const pos = available.indexOf(char);
    if (pos === -1) {
      showCharacter('Нельзя из этих букв');
      return;
    }
    available.splice(pos,1);
  }
  if (!WORD_DICTIONARY.has(normalized)) {
    showCharacter('Слово не найдено');
    return;
  }
  miniGameState.found.push(normalized);
  const addScore = normalized.length * 10 + (normalized.length > 5 ? 15 : 0);
  miniGameState.score += addScore;
  document.getElementById('wgScore').innerText = miniGameState.score;
  const foundEl = document.getElementById('wgFound');
  if (foundEl) {
    const item = document.createElement('div');
    item.className = 'wg-found-item';
    item.innerText = `${normalized.toUpperCase()} +${addScore}`;
    foundEl.prepend(item);
  }
  input.value = '';
  if (miniGameState.found.length >= 5) {
    const { letters: newLetters, validWords: newValidWords } = generateValidWordLetters();
    miniGameState.letters = newLetters;
    miniGameState.validWords = newValidWords;
    miniGameState.found = [];
    const lettersEl = document.getElementById('wgLetters');
    if (lettersEl) {
      lettersEl.innerHTML = '';
      newLetters.forEach((letter, idx) => {
        const chip = document.createElement('button');
        chip.className = 'wg-chip';
        chip.innerText = letter.toUpperCase();
        chip.onclick = () => addWordLetter(idx);
        lettersEl.appendChild(chip);
      });
    }
    showCharacter('Отличный набор! Новые буквы! 🎉');
  } else {
    showCharacter('Отлично!');
  }
}

function renderFlappyGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="flappy-game neon-card">
      <div class="flappy-header">
        <div class="flappy-title">Flappy Cyber</div>
        <div class="flappy-score">Очки: <span id="flScore">0</span></div>
      </div>
      <div class="flappy-canvas" id="flappyCanvas"></div>
      <div class="flappy-hint" id="flappyHint">🖱️ НАЖМИ ДЛЯ НАЧАЛА! Пробел или клик — взлетай между трубами.</div>
    </div>`;
  const canvas = document.getElementById('flappyCanvas');
  canvas.innerHTML = '';
  const bird = document.createElement('div');
  bird.className = 'flappy-bird';
  bird.style.top = '140px';
  canvas.appendChild(bird);
  miniGameState = {
    type: 'flappy',
    y: 140,
    vy: 0,
    gravity: 0.22,
    jump: -6,
    maxFall: 7,
    score: 0,
    pipes: [],
    lastPipe: 0,
    running: false,
    gameStarted: false,
    canvas,
    bird,
    ended: false
  };
  function spawnPipe() {
    const topHeight = 90 + Math.random() * 90;
    const pipeGroup = document.createElement('div');
    pipeGroup.className = 'flappy-pipe-group';
    const pipeTop = document.createElement('div');
    pipeTop.className = 'flappy-pipe';
    pipeTop.style.height = `${topHeight}px`;
    pipeTop.style.top = '0';
    const pipeBottom = document.createElement('div');
    pipeBottom.className = 'flappy-pipe';
    pipeBottom.style.height = `${220 - topHeight}px`;
    pipeBottom.style.bottom = '0';
    pipeGroup.appendChild(pipeTop);
    pipeGroup.appendChild(pipeBottom);
    pipeGroup.style.right = '0';
    canvas.appendChild(pipeGroup);
    miniGameState.pipes.push({ el: pipeGroup, scored: false });
  }
  function endFlappyGame(bonus) {
    if (miniGameState.ended) return;
    miniGameState.ended = true;
    miniGameState.running = false;
    const hint = document.getElementById('flappyHint');
    if (hint) hint.textContent = '💥 Game Over';
    showCharacter('Ты врезался! Возвращаемся через секунду.');
    if (miniGameState.cleanup) miniGameState.cleanup();
    setTimeout(() => {
      finishMiniGame(bonus);
    }, 1200);
  }
  function onJump() {
    if (!miniGameState.gameStarted) {
      miniGameState.gameStarted = true;
      miniGameState.running = true;
      miniGameState.vy = miniGameState.jump;
      const hint = document.getElementById('flappyHint');
      if (hint) hint.textContent = 'Взлетай между трубами!';
      showCharacter('Поехали! 🚀');
      requestAnimationFrame(gameLoop);
      return;
    }
    if (!miniGameState.running) return;
    miniGameState.vy = miniGameState.jump;
  }
  const keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); onJump(); } };
  canvas.addEventListener('click', onJump);
  document.addEventListener('keydown', keyHandler);
  miniGameState.cleanup = ()=>{
    canvas.removeEventListener('click', onJump);
    document.removeEventListener('keydown', keyHandler);
  };
  function gameLoop() {
    if (!miniGameState.running || !miniGameState.gameStarted) return;
    miniGameState.vy = Math.min(miniGameState.maxFall, miniGameState.vy + miniGameState.gravity);
    miniGameState.y += miniGameState.vy;
    miniGameState.y = Math.max(0, Math.min(260, miniGameState.y));
    bird.style.top = `${miniGameState.y}px`;
    if (miniGameState.y >= 260 || miniGameState.y <= 0) {
      endFlappyGame(0);
      return;
    }
    const pipeSpeed = 1.1;
    for (const pipe of miniGameState.pipes) {
      if (miniGameState.ended) break;
      const currentRight = parseFloat(pipe.el.style.right) + pipeSpeed;
      pipe.el.style.right = `${currentRight}px`;
      const rect = pipe.el.getBoundingClientRect();
      const birdRect = bird.getBoundingClientRect();
      if (rect.right > birdRect.left && rect.left < birdRect.right) {
        const pipeTop = pipe.el.children[0].getBoundingClientRect();
        const pipeBottom = pipe.el.children[1].getBoundingClientRect();
        if (birdRect.top < pipeTop.bottom || birdRect.bottom > pipeBottom.top) {
          endFlappyGame(0);
          break;
        }
      }
      if (!pipe.scored && currentRight > 80) {
        pipe.scored = true;
        miniGameState.score += 1;
        const scoreEl = document.getElementById('flScore');
        if (scoreEl) scoreEl.innerText = miniGameState.score;
      }
      if (currentRight > 420) {
        pipe.el.remove();
      }
    }
    miniGameState.pipes = miniGameState.pipes.filter(pipe => parseFloat(pipe.el.style.right) <= 420);
    miniGameState.lastPipe -= 1;
    if (miniGameState.lastPipe <= 0) {
      spawnPipe();
      miniGameState.lastPipe = 120;
    }
    if (miniGameState.running && !miniGameState.ended) {
      requestAnimationFrame(gameLoop);
    }
  }
  miniGameState.lastPipe = 0;
  spawnPipe();
}

function renderCPSChallenge() {
  const body = document.getElementById('eventBody');
  let clicks = 0;
  let cpsStartTime = Date.now();
  body.innerHTML = `
    <div class="cps-challenge neon-card">
      <div class="cps-header">
        <div class="cps-title">⚡ CPS Challenge</div>
        <div class="cps-info">
          <div class="cps-stat">Время: <span id="cpsTimer">20</span>с</div>
          <div class="cps-stat">Клики: <span id="cpsClicks">0</span></div>
          <div class="cps-stat">CPS: <span id="cpsCPS">0.0</span></div>
        </div>
      </div>
      <button class="cps-button" id="cpsButton">КЛИК! 🖱️</button>
      <div class="cps-hint">Нажимай как можно быстрее! 20 секунд на отсчёт.</div>
    </div>`;
  
  const button = document.getElementById('cpsButton');
  const clicksEl = document.getElementById('cpsClicks');
  const cpsEl = document.getElementById('cpsCPS');
  const timerEl = document.getElementById('cpsTimer');
  
  let timeLeft = 20;
  let totalClicks = 0;
  let challengeActive = true;
  
  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerEl.innerText = timeLeft;
    const elapsedSeconds = (Date.now() - cpsStartTime) / 1000;
    const currentCPS = totalClicks / elapsedSeconds;
    cpsEl.innerText = currentCPS.toFixed(1);
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      challengeActive = false;
      button.disabled = true;
      button.textContent = '⏱️ ВРЕМЯ!';
      const finalCPS = totalClicks / 20;
      const bonus = Math.floor(finalCPS * 15);
      setTimeout(() => {
        finishMiniGame(bonus);
      }, 500);
    }
  }, 1000);
  
  button.addEventListener('click', () => {
    if (!challengeActive) return;
    totalClicks += 1;
    clicksEl.innerText = totalClicks;
    const elapsedSeconds = (Date.now() - cpsStartTime) / 1000;
    const currentCPS = totalClicks / elapsedSeconds;
    cpsEl.innerText = currentCPS.toFixed(1);
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 50);
  });
  
  miniGameState = {
    type: 'cps',
    clicks: totalClicks,
    cleanup: () => { clearInterval(timerInterval); }
  };
}

function findFirstPassage(layout, startX, startY) {
  for (let y = startY; y < layout.length; y++) {
    for (let x = startX; x < layout[y].length; x++) {
      if (layout[y][x] === '.') return { x, y };
    }
  }
  return { x: 1, y: 1 };
}

function findLastPassage(layout, startX, startY) {
  for (let y = startY; y >= 0; y--) {
    for (let x = startX; x >= 0; x--) {
      if (layout[y][x] === '.') return { x, y };
    }
  }
  return { x: layout[0].length - 2, y: layout.length - 2 };
}

function renderMazeGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="maze-game neon-card">
      <div class="mz-header">
        <div class="mz-title">Maze Runner</div>
        <div class="mz-score">Собрано: <span id="mzScore">0</span></div>
      </div>
      <div class="mz-grid" id="mzGrid"></div>
      <div class="mz-hint">Собирай точки и избегай врага. Управление: стрелки или WASD.</div>
    </div>`;

  const layouts = [
    [
      '#############',
      '#...........#',
      '#.###.###.#.#',
      '#.#.......#.#',
      '#.#.###.###.#',
      '#.#.#.....#.#',
      '#...#.#.#...#',
      '#.###.#.###.#',
      '#.....#.....#',
      '#############'
    ],
    [
      '#############',
      '#.#.......#.#',
      '#.#.###.#.#.#',
      '#...#.#.#...#',
      '###.#.#.#.###',
      '#...#...#...#',
      '#.#.#####.#.#',
      '#.#.......#.#',
      '#.....#.....#',
      '#############'
    ],
    [
      '#############',
      '#.......#...#',
      '#.###.#.#.#.#',
      '#.#.#.#.#.#.#',
      '#.#.#...#.#.#',
      '#.#.#####.#.#',
      '#.#.......#.#',
      '#.#####.###.#',
      '#.........#.#',
      '#############'
    ],
    [
      '#############',
      '#...#.....#.#',
      '#.#.#.###.#.#',
      '#.#...#...#.#',
      '#.#####.###.#',
      '#.....#.....#',
      '###.#######.#',
      '#...#.....#.#',
      '#.#.......#.#',
      '#############'
    ]
  ];

  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  const grid = document.getElementById('mzGrid');
  grid.innerHTML = '';
  const rows = layout.length;
  const cols = layout[0].length;
  const cellSize = 32;
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  grid.style.gap = '1px';
  grid.style.width = `${cols * cellSize + (cols - 1)}px`;
  grid.style.margin = '0 auto';
  grid.style.position = 'relative';

  const startPosition = findFirstPassage(layout, 1, 1);
  const enemyPosition = findLastPassage(layout, cols - 2, 1);
  miniGameState = {
    type:'maze',
    rows,
    cols,
    layout,
    player: { x: startPosition.x, y: startPosition.y },
    enemy: { x: enemyPosition.x, y: enemyPosition.y },
    score:0,
    dots:0,
    cells:[],
    cleanup:null
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('div');
      cell.className = 'mz-cell';
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      const ch = layout[y][x];
      if (ch === '#') {
        cell.classList.add('mz-wall');
      } else if (ch === '.') {
        cell.classList.add('mz-dot');
        miniGameState.dots += 1;
      }
      grid.appendChild(cell);
      miniGameState.cells.push(cell);
    }
  }

  const playerEl = document.createElement('div');
  playerEl.className = 'mz-player';
  playerEl.style.position = 'absolute';
  playerEl.style.width = `${cellSize - 8}px`;
  playerEl.style.height = `${cellSize - 8}px`;
  playerEl.style.pointerEvents = 'none';
  grid.appendChild(playerEl);

  const enemyEl = document.createElement('div');
  enemyEl.className = 'mz-enemy';
  enemyEl.style.position = 'absolute';
  enemyEl.style.width = `${cellSize - 8}px`;
  enemyEl.style.height = `${cellSize - 8}px`;
  enemyEl.style.pointerEvents = 'none';
  grid.appendChild(enemyEl);

  function renderPositions() {
    const left = miniGameState.player.x * (cellSize + 1) + 4;
    const top = miniGameState.player.y * (cellSize + 1) + 4;
    playerEl.style.left = `${left}px`;
    playerEl.style.top = `${top}px`;
    const eleft = miniGameState.enemy.x * (cellSize + 1) + 4;
    const etop = miniGameState.enemy.y * (cellSize + 1) + 4;
    enemyEl.style.left = `${eleft}px`;
    enemyEl.style.top = `${etop}px`;
  }

  function collectDot() {
    const idx = miniGameState.player.y * cols + miniGameState.player.x;
    const cell = miniGameState.cells[idx];
    if (cell && cell.classList.contains('mz-dot')) {
      cell.classList.remove('mz-dot');
      miniGameState.score += 10;
      document.getElementById('mzScore').innerText = miniGameState.score;
    }
  }

  function isWalkable(x, y) {
    return layout[y] && layout[y][x] !== '#';
  }

  function getEnemyMove() {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];
    const targetDistance = (x, y) => Math.abs(x - miniGameState.player.x) + Math.abs(y - miniGameState.player.y);
    const moves = directions
      .map(dir => ({
        x: miniGameState.enemy.x + dir.dx,
        y: miniGameState.enemy.y + dir.dy,
        dir
      }))
      .filter(step => isWalkable(step.x, step.y));
    if (moves.length === 0) return null;
    moves.sort((a, b) => targetDistance(a.x, a.y) - targetDistance(b.x, b.y));
    const bestDistance = targetDistance(moves[0].x, moves[0].y);
    const bestMoves = moves.filter(step => targetDistance(step.x, step.y) === bestDistance);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function moveEnemy() {
    const nextMove = getEnemyMove();
    if (nextMove) {
      miniGameState.enemy.x = nextMove.x;
      miniGameState.enemy.y = nextMove.y;
    }
    renderPositions();
    if (miniGameState.enemy.x === miniGameState.player.x && miniGameState.enemy.y === miniGameState.player.y) {
      finishMiniGame(Math.floor(miniGameState.score * 1.5));
    }
  }

  const keyHandler = (e) => {
    const moves = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0] };
    const move = moves[e.key];
    if (!move) return;
    const [dx, dy] = move;
    const nx = miniGameState.player.x + dx;
    const ny = miniGameState.player.y + dy;
    if (isWalkable(nx, ny)) {
      miniGameState.player.x = nx;
      miniGameState.player.y = ny;
      renderPositions();
      collectDot();
      if (miniGameState.enemy.x === nx && miniGameState.enemy.y === ny) {
        finishMiniGame(Math.floor(miniGameState.score * 1.5));
      }
    }
  };

  miniGameState.cleanup = () => { document.removeEventListener('keydown', keyHandler); clearInterval(miniGameState.enemyTimer); };
  document.addEventListener('keydown', keyHandler);
  miniGameState.enemyTimer = setInterval(moveEnemy, 520);
  renderPositions();
}

function renderMathGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="math-game neon-card">
      <div class="mg-header">
        <div class="mg-title">Equation Rush</div>
        <div class="mg-score">Очки: <span id="mgScore">0</span></div>
      </div>
      <div class="mg-equation" id="mgEquation"></div>
      <div class="mg-input-row">
        <input id="mgInput" type="number" placeholder="Ответ">
        <button onclick="submitMathAnswer()">OK</button>
      </div>
      <div class="mg-hint">Решай как можно быстрее. Сложность растёт каждые 5 правильных.</div>
    </div>`;
  miniGameState = { type:'math', score:0, difficulty:1, correctCount:0, answer:0 };
  generateMathEquation();
  document.getElementById('mgInput').addEventListener('keydown', (e)=>{ if (e.key === 'Enter') submitMathAnswer(); });
}

function generateMathEquation() {
  if (!miniGameState || miniGameState.type !== 'math') return;
  const ops = ['+','-','*','/'];
  const level = Math.min(3, Math.floor(miniGameState.correctCount / 5));
  const op = ops[level];
  let a = 1 + Math.floor(Math.random() * (8 + level * 4));
  let b = 1 + Math.floor(Math.random() * (8 + level * 4));
  if (op === '-') {
    if (a < b) [a,b] = [b,a];
    miniGameState.answer = a - b;
  } else if (op === '*') {
    miniGameState.answer = a * b;
  } else if (op === '/') {
    b = 1 + Math.floor(Math.random() * 6);
    miniGameState.answer = a;
    a = miniGameState.answer * b;
  } else {
    miniGameState.answer = a + b;
  }
  document.getElementById('mgEquation').innerText = `${a} ${op} ${b} = ?`;
}

function submitMathAnswer() {
  if (!miniGameState || miniGameState.type !== 'math') return;
  const input = document.getElementById('mgInput');
  if (!input) return;
  const value = Number(input.value);
  if (value === miniGameState.answer) {
    miniGameState.score += 15 + miniGameState.difficulty * 2;
    miniGameState.correctCount += 1;
    if (miniGameState.correctCount % 5 === 0) miniGameState.difficulty += 1;
    document.getElementById('mgScore').innerText = miniGameState.score;
    showCharacter('Правильно!');
    input.value = '';
    generateMathEquation();
  } else {
    showCharacter('Неправильно. Попробуй снова!');
  }
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function startGame(difficulty) {
  maxTime = difficulty;
  currentQuestion = 0;
  score = 0;
  selectedAnswer = null;
  isAnswered = false;
  questionQueue = buildQuestionQueue();
  answersSinceEvent = 0; // reset event counter on new game
  next('game');
  showQuestion();
  isGameActive = true;
  showCharacter('Поехали! 🚀');
}

function getQuestionKey(question) {
  return question.q;
}

function buildQuestionQueue() {
  const pool = [...questions];
  const queue = [];
  const repeatCounts = {};
  const recent = [];
  while (queue.length < pool.length) {
    const available = pool.filter(q => {
      const key = getQuestionKey(q);
      const count = repeatCounts[key] || 0;
      if (count >= 3) return false;
      if (recent.includes(key)) return false;
      return true;
    });
    const candidates = available.length ? available : pool.filter(q => (repeatCounts[getQuestionKey(q)] || 0) < 3);
    const nextQuestion = candidates[Math.floor(Math.random() * candidates.length)];
    const key = getQuestionKey(nextQuestion);
    queue.push(nextQuestion);
    repeatCounts[key] = (repeatCounts[key] || 0) + 1;
    recent.push(key);
    if (recent.length > 5) recent.shift();
  }
  return queue;
}

function logout() {
  clearInterval(timerInterval);
  isGameActive = false;
  selectedAnswer = null;
  isAnswered = false;
  document.getElementById('nameInput').value = '';
  document.getElementById('passwordInput').value = '';
  playerName = '';
  updateSupportButtonVisibility();
  next('loginScreen');
  showCharacter('До встречи! 👋');
}

function quitGame() {
  if (confirm('Вы уверены? Игра будет потеряна!')) {
    clearInterval(timerInterval);
    isGameActive = false;
    logout();
  }
}

function finishGame() {
  clearInterval(timerInterval);
  isGameActive = false;
  const isNewRecord = saveRecord(playerName, score);
  document.getElementById('finalText').innerText = `${playerName} — очки: ${score}`;
  const resultMsg = document.getElementById('resultMsg');
  if (isNewRecord) {
    resultMsg.innerText = '🔥 Новый рекорд! Молодец!';
  } else if (score < 50) {
    resultMsg.innerText = '😔 Не сдавайся, попробуй снова.';
  } else {
    resultMsg.innerText = '😎 Отличный результат!';
  }
  const user = getCurrentUser();
  if (user) {
    const coinsEarned = Math.max(20, Math.floor(score / 3));
    user.coins = (user.coins || 0) + coinsEarned;
    saveCurrentUser(user);
    showCharacter(`Ты заработал ${coinsEarned} coins!`);
  }
  
  // Send to WebSocket server
  if (socket && currentRoom) {
    socket.emit('game-finished', {
      code: currentRoom,
      playerName,
      score,
      quizTitle: 'Custom Quiz'
    });
  }
  
  next('finish');
  showRecord();
}

function saveRecord(name, score) {
  const record = JSON.parse(localStorage.getItem('record') || 'null');
  let isNewRecord = false;
  if (!record || score > record.score) {
    localStorage.setItem('record', JSON.stringify({ name, score }));
    isNewRecord = true;
  }
  
  // Save to local leaderboard
  const leaderboard = getLeaderboard();
  leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
  leaderboard.sort((a, b) => b.score - a.score);
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard.slice(0, 10)));
  
  // Save recent game with timestamp
  const recent = JSON.parse(localStorage.getItem('recentGames') || '[]');
  recent.unshift({ name, score, timestamp: Date.now() });
  localStorage.setItem('recentGames', JSON.stringify(recent.slice(0, 5)));
  
  // Send to server
  if (socket && socket.connected) {
    fetch(`${getServerUrl()}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: name, score, quizTitle: 'Quiz' })
    }).catch(e => console.log('Server save failed:', e));
  }
  
  return isNewRecord;
}

function getServerUrl() {
  return BACKEND_URL;
}

function getLeaderboard() {
  return JSON.parse(localStorage.getItem('leaderboard') || '[]');
}

function formatRelativeTime(ts) {
  const time = Date.now() - Number(ts || Date.now());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (time < minute) return 'только что';
  if (time < hour) {
    const minutes = Math.round(time / minute);
    return minutes === 1 ? '1 минута назад' : `${minutes} минут назад`;
  }
  if (time < day) {
    const hours = Math.round(time / hour);
    return hours === 1 ? '1 час назад' : `${hours} часа назад`;
  }
  const days = Math.round(time / day);
  return days === 1 ? '1 день назад' : `${days} дней назад`;
}

function parseLegacyRecent(text) {
  const match = text.match(/^(.*) - (\d+)/);
  return { name: match ? match[1] : 'Игрок', score: match ? Number(match[2]) : 0, timestamp: Date.now() };
}

function showLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  const list = document.getElementById('leaderboardList');
  
  // Try to fetch from server first
  fetch(`${getServerUrl()}/api/leaderboard`)
    .then(r => r.json())
    .then(onlineBoard => {
      const localBoard = getLeaderboard();
      const combined = [...onlineBoard.slice(0, 25), ...localBoard].sort((a, b) => b.score - a.score);
      const unique = Array.from(new Map(combined.map(e => [e.playerName + e.score, e])).values()).slice(0, 50);
      
      if (unique.length === 0) {
        list.innerHTML = '<p class="no-records">Нет рекордов</p>';
      } else {
        list.innerHTML = unique.map((entry, index) => `
          <div class="leaderboard-entry">
            <span class="rank">#${index + 1}</span>
            <span class="name">${entry.playerName || entry.name}</span>
            <span class="score">${entry.score}</span>
          </div>
        `).join('');
      }
    })
    .catch(() => {
      // Fallback to local leaderboard
      const leaderboard = getLeaderboard();
      if (leaderboard.length === 0) {
        list.innerHTML = '<p class="no-records">Нет рекордов</p>';
      } else {
        list.innerHTML = leaderboard.map((entry, index) => `
          <div class="leaderboard-entry">
            <span class="rank">#${index + 1}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.score}</span>
          </div>
        `).join('');
      }
    });
  
  modal.style.display = 'flex';
}

function closeLeaderboard() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

function showRecord() {
  const record = JSON.parse(localStorage.getItem('record') || 'null');
  const recordBox = document.getElementById('record');
  recordBox.innerText = record ? `🏆 ${record.name} — ${record.score}` : 'Пока нет рекордов';
}

function showTeamPopup(contentHtml) {
  const popup = document.getElementById('teamPopup');
  const content = document.getElementById('teamPopupContent');
  if (!popup || !content) return;
  content.innerHTML = contentHtml;
  popup.classList.remove('hidden');
  popup.classList.add('visible');
}

function closeTeamPopup() {
  const popup = document.getElementById('teamPopup');
  if (!popup) return;
  popup.classList.remove('visible');
  popup.classList.add('hidden');
}

function handleTeamStatue(type) {
  const rightStatue = document.querySelector('.statue-right');
  const leftStatue = document.querySelector('.statue-left');
  const centerStatue = document.querySelector('.statue-center');

  if (type === 'm') {
    if (rightStatue) {
      rightStatue.classList.add('statue-press');
      setTimeout(() => rightStatue.classList.remove('statue-press'), 600);
    }
    showTeamPopup(`
      <div class="popup-title">👤 Коллега М — QA Тестировщик</div>
      <div class="team-details">
        <div class="team-block">
          <strong>Роль</strong>
          <p>Отвечает за проверку качества приложения и поиск ошибок.</p>
        </div>
        <div class="team-block">
          <strong>Задачи</strong>
          <p>✓ Тестирование функциональности<br>✓ Проверка совместимости<br>✓ Документирование багов<br>✓ Регрессионное тестирование</p>
        </div>
        <div class="team-block">
          <strong>Навыки</strong>
          <p>Внимание к деталям, аналитическое мышление, знание методологий тестирования, automation (Selenium, Cypress).</p>
        </div>
      </div>
    `);
  }

  if (type === 'e') {
    if (leftStatue) {
      leftStatue.classList.add('throw-ink');
      setTimeout(() => leftStatue.classList.remove('throw-ink'), 900);
    }
    const splash = document.getElementById('inkSplash');
    if (splash) {
      splash.classList.remove('hidden');
      splash.classList.add('active');
      setTimeout(() => {
        splash.classList.remove('active');
        splash.classList.add('hidden');
      }, 900);
    }
    setTimeout(() => {
      showTeamPopup(`
        <div class="popup-title">🎨 Коллега Е — UI/UX Дизайнер</div>
        <div class="team-details">
          <div class="team-block">
            <strong>Роль</strong>
            <p>Создаёт визуальный дизайн и пользовательский интерфейс приложения.</p>
          </div>
          <div class="team-block">
            <strong>Задачи</strong>
            <p>✓ Прототипирование интерфейсов<br>✓ Создание визуального стиля<br>✓ Дизайн логотипов и иконок<br>✓ Оптимизация UX<br>✓ Создание компонентов</p>
          </div>
          <div class="team-block">
            <strong>Навыки</strong>
            <p>Творчество, знание принципов дизайна, Figma/Photoshop/Adobe XD, работа с цветом и типографией, аналитика пользователя.</p>
          </div>
          <div class="team-block">
            <strong>Специализация</strong>
            <p>Neon/Cyber стиль, интерактивные элементы, адаптивный дизайн для всех устройств.</p>
          </div>
        </div>
      `);
    }, 300);
  }

  if (type === 'scrum') {
    if (centerStatue) {
      centerStatue.classList.add('statue-zoom');
      setTimeout(() => centerStatue.classList.remove('statue-zoom'), 1200);
    }
    showTeamPopup(`
      <div class="popup-title">💻 Команда разработчиков</div>
      <div class="team-details">
        <div class="team-block">
          <strong>🚀 Scrum-master / Team Lead</strong>
          <p>Координирует процесс разработки, организует спринты и планирует задачи. Обеспечивает эффективную коммуникацию в команде.</p>
        </div>
        <div class="team-block">
          <strong>⚙️ Backend разработчик</strong>
          <p>Разрабатывает серверную часть приложения. Отвечает за API, базы данных, аутентификацию, синхронизацию и хранение данных. Тек-стек: Node.js, Express, MongoDB.</p>
        </div>
        <div class="team-block">
          <strong>🎮 Frontend разработчик</strong>
          <p>Создаёт пользовательский интерфейс и клиентскую часть. Работает с HTML/CSS/JavaScript, реализует интерактивность и анимации. Обеспечивает адаптивность для всех устройств.</p>
        </div>
    `);
  }
}

function showCharacter(text) {
  const box = document.getElementById('characterBox');
  const speech = document.getElementById('speech');
  if (!box || !speech) return;
  box.style.display = 'flex';
  clearInterval(window.typingInterval);
  speech.textContent = '';
  let index = 0;
  let displayedText = '';
  window.typingInterval = setInterval(() => {
    if (index < text.length) {
      displayedText += text[index];
      speech.textContent = displayedText;
      index += 1;
    } else {
      clearInterval(window.typingInterval);
    }
  }, 30);
}

function selectAnswer(button) {
  if (isAnswered) return;
  selectedAnswer = button.innerText;
  document.querySelectorAll('.answerBtn').forEach(btn => {
    btn.style.background = 'rgba(0, 0, 0, 0.5)';
    btn.style.color = '#00ffcc';
  });
  button.style.background = '#00ffcc';
  button.style.color = 'black';
}

function showQuestion() {
  if (currentQuestion >= questionQueue.length) {
    finishGame();
    return;
  }
  document.getElementById('progress').innerText = `Вопрос ${currentQuestion + 1} / ${questionQueue.length}`;
  document.getElementById('score').innerText = `💯 Очки: ${score}`;
  isAnswered = false;
  selectedAnswer = null;
  const question = questionQueue[currentQuestion] || questions[currentQuestion];
  document.getElementById('question').innerText = question.q;
  const answers = [...question.answers].sort(() => Math.random() - 0.5);
  document.querySelectorAll('.answerBtn').forEach((button, index) => {
    button.innerText = answers[index];
    button.style.background = 'rgba(0, 0, 0, 0.5)';
    button.style.color = '#00ffcc';
  });
  startTimer();
}


function nextQuestion() {
  clearInterval(timerInterval);
  if (!isAnswered) return;
  currentQuestion += 1;
  if (currentQuestion >= questions.length) {
    finishGame();
  } else {
    showQuestion();
  }
}

function startTimer() {
  time = maxTime;
  document.getElementById('timer').innerText = `⏱ ${time}`;
  timerInterval = setInterval(() => {
    time -= 1;
    document.getElementById('timer').innerText = `⏱ ${time}`;
    if (time <= 0) {
      clearInterval(timerInterval);
      isAnswered = true;
      showCharacter('Время вышло ⏰');
      setTimeout(nextQuestion, 1000);
    }
  }, 1000);
}

const questions = [
  { q: 'Что такое алгоритм?', answers: ['Последовательность действий', 'Переменная', 'Цикл'], correct: 0 },
  { q: 'Что такое анализ программы?', answers: ['Разбиение проблемы', 'Компиляция', 'Запуск'], correct: 0 },
  { q: 'Что такое переменная?', answers: ['Область памяти', 'Цикл', 'Функция'], correct: 0 },
  { q: 'Что такое тип данных?', answers: ['Классификация данных', 'Имя переменной', 'Метод'], correct: 0 },
  { q: 'Компилируемый язык?', answers: ['Переводится заранее', 'Работает в браузере', 'Не запускается'], correct: 0 },
  { q: 'Что такое цикл?', answers: ['Повторение кода', 'Тип данных', 'Функция'], correct: 0 },
  { q: 'Что такое функция?', answers: ['Блок кода', 'Переменная', 'Ошибка'], correct: 0 },
  { q: 'Что такое рекурсия?', answers: ['Функция вызывает себя', 'Цикл', 'Тип'], correct: 0 },
  { q: 'Что такое массив?', answers: ['Линейная структура', 'Функция', 'Класс'], correct: 0 },
  { q: 'Связный список?', answers: ['Элементы связаны', 'Массив', 'Цикл'], correct: 0 },
  { q: 'Двоичное дерево?', answers: ['Упорядоченная структура', 'Тип', 'Цикл'], correct: 0 },
  { q: 'Хеш-таблица?', answers: ['Поиск по ключу', 'Массив', 'Цикл'], correct: 0 },
  { q: 'Стек и очередь?', answers: ['LIFO FIFO', 'Тип', 'Функция'], correct: 0 },
  { q: 'Big O?', answers: ['Сложность алгоритма', 'Переменная', 'Цикл'], correct: 0 },
  { q: 'Сортировка?', answers: ['Упорядочивание', 'Удаление', 'Создание'], correct: 0 },
  { q: 'ООП?', answers: ['Парадигма объектов', 'Язык', 'Тип'], correct: 0 },
  { q: 'Класс?', answers: ['Шаблон', 'Переменная', 'Функция'], correct: 0 },
  { q: 'Объект?', answers: ['Экземпляр', 'Цикл', 'Тип'], correct: 0 },
  { q: 'Инкапсуляция?', answers: ['Сокрытие', 'Цикл', 'Переменная'], correct: 0 },
  { q: 'Наследование?', answers: ['Новый класс', 'Удаление', 'Функция'], correct: 0 },
  { q: 'Полиморфизм?', answers: ['Разные формы', 'Тип', 'Цикл'], correct: 0 },
  { q: 'Абстракция?', answers: ['Выделение главного', 'Удаление', 'Переменная'], correct: 0 },
  { q: 'Garbage Collection?', answers: ['Удаление объектов', 'Цикл', 'Тип'], correct: 0 },
  { q: 'Тестирование ПО?', answers: ['Проверка', 'Создание', 'Компиляция'], correct: 0 },
  { q: 'Бета версия?', answers: ['Тестовая версия', 'Финальная', 'Ошибка'], correct: 0 },
  { q: 'SQL?', answers: ['Язык БД', 'Разметка', 'Фреймворк'], correct: 0 },
  { q: 'HTTP?', answers: ['Протокол', 'Язык', 'База'], correct: 0 },
  { q: 'API?', answers: ['Интерфейс', 'Функция', 'Переменная'], correct: 0 },
  { q: 'Библиотека?', answers: ['Готовый код', 'Переменная', 'Ошибка'], correct: 0 }
];

const introVideo = document.getElementById('introVideo');
if (introVideo) {
  const hideVideoScreen = () => {
    if (introAutoHideTimeout) { clearTimeout(introAutoHideTimeout); introAutoHideTimeout = null; }
    const videoScreen = document.getElementById('videoScreen');
    if (!videoScreen || !videoScreen.classList.contains('active')) return;
    videoScreen.classList.add('screen-exit');
    videoScreen.addEventListener('animationend', function onClose() {
      videoScreen.classList.remove('active', 'screen-exit');
      videoScreen.style.display = 'none';
      videoScreen.removeEventListener('animationend', onClose);
    }, { once: true });
    next('loginScreen');
    showCharacter('Привет 👋 Введи ник и пароль!');
  };

  introVideo.onended = hideVideoScreen;
  introVideo.onerror = hideVideoScreen;
  // Try to play the intro; if it causes lag, auto-hide after 1s as a fast fallback.
  const skipBtn = document.getElementById('introSkipBtn');
  if (skipBtn) skipBtn.addEventListener('click', hideVideoScreen);
  // Attempt to start playback (muted attribute on <video> should allow autoplay).
  introVideo.play().catch(()=>{ console.log('Intro autoplay blocked or deferred'); });
  // fast fallback: auto-hide after 3 seconds to avoid perceived lag
  introAutoHideTimeout = setTimeout(() => { hideVideoScreen(); }, 3000);
}
