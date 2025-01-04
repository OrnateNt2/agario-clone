// Игровое хранилище
const MAP_SIZE = 2000; // от -1000 до +1000 по обеим осям
const MIN_FOOD_COUNT = 100;
const MAX_FOOD_COUNT = 300;

const players = {}; // { socketId: { cells: [ { x, y, radius }, ... ], username, color }, ... }
let foods = [];

// Генерация случайного цвета
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Генерация еды
function generateFoods(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: "food-" + Math.random().toString(36).substr(2, 9),
      x: Math.random() * MAP_SIZE - MAP_SIZE / 2,
      y: Math.random() * MAP_SIZE - MAP_SIZE / 2,
      radius: 5,
      color: "#FF4500"
    });
  }
  return arr;
}

// Инициализируем
foods = generateFoods(MIN_FOOD_COUNT);

// Новый игрок
function handleNewPlayer(socket, { username, isBot = false }) {
  // Для упрощения: игрок имеет массив «ячеек» (cells). 
  // Изначально это одна ячейка.
  players[socket.id] = {
    username,
    color: getRandomColor(),
    cells: [
      {
        x: Math.random() * MAP_SIZE - MAP_SIZE / 2,
        y: Math.random() * MAP_SIZE - MAP_SIZE / 2,
        radius: 20
      }
    ],
    isBot
  };
}

// Обновление: движение и коллизии
function handlePlayerUpdate(socket, data) {
  const player = players[socket.id];
  if (!player) return;

  // data: [{ x, y }, ...] для каждой ячейки или упрощённо одна позиция?
  // Здесь предполагается, что клиент присылает только позицию первой ячейки (упрощение)
  // или массив позиций, если несколько ячеек.  
  // Для демонстрации возьмём массив позиций:
  const positions = data.positions || [];
  if (positions.length === player.cells.length) {
    for (let i = 0; i < positions.length; i++) {
      const cell = player.cells[i];
      const newPos = positions[i];

      // Учёт границ карты:
      let nx = newPos.x;
      let ny = newPos.y;
      const r = cell.radius;

      if (nx < -MAP_SIZE/2 + r) nx = -MAP_SIZE/2 + r;
      if (nx >  MAP_SIZE/2 - r) nx =  MAP_SIZE/2 - r;
      if (ny < -MAP_SIZE/2 + r) ny = -MAP_SIZE/2 + r;
      if (ny >  MAP_SIZE/2 - r) ny =  MAP_SIZE/2 - r;

      cell.x = nx;
      cell.y = ny;
    }
  }

  // Проверяем столкновения (еда -> игрок)
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    for (let cell of player.cells) {
      if (circleCollision(cell, food)) {
        // Съедаем еду
        cell.radius += 0.5; 
        foods.splice(i, 1);
        break;
      }
    }
  }

  // Если еды стало мало, генерируем ещё
  if (foods.length < MIN_FOOD_COUNT) {
    foods = foods.concat(generateFoods(MIN_FOOD_COUNT - foods.length));
  } else if (foods.length < MAX_FOOD_COUNT && Math.random() < 0.01) {
    // Немного докидываем еду время от времени
    foods.push(...generateFoods(5));
  }

  // Проверяем столкновения (игрок -> игрок)
  for (const otherId in players) {
    if (otherId === socket.id) continue;

    const otherPlayer = players[otherId];
    for (let cell of player.cells) {
      for (let otherCell of otherPlayer.cells) {
        if (circleCollision(cell, otherCell)) {
          // Тот, у кого радиус больше, съедает меньшего
          if (cell.radius > otherCell.radius + 2) {
            cell.radius += otherCell.radius * 0.2;
            respawnCell(otherCell);
          } else if (otherCell.radius > cell.radius + 2) {
            otherCell.radius += cell.radius * 0.2;
            respawnCell(cell);
          }
        }
      }
    }
  }
}

// Деление игрока (split) — по нажатию пробела
function splitPlayer(socket) {
  const player = players[socket.id];
  if (!player) return;

  // Каждую ячейку (которая достаточно большая) делим пополам
  // Упрощённо: если радиус > 30, делим
  // В реальном Agar.io там хитрее: можно несколько ячеек.
  // Здесь сделаем простую механику: одна ячейка превращается в две.
  const newCells = [];
  for (let cell of player.cells) {
    if (cell.radius > 30) {
      const newRadius = cell.radius / 1.4142; // sqrt(2) делаем
      cell.radius = newRadius;
      // Вторая «отщепившаяся» летит в направлении курсора, 
      // но у нас нет точного угла на сервере. Упростим: рандом
      const angle = Math.random() * 2 * Math.PI;
      const offset = cell.radius * 2;

      const newCell = {
        x: cell.x + Math.cos(angle) * offset,
        y: cell.y + Math.sin(angle) * offset,
        radius: newRadius
      };
      newCells.push(newCell);
    }
  }
  player.cells.push(...newCells);
}

// Кормление (W)
function feed(socket) {
  const player = players[socket.id];
  if (!player) return;

  // С каждой ячейки чуть убираем массу и создаём «шарик»
  // Снаряд вылетает вперёд, у нас нет угла мыши на сервере, упрощаем рандомом
  for (let cell of player.cells) {
    if (cell.radius > 15) {
      cell.radius -= 1; // небольшая потеря массы
      const angle = Math.random() * 2 * Math.PI;
      // Создаём еду размером 8, которая полетит
      // В реальном Agar.io «корм» летит немного вперёд, 
      // здесь можем просто спавнить рядом (упрощённо).
      const newFood = {
        id: "food-" + Math.random().toString(36).substr(2, 9),
        x: cell.x + Math.cos(angle) * cell.radius,
        y: cell.y + Math.sin(angle) * cell.radius,
        radius: 8,
        color: "#FF4500"
      };
      foods.push(newFood);
    }
  }
}

// При отключении
function handleDisconnection(socket) {
  delete players[socket.id];
}

// Получить текущее состояние (для передачи клиентам)
function getGameState() {
  const allPlayers = [];
  for (let id in players) {
    const pl = players[id];
    // Подсчитаем суммарную массу (примерно pi*r^2, 
    // но для упрощения будем считать просто сумму r)
    let totalScore = 0;
    for (let c of pl.cells) {
      totalScore += c.radius;
    }
    allPlayers.push({
      id,
      username: pl.username,
      color: pl.color,
      cells: pl.cells,
      score: Math.floor(totalScore)
    });
  }
  return {
    players: allPlayers,
    foods: foods
  };
}

// Респавн (если кого-то съели)
function respawnCell(cell) {
  cell.x = Math.random() * MAP_SIZE - MAP_SIZE / 2;
  cell.y = Math.random() * MAP_SIZE - MAP_SIZE / 2;
  cell.radius = 20;
}

// Проверка столкновения двух кругов
function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  return dist < (a.radius + b.radius);
}

module.exports = {
  handleNewPlayer,
  handlePlayerUpdate,
  handleDisconnection,
  getGameState,
  splitPlayer,
  feed
};
