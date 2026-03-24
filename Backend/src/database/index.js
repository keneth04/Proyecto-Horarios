const { MongoClient } = require('mongodb');
const { Config } = require('../config');
const { Logger } = require('../common/logger');

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
  },
  {
    collection: 'turnos_tipo',
    key: { code: 1, status: 1 },
    options: { name: 'idx_turnos_tipo_code_status' }
  }
];

const getConnection = async () => {
  if (!connection) {
    client = new MongoClient(Config.mongoUri);
    await client.connect();
    connection = client.db(Config.mongoDbname);
    Logger.info('mongo_connected', {
      database: Config.mongoDbname
    });
  }

  return connection;
};

module.exports.Database = async (collection) => {
  try {
    const db = await getConnection();
    return db.collection(collection);
  } catch (error) {
    Logger.error('mongo_connection_failed', {
      collection,
      error: Logger.toErrorObject(error)
    });
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
    Logger.info('mongo_indexes_ensured', {
      totalIndexes: CRITICAL_INDEXES.length
    });
  } catch (error) {
    Logger.error('mongo_indexes_failed', {
      error: Logger.toErrorObject(error)
    });
    throw error;
  }
};
