// database.js
const mysql = require("mysql2");
require('dotenv').config(); 

const connexion = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
// Conectarse
connexion.connect(err => {
    if (err) throw err;
    console.log("Conexión a la base de datos MYSQL exitosa");
});

// Exportar la conexión
module.exports = { connexion };
