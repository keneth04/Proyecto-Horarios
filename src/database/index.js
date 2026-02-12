const { MongoClient } = require('mongodb');
const debug = require('debug')('app:database');
const { Config } = require('../config');

let connection = null;
let client = null;

module.exports.Database = async (collection) => {
  try {
    if (!connection) {
      client = new MongoClient(Config.mongoUri);
      await client.connect();
      connection = client.db(Config.mongoDbname);
      debug('Nueva conexión establecida con MongoDB');
    } else {
      debug('Reutilizando conexión existente');
    }

    return connection.collection(collection);

  } catch (error) {
    debug('Error conectando a Mongo:', error);
    throw error;
  }
};
