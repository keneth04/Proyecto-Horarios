const express = require('express');

const { UsersController } = require('./controller');

const router = express.Router();

module.exports.UsersAPI = (app) => {
    router 
        .get('/',UsersController.getUsers)
        .get('/:id',UsersController.getUser)
        .post('/',UsersController.createUser)
        .patch('/:id', UsersController.updateUser)
        .delete('/:id', UsersController.deleteUser)
        
    app.use('/api/users', router);
};