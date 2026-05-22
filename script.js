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
const MIN_QUIZ_QUESTIONS = 20;
const MAX_QUIZ_QUESTIONS = 40;

// Initialize socket connection
function initSocket() {
  const serverUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;
  
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

function cleanOldUsers(users) {
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  Object.keys(users).forEach(name => {
    if (now - users[name].lastLogin > threeDays) {
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
    alert('С возвращением!');
  } else {
    users[name] = { password: pass, lastLogin: Date.now() };
    alert('Аккаунт создан!');
  }

  users[name].lastLogin = Date.now();
  saveUsers(users);
  playerName = name;
  document.getElementById('welcome').innerText = 'Привет, ' + name;
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
  if (qs.length < 20 || qs.length > 40) {
    errors.innerText = 'Квиз должен содержать от 20 до 40 вопросов. Сейчас: ' + qs.length;
    return;
  }
  // normalize answers to arrays of strings and ensure correct index valid
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

let eventTimer = null;
let eventTimeLeft = 0;

function openEventScreen() {
  isEventActive = true;
  stopActiveEvent();
  next('eventScreen');
  answersSinceEvent = 0; // reset counter so next event occurs after another 5 answers
  eventTimeLeft = 120;
  updateEventTimerDisplay();
  eventTimer = setInterval(() => {
    eventTimeLeft -= 1;
    updateEventTimerDisplay();
    if (eventTimeLeft <= 0) {
      clearInterval(eventTimer);
      eventTimer = null;
      showCharacter('Время ивента вышло ⏰');
      finishEventAndResume(0);
    }
  }, 1000);
  const games = ['quickTap', 'bowling', 'flappy', 'maze', 'colorMatch'];
  const game = games[Math.floor(Math.random() * games.length)];
  const titles = { quickTap: 'Быстрая нажимаилка ⚡', bowling: 'Боулинг 🎳', flappy: 'Летающий неон 🎮', maze: 'Лабиринт 🌀', colorMatch: 'Матч цветов 🎨' };
  document.getElementById('eventTitle').innerText = 'Event: ' + (titles[game] || game);
  switch(game) {
    case 'quickTap': startQuickTapMiniGame(); break;
    case 'bowling': startBowlingMiniGame(); break;
    case 'flappy': startFlappyMiniGame(); break;
    case 'maze': startMazeMiniGame(); break;
    case 'colorMatch': startColorMatchMiniGame(); break;
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
  stopActiveEvent();
}

function stopActiveEvent() {
  if (eventTimer) {
    clearInterval(eventTimer);
    eventTimer = null;
  }
  if (quickTapState?.timer) {
    clearInterval(quickTapState.timer);
  }
  if (bowlingState?.timer) {
    clearInterval(bowlingState.timer);
  }
  if (flappyState?.timer) {
    clearInterval(flappyState.timer);
  }
  if (mazeState) {
    if (mazeState.timer) clearInterval(mazeState.timer);
    if (mazeState.keyHandler) document.removeEventListener('keydown', mazeState.keyHandler);
  }
  if (colorMatchState?.timer) {
    clearInterval(colorMatchState.timer);
    window.handleColorMatch = ()=>{};
  }
  quickTapState = null;
  bowlingState = null;
  flappyState = null;
  mazeState = null;
  colorMatchState = null;
  if (isEventActive) {
    finishEventAndResume(0);
  }
}

function finishEventAndResume(bonus) {
  isEventActive = false;
  if (eventTimer) {
    clearInterval(eventTimer);
    eventTimer = null;
  }
  if (bonus) score += bonus;
  next('game');
  showCharacter('Возвращаемся в викторину');
  nextQuestion();
}

// Quick Tap mini-game implementation
let quickTapState = null;
function startQuickTapMiniGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="quicktap">
      <div class="qt-info">Нажимай кнопку как можно быстрее за <strong><span id="qtTime">10</span> сек</strong></div>
      <div class="qt-targets" id="qtTargets"></div>
      <div class="qt-score">Счёт: <span id="qtScore">0</span></div>
      <div class="qt-hint">Каждые 5 нажатий = +1 бонус к викторине</div>
    </div>`;
  quickTapState = { time: 10, score: 0, timer: null };
  const targets = document.getElementById('qtTargets');
  const btn = document.createElement('button');
  btn.className = 'qt-btn';
  btn.innerText = 'TAP';
  btn.onclick = ()=>{ if(!quickTapState) return; quickTapState.score += 1; document.getElementById('qtScore').innerText = quickTapState.score; animateTap(btn); };
  // allow keyboard space to tap
  window.qtKeyHandler = (e)=>{ if (e.code === 'Space') btn.click(); };
  document.addEventListener('keydown', window.qtKeyHandler);
  targets.appendChild(btn);
  quickTapState.timer = setInterval(()=>{
    quickTapState.time -= 1; document.getElementById('qtTime').innerText = quickTapState.time;
    if (quickTapState.time <= 0) {
      clearInterval(quickTapState.timer);
      document.removeEventListener('keydown', window.qtKeyHandler);
      const earned = Math.floor(quickTapState.score/5);
      quickTapState = null;
      showCharacter('Ивент завершён! Бонус: ' + earned);
      setTimeout(()=> finishEventAndResume(earned), 800);
    }
  },1000);
}

function stopQuickTapMiniGame() {
  if (quickTapState && quickTapState.timer) clearInterval(quickTapState.timer);
  quickTapState = null;
  finishEventAndResume(0);
}

function animateTap(btn) {
  btn.style.transform = 'scale(0.9)';
  setTimeout(()=>{ btn.style.transform = 'scale(1)'; }, 80);
}

// Bowling mini-game
let bowlingState = null;
function startBowlingMiniGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="bowling">
      <div class="bw-info">Запускай шар и сбивай кегли! Время: <strong><span id="bwTime">10</span> сек</strong></div>
      <div class="bw-canvas" id="bwCanvas"></div>
      <div class="bw-score">Сбито кегль: <span id="bwScore">0</span></div>
      <div class="bw-hint">Каждый сбитый набор даёт бонусы к викторине.</div>
    </div>`;
  bowlingState = { time: 10, score: 0, timer: null, launches: 0 };
  const canvas = document.getElementById('bwCanvas');
  // create simple pins
  const pins = document.createElement('div'); pins.className = 'bw-pins';
  for (let i=0;i<7;i++) { const p = document.createElement('div'); p.className='bw-pin'; pins.appendChild(p); }
  canvas.appendChild(pins);
  const launchBtn = document.createElement('button');
  launchBtn.className = 'bw-launch';
  launchBtn.innerText = '→ ЗАПУСК';
  launchBtn.onclick = ()=>{
    if (!bowlingState) return;
    bowlingState.launches += 1;
    // simple random knocks
    const knocked = Math.floor(Math.random()*4)+1;
    bowlingState.score += knocked;
    document.getElementById('bwScore').innerText = bowlingState.score;
    // animate pins briefly
    pins.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(10px) rotate(-6deg)' }, { transform: 'translateY(0)' }], { duration: 180, iterations: 1 });
    launchBtn.style.transform = 'scale(0.9)';
    setTimeout(()=>{ launchBtn.style.transform = 'scale(1)'; }, 180);
  };
  canvas.appendChild(launchBtn);
  bowlingState.timer = setInterval(()=>{
    bowlingState.time -= 1; document.getElementById('bwTime').innerText = bowlingState.time;
    if (bowlingState.time <= 0) {
      clearInterval(bowlingState.timer);
      const earned = Math.floor(bowlingState.score / 2);
      bowlingState = null;
      showCharacter('Боулинг завершён! Бонус: ' + earned);
      setTimeout(()=> finishEventAndResume(earned), 800);
    }
  }, 1000);
}

// Flappy Neon mini-game
let flappyState = null;
function startFlappyMiniGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="flappy">
      <div class="fl-info">Летай и избегай препятствий! Время: <span id="flTime">7</span> сек</div>
      <div class="fl-canvas" id="flCanvas" style="position:relative; width:100%; height:300px; background:#0a0a2e; border:2px solid #00ffcc; border-radius:10px; overflow:hidden;"></div>
      <div class="fl-score">Очки: <span id="flScore">0</span></div>
    </div>`;
  flappyState = { time: 12, score: 0, timer: null, y: 150, vy: 0, obstacles: [], gameActive: true };
  const canvas = document.getElementById('flCanvas');
  canvas.addEventListener('click', ()=>{ if(flappyState) flappyState.vy = -8; });
  
  const bird = document.createElement('div');
  bird.id = 'flBird';
  bird.style.cssText = 'position:absolute; width:20px; height:20px; background:#00ffcc; border-radius:50%; left:40px; top:150px; box-shadow:0 0 10px #00ffcc;';
  canvas.appendChild(bird);
  
  const updateFlappy = ()=>{
    if (!flappyState || !flappyState.gameActive) return;
    flappyState.vy += 0.5;
    flappyState.y += flappyState.vy;
    bird.style.top = flappyState.y + 'px';
    if (flappyState.y > 280 || flappyState.y < 0) flappyState.gameActive = false;
    if (Math.random() < 0.04) {
      const obs = document.createElement('div');
      obs.className = 'fl-obstacle';
      obs.style.cssText = 'position:absolute; width:40px; height:100px; background:#ff00ff; left:100%; border-radius:8px; box-shadow:0 0 12px #ff00ff;';
      obs.style.top = Math.random()*200 + 'px';
      canvas.appendChild(obs);
      let obsX = 100;
      const moveObs = setInterval(()=>{
        obsX -= 5;
        obs.style.left = obsX + '%';
        // simple collision check
        const birdTop = flappyState.y;
        const obsTop = parseFloat(obs.style.top);
        if (obsX < 10 && obsX > 0 && Math.abs(birdTop - obsTop) < 28) {
          // hit
          flappyState.gameActive = false;
        }
        if (obsX < 0) {
          clearInterval(moveObs);
          obs.remove();
          if (flappyState.gameActive) {
            flappyState.score += 1;
            document.getElementById('flScore').innerText = flappyState.score;
          }
        }
      }, 24);
    }
    requestAnimationFrame(updateFlappy);
  };
  updateFlappy();
  
  flappyState.timer = setInterval(()=>{
    flappyState.time -= 1; document.getElementById('flTime').innerText = flappyState.time;
    if (flappyState.time <= 0) {
      clearInterval(flappyState.timer);
      flappyState.gameActive = false;
      const earned = Math.floor(flappyState.score * 1.5);
      flappyState = null;
      showCharacter('Полёт завершён! Бонус: ' + earned);
      setTimeout(()=> finishEventAndResume(earned), 800);
    }
  }, 1000);
}

// Maze mini-game
let mazeState = null;
function startMazeMiniGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="maze">
      <div class="mz-info">Стрелки: ↑↓←→ Дойди до конца! Время: <span id="mzTime">8</span> сек</div>
      <div class="mz-canvas" id="mzCanvas"></div>
      <div class="mz-score">Прогресс: <span id="mzScore">0</span>%</div>
    </div>`;
  mazeState = { time: 8, x: 10, y: 10, goalX: 280, goalY: 280, timer: null, progress: 0 };
  const canvas = document.getElementById('mzCanvas');
  
  const player = document.createElement('div');
  player.id = 'mzPlayer';
  player.style.cssText = 'position:absolute; width:16px; height:16px; background:#00ffcc; border-radius:50%; left:10px; top:10px; box-shadow:0 0 10px #00ffcc;';
  canvas.appendChild(player);
  
  const goal = document.createElement('div');
  goal.id = 'mzGoal';
  goal.style.cssText = 'position:absolute; width:20px; height:20px; background:#ffff00; border-radius:50%; left:280px; top:280px; box-shadow:0 0 12px #ffff00; animation:pulse 0.5s infinite;';
  canvas.appendChild(goal);
  
  const updateProgress = ()=>{
    const dist = Math.sqrt(Math.pow(mazeState.goalX - mazeState.x, 2) + Math.pow(mazeState.goalY - mazeState.y, 2));
    mazeState.progress = Math.round(Math.max(0, 100 - dist / 3));
    document.getElementById('mzScore').innerText = mazeState.progress;
  };
  
  const keyHandler = (e)=>{
    if (!mazeState) return;
    if (e.key === 'ArrowUp') mazeState.y = Math.max(0, mazeState.y - 12);
    if (e.key === 'ArrowDown') mazeState.y = Math.min(280, mazeState.y + 12);
    if (e.key === 'ArrowLeft') mazeState.x = Math.max(0, mazeState.x - 12);
    if (e.key === 'ArrowRight') mazeState.x = Math.min(280, mazeState.x + 12);
    // WASD support
    if (e.key === 'w' || e.key === 'W') mazeState.y = Math.max(0, mazeState.y - 12);
    if (e.key === 's' || e.key === 'S') mazeState.y = Math.min(280, mazeState.y + 12);
    if (e.key === 'a' || e.key === 'A') mazeState.x = Math.max(0, mazeState.x - 12);
    if (e.key === 'd' || e.key === 'D') mazeState.x = Math.min(280, mazeState.x + 12);
    player.style.left = mazeState.x + 'px';
    player.style.top = mazeState.y + 'px';
    updateProgress();
    if (Math.sqrt(Math.pow(mazeState.goalX - mazeState.x, 2) + Math.pow(mazeState.goalY - mazeState.y, 2)) < 30) {
      mazeState.progress = 100;
      document.getElementById('mzScore').innerText = '100';
    }
  };
  mazeState.keyHandler = keyHandler;
  document.addEventListener('keydown', keyHandler);
  
  mazeState.timer = setInterval(()=>{
    mazeState.time -= 1; document.getElementById('mzTime').innerText = mazeState.time;
    if (mazeState.time <= 0) {
      clearInterval(mazeState.timer);
      document.removeEventListener('keydown', keyHandler);
      const earned = Math.floor(mazeState.progress / 20);
      mazeState = null;
      showCharacter('Лабиринт завершён! Бонус: ' + earned);
      setTimeout(()=> finishEventAndResume(earned), 800);
    }
  }, 1000);
}

// Color Match mini-game
let colorMatchState = null;
function startColorMatchMiniGame() {
  const body = document.getElementById('eventBody');
  body.innerHTML = `
    <div class="colormatch">
      <div class="cm-info">Найди нужный цвет за <span id="cmTime">7</span> сек</div>
      <div class="cm-target" id="cmTarget"></div>
      <div class="cm-buttons" id="cmButtons"></div>
      <div class="cm-score">Совпадений: <span id="cmScore">0</span></div>
    </div>`;
  colorMatchState = { time: 7, score: 0, timer: null, colors: ['#00ffcc', '#ff00ff', '#ffff00', '#ff3366', '#00ff88'] };
  
  const colors = colorMatchState.colors;
  const targetDiv = document.getElementById('cmTarget');
  const buttonsDiv = document.getElementById('cmButtons');
  
  const generateRound = ()=>{
    const target = colors[Math.floor(Math.random() * colors.length)];
    targetDiv.style.backgroundColor = target;
    targetDiv.style.boxShadow = `0 0 20px ${target}`;
    
    const options = [target, ...colors.filter(c=>c!==target)].sort(()=>Math.random()-0.5).slice(0, 4);
    buttonsDiv.innerHTML = options.map(c=>`
      <button class="cm-btn" style="background-color:${c}; box-shadow:0 0 12px ${c};" onclick="handleColorMatch('${c}', '${target}')">${c}</button>
    `).join('');
  };
  
  window.handleColorMatch = (selected, target)=>{
    if (!colorMatchState) return;
    if (selected === target) {
      colorMatchState.score += 1;
      document.getElementById('cmScore').innerText = colorMatchState.score;
      generateRound();
    }
  };
  colorMatchState.cleanup = ()=>{ window.handleColorMatch = ()=>{}; };
  
  generateRound();
  colorMatchState.timer = setInterval(()=>{
    colorMatchState.time -= 1; document.getElementById('cmTime').innerText = colorMatchState.time;
    if (colorMatchState.time <= 0) {
      clearInterval(colorMatchState.timer);
      const earned = colorMatchState.score * 2;
      colorMatchState = null;
      showCharacter('Матч цветов завершён! Бонус: ' + earned);
      setTimeout(()=> finishEventAndResume(earned), 800);
    }
  }, 1000);
}

function startGame(difficulty) {
  maxTime = difficulty;
  currentQuestion = 0;
  score = 0;
  selectedAnswer = null;
  isAnswered = false;
  questions.sort(() => Math.random() - 0.5);
  answersSinceEvent = 0; // reset event counter on new game
  next('game');
  showQuestion();
  isGameActive = true;
  showCharacter('Поехали! 🚀');
}

function logout() {
  clearInterval(timerInterval);
  isGameActive = false;
  selectedAnswer = null;
  isAnswered = false;
  document.getElementById('nameInput').value = '';
  document.getElementById('passwordInput').value = '';
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
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;
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
        <div class="team-block">
          <strong>🔗 Взаимодействие</strong>
          <p>Frontend ↔️ Backend через REST API / WebSocket. Все компоненты работают в едином Cyber/Neon стиле. Используется Git для контроля версий.</p>
        </div>
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
  speech.innerText = '';
  let index = 0;
  window.typingInterval = setInterval(() => {
    if (index < text.length) {
      speech.innerText += text[index];
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
  if (currentQuestion >= questions.length) {
    finishGame();
    return;
  }
  document.getElementById('progress').innerText = `Вопрос ${currentQuestion + 1} / ${questions.length}`;
  document.getElementById('score').innerText = `💯 Очки: ${score}`;
  isAnswered = false;
  selectedAnswer = null;
  const question = questions[currentQuestion];
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
