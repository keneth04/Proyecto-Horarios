const {MongoClient} = require('mongodb');
const debug = require('debug')('app: module-database');

const { Config } = require('../config');

let connection = null;

module.exports.Database = (collection) => new Promise(async(resolve , reject) => {
try {
    if (!connection) {
        const cliente = new MongoClient(Config.mongoUri);
        connection = await cliente.connect();
        debug('Nueva conexion realizada con MongoDB Atlas')
    } else {
        debug('Reutilizando conexion');
        const db = connection.db(Config.mongoDbname);
        resolve(db.collection(collection));
        
    }
    
} catch (error) {
    reject(error);
}
});