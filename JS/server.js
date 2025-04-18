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
    res.send("Usuario registrado exitosamente");
  });
});

// Ruta para iniciar sesión
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

// Ruta para guardar preguntas
app.post("/guardar-pregunta", (req, res) => {
  const { id_usuario, texto_pregunta } = req.body;

  if (!id_usuario || !texto_pregunta) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  const query = "INSERT INTO preguntas (id_usuario, texto_pregunta) VALUES (?, ?)";
  connexion.query(query, [id_usuario, texto_pregunta], (err, resultado) => {
    if (err) {
      console.error("Error al guardar la pregunta:", err);
      return res.status(500).json({ mensaje: "Error al guardar la pregunta" });
    }

    res.status(200).json({ mensaje: "Pregunta guardada con éxito" });
  });
});

// Ruta para obtener todas las preguntas de un usuario
app.get("/preguntas/:id_usuario", (req, res) => {
  const id_usuario = req.params.id_usuario;
  const query = "SELECT * FROM preguntas WHERE id_usuario = ?";

  connexion.query(query, [id_usuario], (err, resultado) => {
    if (err) {
      console.error("Error al obtener preguntas:", err);
      return res.status(500).json({ error: "Error en el servidor" });
    }

    if (resultado.length > 0) {
      res.json(resultado);
    } else {
      res.status(404).json({ error: "No se encontraron preguntas para este usuario" });
    }
  });
});


// Ruta para obtener las reseñas de un usuario específico
app.get("/reseñas/:id_usuario", (req, res) => {
  const id_usuario = req.params.id_usuario;  // El id_usuario se obtiene dinámicamente de la URL
  const query = "SELECT * FROM reseñas WHERE id_usuario = ?";

  connexion.query(query, [id_usuario], (err, resultado) => {
    if (err) {
      console.error("Error al obtener las reseñas:", err);
      return res.status(500).json({ error: "Error en el servidor" });
    }

    if (resultado.length > 0) {
      res.json(resultado);  // Devolvemos las reseñas de ese usuario
    } else {
      res.status(404).json({ error: "No se encontraron reseñas para este usuario" });
    }
  });
});

// Ruta para guardar una nueva reseña
app.post("/guardar-resena", (req, res) => {
  const { id_usuario, reseña } = req.body;  // El id_usuario se recibe en el cuerpo de la solicitud

  if (!id_usuario || !reseña) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  const query = "INSERT INTO reseñas (id_usuario, texto_respuesta) VALUES (?, ?)";
  connexion.query(query, [id_usuario, reseña], (err, resultado) => {
    if (err) {
      console.error("Error al guardar la reseña:", err);
      return res.status(500).json({ mensaje: "Error al guardar la reseña" });
    }

    res.status(200).json({ mensaje: "Reseña guardada con éxito" });
  });
});

app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
