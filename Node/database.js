// database.js
const mysql = require("mysql2");

// Crear la conexión
const connexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Jdmm10__",
    database: "UsuariosProgramacionWeb"
});

// Conectarse
connexion.connect(err => {
    if (err) throw err;
    console.log("Conexión a la base de datos MYSQL exitosa");
});

// Exportar la conexión
module.exports = { connexion };
