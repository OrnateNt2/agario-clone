// Хранилище игровых объектов (players, еда и т.д.)
// В реальном продакшене стоит вынести это в базу данных или Redis
const players = {};
let foods = [];

// Генерируем "еду" на карте
function generateFoods(count, mapSize) {
    const foodArr = [];
    for (let i = 0; i < count; i++) {
        foodArr.push({
            id: "food-" + i,
            x: Math.random() * mapSize - mapSize / 2,
            y: Math.random() * mapSize - mapSize / 2,
            radius: 5,
            color: "#FF4500"
        });
    }
    return foodArr;
}

// Инициализируем начальную еду (пример: 100 штук, карта 2000x2000)
foods = generateFoods(100, 2000);

// Когда новый игрок заходит
function handleNewPlayer(socket, { username }) {
    // Задаём начальные координаты и размер
    players[socket.id] = {
        id: socket.id,
        username: username,
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        radius: 20,
        color: getRandomColor()
    };

    // Сообщаем всем об обновлённом списке игроков
    broadcastGameState(socket);
}

// При обновлении состояния игрока (движение)
function handlePlayerUpdate(socket, data) {
    if (!players[socket.id]) return;

    // Обновляем позицию игрока
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].radius = data.radius || players[socket.id].radius;

    // Проверяем столкновения с едой
    const eatenFoods = [];
    for (let i = 0; i < foods.length; i++) {
        const food = foods[i];
        if (checkCollision(players[socket.id], food)) {
            eatenFoods.push(i);
        }
    }
    // Удаляем съеденную еду и увеличиваем радиус
    if (eatenFoods.length > 0) {
        eatenFoods.sort((a, b) => b - a); 
        eatenFoods.forEach((idx) => {
            foods.splice(idx, 1);
        });
        players[socket.id].radius += eatenFoods.length * 0.5;
    }

    // Проверяем столкновения между игроками (кто съест кого)
    for (let otherId in players) {
        if (otherId !== socket.id) {
            const otherPlayer = players[otherId];
            if (checkCollision(players[socket.id], otherPlayer)) {
                // Тот, у кого радиус больше, "съедает" меньшего
                if (players[socket.id].radius > otherPlayer.radius + 5) {
                    // увеличиваем радиус
                    players[socket.id].radius += otherPlayer.radius * 0.2;
                    // перезапускаем другого игрока
                    respawnPlayer(otherId);
                } else if (otherPlayer.radius > players[socket.id].radius + 5) {
                    otherPlayer.radius += players[socket.id].radius * 0.2;
                    respawnPlayer(socket.id);
                }
            }
        }
    }

    // Если еды мало, снова генерируем
    if (foods.length < 50) {
        foods = foods.concat(generateFoods(50, 2000));
    }

    broadcastGameState(socket);
}

// При отключении
function handleDisconnection(socket) {
    delete players[socket.id];
}

// Рассылаем текущее состояние игры всем клиентам
function broadcastGameState(socket) {
    const state = {
        players: Object.values(players),
        foods: foods
    };
    socket.broadcast.emit("gameState", state);
    socket.emit("gameState", state);
}

// Функция для респавна игрока
function respawnPlayer(playerId) {
    players[playerId].x = Math.random() * 2000 - 1000;
    players[playerId].y = Math.random() * 2000 - 1000;
    players[playerId].radius = 20;
    players[playerId].color = getRandomColor();
}

// Проверка столкновения между двумя кругами
function checkCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
}

// Случайный цвет
function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

module.exports = {
    handleNewPlayer,
    handlePlayerUpdate,
    handleDisconnection
};
