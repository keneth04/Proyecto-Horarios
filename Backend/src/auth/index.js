/**
 * AUTH ROUTES
 * ------------
 * Define las rutas del módulo auth
 */
const express = require('express');
const { AuthController } = require('./controller');

const router = express.Router();

module.exports.AuthAPI = (app) => {
  router
    .post('/login', AuthController.login)
    .post('/forgot-password', AuthController.forgotPassword)
    .post('/reset-password', AuthController.resetPassword);

  app.use('/api/auth', router);
};

