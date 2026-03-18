const express = require('express');
const debug = require('debug')('app:main');

const { Config, validateCriticalConfig } = require('./src/config');
const { HorariosAPI } = require('./src/Horarios');
const { UsersAPI } = require('./src/users');
const { AuthAPI } = require('./src/auth');
const { ErrorMiddleware } = require('./src/middlewares/errorMiddleware');
const { SkillsAPI } = require('./src/skills');
const { SecurityMiddlewares } = require('./src/middlewares/securityMiddleware');

const app = express();

validateCriticalConfig();

const securityMiddlewares = SecurityMiddlewares({
  allowedOrigins: Config.http.corsAllowedOrigins,
  jsonLimit: Config.http.jsonLimit
});

app.use(securityMiddlewares.helmet);
app.use(securityMiddlewares.cors);
app.use(securityMiddlewares.jsonParser);

HorariosAPI(app);
UsersAPI(app);
AuthAPI(app);
SkillsAPI(app);

// 🔥 Middleware global de errores (SIEMPRE AL FINAL)
app.use(ErrorMiddleware);

app.listen(Config.port, () => {
  debug(`Servidor corriendo en el puerto: ${Config.port}`);
});
