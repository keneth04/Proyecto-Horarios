const { MongoClient } = require('mongodb');
const debug = require('debug')('app:database');
const { Config } = require('../config');

let connection = null;
let client = null;
let indexesInitialized = false;

const CRITICAL_INDEXES = [
  {
    collection: 'users',
    key: { email: 1 },
    options: { name: 'idx_users_email' }
  },
  {
    collection: 'horarios',
    key: { userId: 1, date: 1, status: 1 },
    options: { name: 'idx_horarios_user_date_status' }
  },
  {
    collection: 'horarios',
    key: { date: 1, status: 1 },
    options: { name: 'idx_horarios_date_status' }
  },
  {
    collection: 'skills',
    key: { type: 1, status: 1 },
    options: { name: 'idx_skills_type_status' }
  }
];

const getConnection = async () => {
  if (!connection) {
    client = new MongoClient(Config.mongoUri);
    await client.connect();
    connection = client.db(Config.mongoDbname);
    debug('Nueva conexión establecida con MongoDB');
  } else {
    debug('Reutilizando conexión existente');
  }

  return connection;
};

module.exports.Database = async (collection) => {
  try {
    const db = await getConnection();
    return db.collection(collection);

  } catch (error) {
    debug('Error conectando a Mongo:', error);
    throw error;
  }
};

module.exports.ensureMongoIndexes = async () => {
  if (indexesInitialized) {
    return;
  }

  try {
    const db = await getConnection();

    for (const index of CRITICAL_INDEXES) {
      const collection = db.collection(index.collection);
      await collection.createIndex(index.key, index.options);
    }

    indexesInitialized = true;
    debug('Índices críticos asegurados correctamente');
  } catch (error) {
    debug('Error creando índices críticos:', error);
    throw error;
  }
};
