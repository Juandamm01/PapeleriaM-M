document.addEventListener("DOMContentLoaded", async () => {
  // Cargar preguntas desde el servidor
  await cargarPreguntas();

  // Agregar pregunta
  document.getElementById("enviar").addEventListener("click", async () => {
    const texto = document.getElementById("pregunta").value.trim();
    const id_usuario = localStorage.getItem("id_usuario");

    if (!id_usuario) {
      alert("Debes iniciar sesión para enviar una pregunta.");
      return;
    }

    if (texto !== "") {
      try {
        const respuesta = await fetch("http://localhost:3000/guardar-pregunta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id_usuario: id_usuario, texto_pregunta: texto })
        });

        if (respuesta.ok) {
          alert("Pregunta enviada!");
          document.getElementById("pregunta").value = "";  // Limpiar el campo de texto
          cargarPreguntas();  // Recargar preguntas después de agregar una nueva
        } else {
          alert("Error al enviar la pregunta.");
        }
      } catch (error) {
        console.error("Error al hacer la solicitud:", error);
        alert("Hubo un problema con la solicitud.");
      }
    } else {
      alert("Por favor escribe una pregunta.");
    }
  });
});

// Función para cargar las preguntas
async function cargarPreguntas() {
  const contenedorPreguntas = document.getElementById("contenedorPreguntas");
  contenedorPreguntas.innerHTML = "";  // Limpiar preguntas previas

  try {
    const respuesta = await fetch("http://localhost:3000/preguntas");  // Reemplaza 1 con el id_usuario si es necesario
    const preguntas = await respuesta.json();

    preguntas.forEach(pregunta => {
      const divPregunta = document.createElement("div");
      divPregunta.classList.add("pregunta");
      divPregunta.innerHTML = `
        <p><strong>${pregunta.texto_pregunta}</strong></p>
        <button onclick="borrarPregunta('${pregunta.texto_pregunta}')">Borrar</button>
        <button onclick="verRespuestas('${pregunta.texto_pregunta}')">Ver Respuestas</button>
      `;
      contenedorPreguntas.appendChild(divPregunta);
    });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
  }
}
