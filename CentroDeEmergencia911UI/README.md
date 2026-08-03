# 🚨 Centro de Emergencias 911

## Descripción
El **Sistema de Emergencias 911** es una solución basada en una arquitectura Big Data orientada al procesamiento masivo de información en tiempo casi real. El proyecto simula la recepción de miles de llamadas de emergencia y utiliza un modelo productor-consumidor desacoplado para garantizar un alto rendimiento, disponibilidad y tolerancia a picos de carga, como los que podrían producirse durante desastres naturales o emergencias nacionales.

La arquitectura implementa **Apache Kafka** como sistema de mensajería distribuida, **MongoDB** como base de datos NoSQL y servicios desarrollados en **.NET C#** para la producción y el consumo de mensajes. El sistema también incluye un dashboard web que permite monitorear en tiempo real el comportamiento de toda la plataforma.

---

## 💻 Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript Vanilla
* **Backend:** .NET Core C#, ASP.NET Core Web API
* **Big Data:** Apache Kafka, Apache Zookeeper
* **Base de Datos:** MongoDB, MongoDB Compass
* **Infraestructura:** Docker Desktop, Docker Compose

---

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio

git clone https://github.com/Jose-Cabrera20/ProyectoBigData/tree/main/CentroDeEmergencia911UI

### 2. Levantar Kafka y Zookeeper
Ubicarse en la carpeta donde se encuentra el archivo docker-compose.yml y ejecutar:
docker-compose up -d

### 3. Configurar MongoDB
Asegurarse de que MongoDB esté ejecutándose en el puerto 27017. En el archivo appsettings.json (dentro del backend), verificar la configuración:
"MongoDbSettings": {
  "ConnectionString": "mongodb://localhost:27017",
  "DatabaseName": "Emergencias911Db",
  "CollectionName": "Llamadas"
}

### 4. Ejecutar el Backend
Abrir una terminal dentro del proyecto Backend y compilar

### 5. Ejecutar el Frontend
Abrir la carpeta Frontend en Visual Studio Code.

Hacer clic derecho en index.html y seleccionar Open with Live Server.

Para detener el sistema, cancela la ejecución del backend (CTRL + C) y baja los contenedores ejecutando docker-compose down.
