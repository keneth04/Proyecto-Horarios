const express = require('express');
const { HorariosController } = require('./controller');

const router = express.Router();

module.exports.HorariosAPI = (app) => {
  router
    .get('/', HorariosController.getHorarios)
    .get('/:id', HorariosController.getHorario)
    .post('/', HorariosController.createHorario)
    .patch('/:id', HorariosController.updateHorario)
    .delete('/:id', HorariosController.deleteHorario);

  app.use('/api/horarios', router);
};
