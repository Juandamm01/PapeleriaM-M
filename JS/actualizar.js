document.addEventListener("DOMContentLoaded", function () {
    const nombreElemento = document.getElementById('nombreInput');
    const usuarioElemento = document.getElementById('usuarioInput');
    const telefonoElemento = document.getElementById('telefonoInput');
    const emailElemento = document.getElementById('emailInput');
    const contrasenaElemento = document.getElementById('contrasenaInput');
    const formActualizar = document.getElementById('formActualizar');
    
    const id_usuario = localStorage.getItem("id_usuario");

    if (!id_usuario) {
        alert("No se encontró información del usuario. Por favor, inicia sesión.");
        window.location.href = "login.html";
        return;
    }

    // Mostrar datos del usuario
    fetch(`http://localhost:3000/api/micuenta/${id_usuario}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.nombre) {
                nombreElemento.value = data.nombre;
                usuarioElemento.value = data.usuario;
                telefonoElemento.value = data.telefono;
                emailElemento.value = data.email;
                contrasenaElemento.value = data.contraseña;
            } else {
                alert('No se pudo obtener la información del usuario');
            }
        })
        .catch(error => {
            console.error('Error al obtener los datos:', error);
            alert('Hubo un problema al obtener los datos');
        });

    // Actualizar datos
    formActualizar.addEventListener("submit", function (event) {
        event.preventDefault(); // Evitar que el formulario se envíe normalmente

        const datosActualizados = {
            nombre: nombreElemento.value,
            usuario: usuarioElemento.value,
            telefono: telefonoElemento.value,
            email: emailElemento.value,
            contraseña: contrasenaElemento.value
        };

        fetch(`http://localhost:3000/api/actualizar/${id_usuario}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosActualizados)
        })
        .then(response => response.json())
        .then(data => {
            if (data.mensaje) {
                alert(data.mensaje);  
                window.location.href = "actualizar.html";

            } else {
                alert("Hubo un error al actualizar los datos.");
            }
        })
        .catch(error => {
            console.error("Error al actualizar los datos:", error);
            alert("Hubo un error al actualizar los datos.");
        });
    });
});
