// Aqui estara el inicio de nuestro servidor y el consumo de modulos del src

const express = require('express');
const debug = require('debug')('app:main');

const {Config} = require('./src/config/index');  // llamamos el Config de module.exports desde la carpeta config
const { HorariosAPI } = require('./src/Horarios');  // importamos las rutas del modulo  products
const { UsersAPI } = require('./src/users');
const { AuthAPI } = require('./src/auth');
const app = express();

app.use(express.json()); //dar la capacidad de recibir datos en el request

HorariosAPI(app);
UsersAPI(app);
AuthAPI(app);


// Modulos

app.listen(Config.port, () => {
    debug(`servidor corriendo en el puerto: ${Config.port}`);
})