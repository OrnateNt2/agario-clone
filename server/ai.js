// ai.js — упрощённая локальная логика.
// В реальном проекте выносится на сервер или в отдельный модуль.

window.botGameState = {
    players: [],
    foods: []
  };
  
  window.myCells = []; // ячейки игрока
  
  const BOT_MAP_SIZE = 2000;
  const BOT_PLAYERS_COUNT = 5;
  const BOT_FOODS_COUNT = 200;
  
  function initAiGame(username) {
    // Очищаем структуру
    window.botGameState.players = [];
    window.botGameState.foods = [];
  
    // Создаём еду
    for (let i = 0; i < BOT_FOODS_COUNT; i++) {
      window.botGameState.foods.push({
        id: "food-" + i,
        x: Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2,
        y: Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2,
        radius: 5,
        color: "#FF4500"
      });
    }
  
    // Создаём игрока (пользователь)
    const userColor = getRandomColor();
    const userX = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
    const userY = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
    window.myCells = [
      {
        x: userX,
        y: userY,
        radius: 20
      }
    ];
    window.botGameState.players.push({
      username,
      color: userColor,
      score: 20,
      isBot: false,
      cells: window.myCells
    });
  
    // Создаём ботов
    for (let i = 0; i < BOT_PLAYERS_COUNT; i++) {
      const botName = "Bot" + i;
      const botColor = getRandomColor();
      const bx = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
      const by = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
      window.botGameState.players.push({
        username: botName,
        color: botColor,
        score: 20,
        isBot: true,
        cells: [
          {
            x: bx,
            y: by,
            radius: 20
          }
        ]
      });
    }
  }
  
  // Локальная функция обновления
  function updateAiGame(mx, my) {
    // У нас есть window.botGameState
    const state = window.botGameState;
  
    // Движение игрока
    // Позиция рассчитывается исходя из мыши и радиуса
    const me = state.players.find(p => !p.isBot);
    if (me) {
      me.cells.forEach(cell => {
        const dx = mx - (window.innerWidth / 2);
        const dy = my - (window.innerHeight / 2);
        const angle = Math.atan2(dy, dx);
        const speed = 3.0 * (20 / cell.radius);
        cell.x += Math.cos(angle) * speed;
        cell.y += Math.sin(angle) * speed;
        constrainCell(cell);
      });
    }
  
    // Движение ботов (рандом)
    state.players.forEach(p => {
      if (p.isBot) {
        p.cells.forEach(cell => {
          const angle = Math.random() * 2 * Math.PI;
          const speed = 2.5 * (20 / cell.radius); 
          cell.x += Math.cos(angle) * speed * 0.5; 
          cell.y += Math.sin(angle) * speed * 0.5; 
          constrainCell(cell);
        });
      }
    });
  
    // Столкновения с едой
    for (let i = state.foods.length - 1; i >= 0; i--) {
      const food = state.foods[i];
      let eaten = false;
      for (let pl of state.players) {
        for (let cell of pl.cells) {
          if (circleCollision(cell, food)) {
            cell.radius += 0.5;
            eaten = true;
            break;
          }
        }
        if (eaten) break;
      }
      if (eaten) state.foods.splice(i, 1);
    }
    // Если мало еды, докинем
    if (state.foods.length < BOT_FOODS_COUNT / 2) {
      for (let i = 0; i < 50; i++) {
        state.foods.push({
          id: "food-" + Math.random(),
          x: Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2,
          y: Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2,
          radius: 5,
          color: "#FF4500"
        });
      }
    }
  
    // Столкновения игроки <-> игроки
    for (let i = 0; i < state.players.length; i++) {
      for (let j = i+1; j < state.players.length; j++) {
        const p1 = state.players[i];
        const p2 = state.players[j];
        p1.cells.forEach(c1 => {
          p2.cells.forEach(c2 => {
            if (circleCollision(c1, c2)) {
              if (c1.radius > c2.radius + 2) {
                c1.radius += c2.radius * 0.2;
                respawnCell(c2);
              } else if (c2.radius > c1.radius + 2) {
                c2.radius += c1.radius * 0.2;
                respawnCell(c1);
              }
            }
          });
        });
      }
    }
  
    // Обновим score (сумма радиусов)
    state.players.forEach(p => {
      let total = 0;
      p.cells.forEach(c => total += c.radius);
      p.score = Math.floor(total);
    });
  }
  
  // Вспомогательные функции (аналогичные серверу)
  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  function circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    return dist < (a.radius + b.radius);
  }
  
  function respawnCell(cell) {
    cell.x = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
    cell.y = Math.random() * BOT_MAP_SIZE - BOT_MAP_SIZE/2;
    cell.radius = 20;
  }
  
  function constrainCell(cell) {
    const r = cell.radius;
    if (cell.x < -BOT_MAP_SIZE/2 + r) cell.x = -BOT_MAP_SIZE/2 + r;
    if (cell.x >  BOT_MAP_SIZE/2 - r) cell.x =  BOT_MAP_SIZE/2 - r;
    if (cell.y < -BOT_MAP_SIZE/2 + r) cell.y = -BOT_MAP_SIZE/2 + r;
    if (cell.y >  BOT_MAP_SIZE/2 - r) cell.y =  BOT_MAP_SIZE/2 - r;
  }
  