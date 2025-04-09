const express = require('express');
const cors = require('cors');
const database = require('./database.js'); // <-- usa require, no import


const { connexion } = database;  // Accede a `connexion`

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Ruta para insertar un dato
app.post("/usuarios", (req, res) => {
    const { nombre, telefono, email } = req.body;

    connexion.query(
        "INSERT INTO usuarios (nombre, telefono, email) VALUES (?, ?, ?)", 
        [nombre, telefono, email], 
        (err, resultado) => {
            if (err) throw err;
            res.send("Usuario agregado");
        }
    );
});

app.get("/usuarios", (req, res) => {
    connexion.query("SELECT * FROM usuarios", (err, resultado) => {
        if (err) throw err;
        res.json(resultado);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
