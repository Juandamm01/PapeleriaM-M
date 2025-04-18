document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById('reseña-form');
    const reseñaTexto = document.getElementById('reseña-texto');
    const reseñasLista = document.getElementById('reseñas-lista');

    // Función para cargar las reseñas desde el servidor
    function cargarReseñas() {
        const id_usuario = localStorage.getItem('id_usuario');
        if (!id_usuario) {
            alert('Debes iniciar sesión para ver las reseñas.');
            return;
        }

        fetch(`http://localhost:3000/reseñas/${id_usuario}`)  // Cambié la URL para pasar el id_usuario dinámicamente
            .then(response => response.json())
            .then(reseñas => {
                reseñasLista.innerHTML = ''; // Limpiar la lista de reseñas
                reseñas.forEach(reseña => {
                    const div = document.createElement('div');
                    div.classList.add('reseña-item');
                    div.innerHTML = `
                        <p><strong>Usuario: </strong>${reseña.id_usuario}</p>
                        <p><strong>Fecha: </strong>${new Date(reseña.fecha).toLocaleString()}</p>
                        <p><strong>Reseña: </strong>${reseña.texto_respuesta}</p>
                    `;
                    reseñasLista.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error al cargar las reseñas:', error);
            });
    }

    // Llamada a la función para cargar las reseñas al cargar la página
    cargarReseñas();

    // Función para enviar una nueva reseña
    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const texto = reseñaTexto.value.trim();

        if (texto === '') {
            alert('Por favor, escribe una reseña.');
            return;
        }

        const id_usuario = localStorage.getItem('id_usuario');
        if (!id_usuario) {
            alert('Debes iniciar sesión para dejar una reseña.');
            return;
        }

        const nuevaReseña = {
            id_usuario: id_usuario,
            texto_respuesta: texto
        };

        // Bloquear el formulario para evitar múltiples envíos
        form.querySelector('button[type="submit"]').disabled = true;

        fetch('http://localhost:3000/guardar-resena', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id_usuario: id_usuario,
              reseña: texto
            })
          })
          
        .then(response => response.json())
        .then(data => {
            if (data.mensaje === "Reseña guardada con éxito") {
                alert('Reseña enviada correctamente');
                reseñaTexto.value = ''; // Limpiar el campo de texto
                cargarReseñas(); // Volver a cargar las reseñas
            } else {
                alert('Hubo un problema al enviar la reseña');
            }
        })
        .catch(error => {
            console.error('Error al enviar la reseña:', error);
            alert('Hubo un problema al enviar la reseña');
        })
        .finally(() => {
            // Desbloquear el formulario
            form.querySelector('button[type="submit"]').disabled = false;
        });
    });
});
