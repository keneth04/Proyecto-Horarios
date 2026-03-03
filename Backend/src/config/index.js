require('dotenv').config(); //nos va a ayudar a consumir las variables del .env

module.exports.Config = {
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI,
    mongoDbname: process.env.MONGO_DBNAME,
    jwt_secret: process.env.JWT_SECRET,

};