/**
 * AUTH CONTROLLER
 * ----------------
 * Recibe requests HTTP
 * Llama al service
 * Devuelve respuestas HTTP
 */

const debug = require('debug')('app:auth-controller');
const { AuthService } = require('./services');
const { Response } = require('../common/response');

module.exports.AuthController = {

  login: async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body);
      Response.success(res, 200, 'Login exitoso', result);
    } catch (error) {
  next(error);
    }
  }
}; 
