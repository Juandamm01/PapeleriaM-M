document.addEventListener("DOMContentLoaded", function () {
    const nombreElemento = document.getElementById('nombre');
    const usuarioElemento = document.getElementById('usuario');
    const telefonoElemento = document.getElementById('telefono');
    const emailElemento = document.getElementById('email');
    const contrasenaElemento = document.getElementById('contrasena');
    const imagenPerfil = document.getElementById('imagenPerfil');
    const inputFotoPerfil = document.getElementById('fotoPerfil');

    //Obtenemos el ID del usuario desde localStorage
    const id_usuario = localStorage.getItem("id_usuario");


    if (!id_usuario) {
        alert("No se encontró información del usuario. Por favor, inicia sesión.");
        window.location.href = "login.html";
        return;
    }

    fetch(`http://localhost:3000/api/micuenta/${id_usuario}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.nombre) {
                nombreElemento.textContent = data.nombre;
                usuarioElemento.textContent = data.usuario;
                telefonoElemento.textContent = data.telefono;
                emailElemento.textContent = data.email;
                contrasenaElemento.textContent = data.contraseña;

                if (data.foto_url) {
                    imagenPerfil.src = data.foto_url;
                }
            } else {
                alert('No se pudo obtener la información del usuario');
            }
        })
        .catch(error => {
            console.error('Error al obtener los datos:', error);
            alert('Hubo un problema al obtener los datos');
        });

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            localStorage.removeItem("id_usuario");
            window.location.href = "login.html";
        });
    }

    if (inputFotoPerfil) {
        inputFotoPerfil.addEventListener('change', function (event) {
            const archivo = event.target.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = function (e) {
                    imagenPerfil.src = e.target.result;
                };
                lector.readAsDataURL(archivo);
            }
        });
    }
});
