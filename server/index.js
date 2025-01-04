const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const { handleNewPlayer, handlePlayerUpdate, handleDisconnection } = require("./gameLogic");
const { registerUser, loginUser, users } = require("./users");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

app.use(cors());
app.use(express.json()); // для разбора JSON в теле запросов

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

    // Обработка события - новый игрок вошёл в игру
    socket.on("newPlayer", (data) => {
        handleNewPlayer(socket, data);
    });

    // Обработка события - обновление состояния игрока (позиция, скорость и т.д.)
    socket.on("playerUpdate", (data) => {
        handlePlayerUpdate(socket, data);
    });

    // Отключение
    socket.on("disconnect", () => {
        handleDisconnection(socket);
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
