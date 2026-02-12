const express = require('express');
const debug = require('debug')('app:main');

const { Config } = require('./src/config');
const { HorariosAPI } = require('./src/Horarios');
const { UsersAPI } = require('./src/users');
const { AuthAPI } = require('./src/auth');
const { ErrorMiddleware } = require('./src/middlewares/errorMiddleware');

const app = express();

app.use(express.json());

HorariosAPI(app);
UsersAPI(app);
AuthAPI(app);

// 🔥 Middleware global de errores (SIEMPRE AL FINAL)
app.use(ErrorMiddleware);

app.listen(Config.port, () => {
  debug(`Servidor corriendo en el puerto: ${Config.port}`);
});
