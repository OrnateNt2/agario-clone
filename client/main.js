// Получаем имя пользователя из URL
function getUsernameFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("username") || "Player";
  }
  
  const username = getUsernameFromUrl();
  
  const socket = io("http://localhost:3000");
  
  // Размер канвы, «камера» и текущие координаты игрока
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  
  let cameraX = 0;
  let cameraY = 0;
  
  let player = {
    x: 0,
    y: 0,
    radius: 20,
    color: "#000000",
    speed: 2,
  };
  
  // Хранение всех игроков и еды
  let players = [];
  let foods = [];
  
  // Отправляем событие о новом игроке
  socket.emit("newPlayer", { username: username });
  
  // Когда получаем новое состояние игры
  socket.on("gameState", (state) => {
    players = state.players;
    foods = state.foods;
  
    // Обновляем данные о нашем игроке
    const me = players.find((p) => p.username === username && p.id === socket.id);
    if (me) {
      player.x = me.x;
      player.y = me.y;
      player.radius = me.radius;
      player.color = me.color;
    }
  });
  
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  
  function update() {
    // Управление: получаем направление мыши относительно центра канвы
    const mousePos = getMousePos(canvas, lastMouse.x, lastMouse.y);
    const angle = Math.atan2(mousePos.y - height / 2, mousePos.x - width / 2);
  
    // Движение игрока в сторону мыши
    player.x += Math.cos(angle) * player.speed;
    player.y += Math.sin(angle) * player.speed;
  
    // Отправляем серверу обновлённые координаты
    socket.emit("playerUpdate", {
      x: player.x,
      y: player.y,
      radius: player.radius
    });
  
    // Центрируем камеру на игроке (чтобы игрок был в центре канвы)
    cameraX = player.x - width / 2;
    cameraY = player.y - height / 2;
  }
  
  function draw() {
    ctx.clearRect(0, 0, width, height);
  
    // Отрисовка фона (условная бесконечная карта, но здесь - просто фон)
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
  
    // Рисуем еду
    foods.forEach((food) => {
      ctx.beginPath();
      ctx.fillStyle = food.color;
      ctx.arc(food.x, food.y, food.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  
    // Рисуем всех игроков
    players.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
      ctx.fill();
  
      // Имя
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(p.username, p.x, p.y - p.radius - 5);
    });
  
    ctx.restore();
  }
  
  // Отслеживание положения мыши
  let lastMouse = { x: 0, y: 0 };
  canvas.addEventListener("mousemove", function (e) {
    lastMouse.x = e.clientX - canvas.getBoundingClientRect().left;
    lastMouse.y = e.clientY - canvas.getBoundingClientRect().top;
  });
  
  function getMousePos(canvas, mouseX, mouseY) {
    return { x: mouseX, y: mouseY };
  }
  
  // Запуск главного цикла
  gameLoop();
  