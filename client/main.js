// Прочитаем query-параметры
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    mode: urlParams.get("mode") || "online", // "online" | "bots"
    username: urlParams.get("username") || "Player"
  };
}
const { mode, username } = getQueryParams();

// Получаем канву и контекст
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
resizeCanvas();

// HUD элементы
const scoreEl = document.getElementById("score");
const leaderboardUl = document.getElementById("leader-list");
const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas.getContext("2d");
const MINIMAP_SIZE = 200;
const MAP_SIZE = 2000; // от -1000 до +1000

// Переменные для игры
let socket = null;
let gameState = {
  players: [],
  foods: []
};

let myCells = [
  // Массив ячеек игрока (x, y, radius)
];
let color = "#000000";

// Для плавного движения: храним координаты мыши
let mouseX = 0;
let mouseY = 0;

// Базовая скорость (можно подбирать)
const BASE_SPEED = 3.0;

// Признак режима «боты» (офлайн)
let isBotMode = (mode === "bots");

// Инициализация
if (isBotMode) {
  // Запуск локальной логики с ботами
  initBotGame();
} else {
  // Подключаемся к серверу
  socket = io("http://localhost:3000");

  socket.on("connect", () => {
    socket.emit("newPlayer", { username });
  });

  socket.on("gameState", (state) => {
    gameState = state;
    // Найдём свои ячейки
    const me = gameState.players.find(p => p.id === socket.id);
    if (me) {
      myCells = me.cells;
      color = me.color;
      updateHUD(me.score);
    }
    updateLeaderboard();
  });
}

// Слушаем нажатия клавиш (деление, кормление)
document.addEventListener("keydown", (e) => {
  if (isBotMode) {
    // В режиме ботов можно реализовать локальную логику,
    // но для простоты пропустим
    return;
  }
  if (e.code === "Space") {
    // Деление
    socket.emit("split");
  } else if (e.key.toLowerCase() === "w") {
    // Кормление
    socket.emit("feed");
  }
});

// Главное игровое цикл
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

function update() {
  if (isBotMode) {
    // Локальная логика движения/столкновений для «своего» игрока и ботов
    updateBotGame(mouseX, mouseY);
    // gameState уже содержит наши players, foods
    // myCells — наши ячейки
  } else {
    // Движение игрока (отправляем на сервер)
    // Позиция рассчитывается на клиенте исходя из мыши и радиуса
    // (скорость зависит от радиуса)
    myCells.forEach((cell) => {
      const dx = mouseX - (canvas.width / 2);
      const dy = mouseY - (canvas.height / 2);
      const angle = Math.atan2(dy, dx);

      // Скорость: чем больше радиус, тем ниже скорость
      const speed = BASE_SPEED * (20 / cell.radius); 
      cell.x += Math.cos(angle) * speed;
      cell.y += Math.sin(angle) * speed;
    });

    // Отправляем на сервер массив позиций
    if (socket && socket.connected) {
      socket.emit("playerUpdate", {
        positions: myCells.map(c => ({ x: c.x, y: c.y }))
      });
    }
  }
}

function draw() {
  // Полноэкранная канва
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Вычислим «камеру» (центр экрана — среднее по всем ячейкам игрока)
  let avgX = 0, avgY = 0;
  myCells.forEach(c => {
    avgX += c.x;
    avgY += c.y;
  });
  if (myCells.length > 0) {
    avgX /= myCells.length;
    avgY /= myCells.length;
  }

  // Сохраняем контекст и сдвигаем
  ctx.save();
  // сместим координаты так, чтобы игрок был в центре
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.scale(1, 1);
  ctx.translate(-avgX, -avgY);

  // Рисуем сетку на большой карте
  drawGrid(ctx, -MAP_SIZE/2, -MAP_SIZE/2, MAP_SIZE, MAP_SIZE, 50);

  // Рисуем еду
  gameState.foods.forEach(f => {
    ctx.beginPath();
    ctx.fillStyle = f.color;
    ctx.arc(f.x, f.y, f.radius, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Рисуем игроков
  gameState.players.forEach(p => {
    p.cells.forEach(cell => {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(cell.x, cell.y, cell.radius, 0, 2*Math.PI);
      ctx.fill();

      // Имя игрока
      ctx.fillStyle = "#000";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(p.username, cell.x, cell.y - cell.radius - 10);
    });
  });

  ctx.restore();

  // Рисуем миникарту
  drawMinimap();

  // done
}

// Функция рисования сетки
function drawGrid(context, startX, startY, width, height, step) {
  context.strokeStyle = "#ddd";
  context.lineWidth = 1;

  // Вертикальные линии
  for (let x = startX; x < startX + width; x += step) {
    context.beginPath();
    context.moveTo(x, startY);
    context.lineTo(x, startY + height);
    context.stroke();
  }

  // Горизонтальные линии
  for (let y = startY; y < startY + height; y += step) {
    context.beginPath();
    context.moveTo(startX, y);
    context.lineTo(startX + width, y);
    context.stroke();
  }
}

// Отслеживаем мышь
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// При изменении размеров окна
window.addEventListener("resize", () => {
  resizeCanvas();
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Обновление HUD
function updateHUD(myScore) {
  scoreEl.textContent = "Score: " + myScore;
}

// Обновление таблицы лидеров
function updateLeaderboard() {
  // Сортируем всех игроков по убыванию счёта
  const sorted = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 5);
  leaderboardUl.innerHTML = "";
  sorted.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.username} - ${p.score}`;
    leaderboardUl.appendChild(li);
  });
}

// Рисуем миникарту
function drawMinimap() {
  minimapCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  // Коэффициент преобразования (2000 -> 200)
  const scale = MINIMAP_SIZE / MAP_SIZE;
  // Рисуем фон
  minimapCtx.fillStyle = "#eee";
  minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Рисуем всех игроков
  gameState.players.forEach(p => {
    minimapCtx.fillStyle = p.color;
    p.cells.forEach(c => {
      const mx = (c.x + MAP_SIZE/2) * scale;
      const my = (c.y + MAP_SIZE/2) * scale;
      const mr = c.radius * scale;
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, mr < 2 ? 2 : mr, 0, 2*Math.PI);
      minimapCtx.fill();
    });
  });
  
  // Еду рисовать на миникарте можно, но часто в Agar.io её не рисуют на миникарте.
}

//
// ============ БОТОВЫЙ РЕЖИМ (OFFLINE) ============ 
// Простейшая реализация в ai.js
// Здесь только функции-обёртки, 
// чтобы было понятно, что мы обрабатываем локально.
//

function initBotGame() {
  // Создаём локальные структуры
  // В ai.js будет: gameState, myCells, т.д.
  window.initAiGame(username);
  // Подсовываем наши локальные переменные:
  window.botGameState.players = window.botGameState.players || [];
  window.botGameState.foods = window.botGameState.foods || [];

  // Устанавливаем gameState как ссылку на бот-структуру
  gameState = window.botGameState;
  myCells = window.myCells;

  // Принудительно создаём «нас» и нескольких ботов
  // done в initAiGame()
}

function updateBotGame(mx, my) {
  // Вызываем функцию ботового обновления
  window.updateAiGame(mx, my);
  // После этого в botGameState и myCells будут актуальные данные
  gameState = window.botGameState;
  // Ищем себя
  const me = gameState.players.find(p => p.username === username && !p.isBot);
  if (me) {
    // Обновляем мой HUD
    updateHUD(me.score);
  }
  updateLeaderboard();
}
