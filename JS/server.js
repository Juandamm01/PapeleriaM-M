const express = require("express");
const cors = require("cors");
const { connexion } = require('./database.js');

const app = express();
const puerto = 3000;

app.use(cors());
app.use(express.json());

// Ruta para obtener datos del usuario por ID dinámico
app.get("/api/micuenta/:id", (req, res) => {
  const id = req.params.id;
  const query = "SELECT * FROM usuarios WHERE id_usuario = ?";

  connexion.query(query, [id], (err, resultado) => {
    if (err) {
      console.error("Error al obtener datos del usuario:", err);
      return res.status(500).json({ error: "Error en el servidor" });
    }

    if (resultado.length > 0) {
      res.json(resultado[0]);
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });
});

// Ruta para registrar usuarios
app.post("/usuarios", (req, res) => {
  const { nombre, telefono, email, usuario, contraseña } = req.body;

  const query = "INSERT INTO usuarios (nombre, telefono, email, usuario, contraseña) VALUES (?, ?, ?, ?, ?)";
  connexion.query(query, [nombre, telefono, email, usuario, contraseña], (err, resultado) => {
    if (err) {
      console.error("Error al insertar usuario:", err);
      return res.status(500).send("Error al registrar usuario");
    }
    res.send("✅ Usuario registrado exitosamente");
  });
});

//Ruta para iniciar sesión
app.post("/login", (req, res) => {
  const { usuario, contraseña } = req.body;

  const query = "SELECT * FROM usuarios WHERE usuario = ? AND contraseña = ?";
  connexion.query(query, [usuario, contraseña], (err, resultado) => {
    if (err) {
      console.error("Error en el servidor:", err);
      return res.status(500).json({ ok: false, mensaje: "Error en servidor" });
    }

    if (resultado.length > 0) {
      console.log("Inicio de sesión exitoso:", resultado[0]);
      // Enviamos el ID también
      res.json({
        ok: true,
        mensaje: "Inicio de sesión exitoso",
        id_usuario: resultado[0].id_usuario,
      });
    } else {
      console.log("Usuario o contraseña incorrectos");
      res.json({ ok: false, mensaje: "Usuario o contraseña incorrectos" });
    }
  });
});

app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
