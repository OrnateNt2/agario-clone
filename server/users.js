// Примитивное хранение юзеров в памяти
const users = {};

function registerUser(username, password) {
    if (!username || !password) {
        return { success: false, message: "Необходимо указать имя пользователя и пароль" };
    }
    if (users[username]) {
        return { success: false, message: "Пользователь с таким именем уже существует" };
    }
    users[username] = { password };
    return { success: true };
}

function loginUser(username, password) {
    if (!username || !password) {
        return { success: false, message: "Необходимо указать имя пользователя и пароль" };
    }
    if (!users[username]) {
        return { success: false, message: "Пользователь не найден" };
    }
    if (users[username].password !== password) {
        return { success: false, message: "Неверный пароль" };
    }
    return { success: true };
}

module.exports = {
    users,
    registerUser,
    loginUser
};
