const express = require("express");
const cors = require("cors");
const { connexion } = require('./database.js');
const bcrypt = require("bcryptjs");

const app = express();
const puerto = 3000;


// Servir archivos estáticos desde la carpeta 'html'
app.use(express.static('HTML'));
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



app.post("/usuarios", async (req, res) => {
  const { nombre, telefono, email, usuario, contraseña } = req.body;

  try {
    // Generar hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contraseña, salt);

    // Guardar en la base de datos la contraseña hasheada
    const query = "INSERT INTO usuarios (nombre, telefono, email, usuario, contraseña) VALUES (?, ?, ?, ?, ?)";
    connexion.query(query, [nombre, telefono, email, usuario, hash], (err, resultado) => {
      if (err) {
        console.error("Error al insertar usuario:", err);
        return res.status(500).send("Error al registrar usuario");
      }
      res.send("Usuario registrado exitosamente");
    });
  } catch (err) {
    console.error("Error al hashear la contraseña:", err);
    res.status(500).send("Error al procesar la contraseña");
  }
});


// Ruta para iniciar sesión
app.post("/login", (req, res) => {
  const { usuario, contraseña } = req.body;

  const query = "SELECT * FROM usuarios WHERE usuario = ?";
  connexion.query(query, [usuario], async (err, resultado) => {
    if (err) {
      console.error("Error en el servidor:", err);
      return res.status(500).json({ ok: false, mensaje: "Error en servidor" });
    }

    if (resultado.length > 0) {
      const usuarioEncontrado = resultado[0];

      const coincide = await bcrypt.compare(contraseña, usuarioEncontrado.contraseña);
      if (coincide) {
        console.log("Inicio de sesión exitoso:", usuarioEncontrado);
        res.json({
          ok: true,
          mensaje: "Inicio de sesión exitoso",
          id_usuario: usuarioEncontrado.id_usuario,
        });
      } else {
        res.json({ ok: false, mensaje: "Contraseña incorrecta" });
      }
    } else {
      res.json({ ok: false, mensaje: "Usuario no encontrado" });
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
  const id_usuario = req.params.id_usuario;  
  const query = "SELECT * FROM reseñas WHERE id_usuario = ?";

  connexion.query(query, [id_usuario], (err, resultado) => {
    if (err) {
      console.error("Error al obtener las reseñas:", err);
      return res.status(500).json({ error: "Error en el servidor" });
    }

    if (resultado.length > 0) {
      res.json(resultado);  
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


// Ruta para registrar impresiones
app.post("/registrar-impresion", (req, res) => {
  const { id_usuario, tipo_impresion, cantidad, precio } = req.body;

  // Validación básica de los datos
  if (!id_usuario || !tipo_impresion || !cantidad || !precio) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  // Llamar al procedimiento almacenado para registrar la impresión
  const query = "CALL registrar_impresion(?, ?, ?, ?)";

  connexion.query(query, [id_usuario, tipo_impresion, cantidad, precio], (err, resultado) => {
    if (err) {
      console.error("Error al registrar impresión:", err);
      return res.status(500).json({ mensaje: "Error al registrar impresión" });
    }

    // Enviar mensaje de éxito
    res.status(200).json({ mensaje: "Impresión registrada con éxito" });
  });
});

// Ruta para eliminar una cuenta
app.delete('/api/eliminar-cuenta/:id_usuario', (req, res) => {
  const id_usuario = req.params.id_usuario;

  const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';

  connexion.query(sql, [id_usuario], (err, resultado) => {
      if (err) {
          console.error("Error al eliminar cuenta:", err);
          res.status(500).send("Error al eliminar la cuenta");
      } else {
          res.send("Cuenta eliminada con éxito");
      }
  });
});


app.put("/api/actualizar/:id", (req, res) => {
  const id = req.params.id;
  const { nombre, telefono, email, usuario, contraseña } = req.body;

  if (!nombre || !telefono || !email || !usuario || !contraseña) {
      return res.status(400).json({ mensaje: "Faltan datos para actualizar" });
  }

  const query = `
      UPDATE usuarios 
      SET nombre = ?, telefono = ?, email = ?, usuario = ?, contraseña = ?
      WHERE id_usuario = ?
  `;

  connexion.query(query, [nombre, telefono, email, usuario, contraseña, id], (err, resultado) => {
      if (err) {
          console.error("Error al actualizar los datos del usuario:", err);
          return res.status(500).json({ mensaje: "Error al actualizar los datos del usuario" });
      }

      if (resultado.affectedRows > 0) {
          res.json({ mensaje: "Datos del usuario actualizados con éxito" });
      } else {
          res.status(404).json({ mensaje: "Usuario no encontrado" });
      }
  });
});



app.listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
