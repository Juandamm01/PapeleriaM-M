document.addEventListener("DOMContentLoaded", () => {
    const horarios = [
      { dia: "Lunes", clase: "Spinning", hora: "8:00 AM" },
      { dia: "Martes", clase: "Yoga", hora: "9:00 AM" },
      { dia: "Miércoles", clase: "Boxeo", hora: "10:00 AM" },
      { dia: "Jueves", clase: "Zumba", hora: "11:00 AM" },
      { dia: "Viernes", clase: "Entrenamiento funcional", hora: "6:00 PM" },
      { dia: "Sábado", clase: "Crossfit", hora: "7:00 AM" }
    ];
  
    const tbody = document.querySelector("#tablaHorarios tbody");
  
    horarios.forEach(horario => {
      const fila = document.createElement("tr");
  
      fila.innerHTML = `
        <td>${horario.dia}</td>
        <td>${horario.clase}</td>
        <td>${horario.hora}</td>
      `;
  
      tbody.appendChild(fila);
    });
  });
  