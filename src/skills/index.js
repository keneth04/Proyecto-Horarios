const express = require('express');
const { SkillsController } = require('./controller');
const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware');

const router = express.Router();

module.exports.SkillsAPI = (app) => {

    /**
     * 🔐 Protección global del módulo
     * Todo requiere autenticación + rol admin
     */
    router.use(AuthMiddleware);
    router.use(RoleMiddleware(['admin']));

    // Crear skill
    router.post('/', SkillsController.createSkill);

    // Obtener todas las skills
    router.get('/', SkillsController.getSkills);

    // Obtener skill por id
    router.get('/:id', SkillsController.getSkill);

    // Actualizar skill
    router.patch('/:id', SkillsController.updateSkill);

    // Activar / Desactivar
    router.patch('/:id/status', SkillsController.changeStatus);

    app.use('/api/skills', router);
};
