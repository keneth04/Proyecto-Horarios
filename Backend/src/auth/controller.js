/**
 * AUTH CONTROLLER
 * ----------------
 * Recibe requests HTTP
 * Llama al service
 * Devuelve respuestas HTTP
 */

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
  },

  forgotPassword: async (req, res, next) => {
    try {
      await AuthService.forgotPassword(req.body);
      Response.success(
        res,
        200,
        'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña',
        {}
      );
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      await AuthService.resetPassword(req.body);
      Response.success(res, 200, 'Contraseña restablecida correctamente', {});
    } catch (error) {
      next(error);
    }
  }
};
