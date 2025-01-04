const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { 
  handleNewPlayer, 
  handlePlayerUpdate, 
  handleDisconnection, 
  getGameState, 
  splitPlayer,
  feed 
} = require("./gameLogic");

const { registerUser, loginUser } = require("./users");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors());
app.use(express.json());

// Эндпоинты для регистрации и логина
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const result = registerUser(username, password);
  if (result.success) {
    res.json({ success: true, message: "Регистрация прошла успешно" });
  } else {
    res.json({ success: false, message: result.message });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const result = loginUser(username, password);
  if (result.success) {
    res.json({ success: true, message: "Логин успешен" });
  } else {
    res.json({ success: false, message: result.message });
  }
});

// Подключаем Socket.io
io.on("connection", (socket) => {
  console.log("Новое подключение:", socket.id);

  // Новый игрок
  socket.on("newPlayer", (data) => {
    handleNewPlayer(socket, data);
    broadcastState(); 
  });

  // Обновление состояния игрока
  socket.on("playerUpdate", (data) => {
    handlePlayerUpdate(socket, data);
    broadcastState();
  });

  // Деление
  socket.on("split", () => {
    splitPlayer(socket);
    broadcastState();
  });

  // Кормление
  socket.on("feed", () => {
    feed(socket);
    broadcastState();
  });

  // Отключение
  socket.on("disconnect", () => {
    handleDisconnection(socket);
    broadcastState();
  });

  // Посылка текущего состояния (можно вызывать по таймеру или при изменениях)
  function broadcastState() {
    const state = getGameState();
    io.emit("gameState", state);
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
