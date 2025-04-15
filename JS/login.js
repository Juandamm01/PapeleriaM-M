document.addEventListener("DOMContentLoaded", function () {
    const formulario = document.getElementById("login-form");
    const mensaje = document.getElementById("mensaje");

    const pass = document.getElementById("contraseña");
    const confirm = document.getElementById("confirmar");
    const togglePass = document.getElementById("togglePass");
    const toggleConfirm = document.getElementById("toggleConfirm");

    // Función para mostrar/ocultar contraseña
    function toggleVisibility(input, icon) {
        if (input.type === "password") {
        input.type = "text";
          icon.textContent = "❌"; // Cambia a X cuando está visible
        } else {
        input.type = "password";
          icon.textContent = "👁️"; // Cambia a ojito cuando está oculto
        }
    }

    // Eventos para mostrar/ocultar contraseñas
    togglePass.addEventListener("click", () => toggleVisibility(pass, togglePass));
    toggleConfirm.addEventListener("click", () => toggleVisibility(confirm, toggleConfirm));

    // Validación y envío de formulario
    formulario.addEventListener("submit", function (e) {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const contraseña = pass.value;
    const confirmar = confirm.value;

    if (contraseña !== confirmar) {
        mensaje.textContent = "Las contraseñas no coinciden.";
        mensaje.style.color = "red";
        return;
    }

    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contraseña }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.ok) {
                mensaje.style.color = "green";
                mensaje.textContent = "Inicio de sesión exitoso.";
            
                localStorage.setItem("id_usuario", data.id_usuario);
            
                setTimeout(() => {
                    window.location.href = "bienvenida.html";
                }, 1500);
                        
        } else {
            mensaje.style.color = "red";
            mensaje.textContent = "Usuario o contraseña incorrecta.";
        }
        })
        .catch((error) => {
        console.error("Error al iniciar sesión:", error);
        mensaje.textContent = "Error en el servidor.";
        mensaje.style.color = "red";
        });
    });
});
