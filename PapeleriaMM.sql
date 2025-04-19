<<<<<<< HEAD
use usuariosprogramacionweb;	

CREATE TABLE preguntas (
  id_usuario INT,
  texto_pregunta TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);


CREATE TABLE reseñas (
  id_reseña INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  texto_respuesta TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE impresiones (
    id INT AUTO_INCREMENT PRIMARY KEY,           
    id_usuario INT,                             
    fecha_impresion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    tipo_impresion VARCHAR(255),                 
    cantidad INT,                                
    precio DECIMAL(10,2),                        
    estado VARCHAR(50),                          
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)  
);

DELIMITER $$

CREATE PROCEDURE registrar_impresion(
    IN p_id_usuario INT,        
    IN p_tipo_impresion VARCHAR(255), 
    IN p_cantidad INT,       
    IN p_precio DECIMAL(10,2)   
)
BEGIN
    
    INSERT INTO impresiones (id_usuario, tipo_impresion, cantidad, precio, estado)
    VALUES (p_id_usuario, p_tipo_impresion, p_cantidad, p_precio, 'pendiente'); 

    SELECT 'Impresión registrada con estado pendiente' AS mensaje;
    
END$$

DELIMITER ;

select * from usuarios;	

select * from impresiones;

select * from preguntas;	

select * from reseñas;

show tables;

