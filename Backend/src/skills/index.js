const express = require('express');
const { SkillsController } = require('./controller');
const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

module.exports.SkillsAPI = (app) => {
  /**
   * 🔐 Protección global del módulo
   * Todo requiere autenticación + rol admin
   */
  router.use(AuthMiddleware);
  router.use(RoleMiddleware(['admin']));

  router.post('/', SkillsController.createSkill);
  router.get('/', SkillsController.getSkills);
  router.get('/:id', SkillsController.getSkill);
  router.patch('/:id', SkillsController.updateSkill);
  router.patch('/:id/status', SkillsController.changeStatus);

  app.use('/api/skills', router);
};