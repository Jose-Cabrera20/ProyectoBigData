using Emergencia.Api.Services;
using CentrodeEmergencia.Shared.Modelos;
using CentrodeEmergencia.Shared.Enums;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Emergencia.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GeneradorController : ControllerBase
    {
        private readonly KafkaProducerService _kafkaService;
        private readonly IConfiguration _configuration;
        private readonly Random _random = new Random();

        // Nombres de distritos simulados
        private readonly string[] _distritos = { "Distrito Central", "San Pedro Sula", "Comayagua", "La Ceiba", "Choluteca" };

        public GeneradorController(KafkaProducerService kafkaService, IConfiguration configuration)
        {
            _kafkaService = kafkaService;
            _configuration = configuration;
        }

        // 1. Endpoint para una sola llamada (Envío individual)
        [HttpPost("individual")]
        public async Task<IActionResult> EnviarIndividual([FromBody] LlamadaEmergencia llamadaWeb)
        {
            try
            {
                // 1. Validamos que la fecha venga bien, si no, le ponemos la de ahorita
                if (llamadaWeb.Timestamp == default)
                {
                    llamadaWeb.Timestamp = DateTime.UtcNow;
                }

                // 2. ¡Usamos tu método original enviando lo que vino del formulario!
                await _kafkaService.EnviarLlamadaAsync(llamadaWeb);

                return Ok(new { Mensaje = "Llamada manual enviada a Kafka", Llamada = llamadaWeb });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        // 2. Endpoint para enviar ráfaga masiva (Simulación de picos)
        [HttpPost("masivo/{cantidad}")]
        public IActionResult EnviarMasivo(int cantidad)
        {
            if (cantidad <= 0 || cantidad > 10000)
                return BadRequest("La cantidad debe estar entre 1 y 10,000");

            var llamadas = new List<LlamadaEmergencia>();
            for (int i = 0; i < cantidad; i++)
            {
                llamadas.Add(GenerarLlamadaAleatoria());
            }

            // Enviamos la ráfaga completa usando el método optimizado del servicio
            _kafkaService.EnviarRafaga(llamadas);

            return Ok(new { Mensaje = $"Ráfaga masiva de {cantidad} llamadas enviada a Kafka exitosamente." });
        }

        // 3. Endpoint para leer las estadísticas en el Dashboard (MongoDB)
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetEstadisticas()
        {
            try
            {
                // 1. Conectarnos a Mongo
                var connectionString = _configuration["MongoDbConfiguration:ConnectionString"];
                var databaseName = _configuration["MongoDbConfiguration:DatabaseName"];
                var collectionName = _configuration["MongoDbConfiguration:CollectionName"];

                var client = new MongoClient(connectionString);
                var db = client.GetDatabase(databaseName);
                var collection = db.GetCollection<BsonDocument>(collectionName);

                // 2. Traer las últimas 1000 llamadas
                var ultimasLlamadas = await collection.Find(new BsonDocument())
                                               .Sort(Builders<BsonDocument>.Sort.Descending("Timestamp"))
                                               .Limit(20000)
                                               .ToListAsync();

                var totalHistorico = await collection.CountDocumentsAsync(new BsonDocument());

                // 3. Formatear datos de forma SEGURA (A prueba de balas)
                var llamadasFormateadas = ultimasLlamadas.Select(l => {

                    string horaFormateada = "00:00:00";
                    if (l.Contains("Timestamp") && l["Timestamp"].IsString)
                    {
                        // Intentamos convertir el string de Mongo a un objeto DateTime real
                        if (DateTime.TryParse(l["Timestamp"].AsString, out DateTime fecha))
                        {
                            // Tomamos la hora tal cual viene, sin restarle nada
                            horaFormateada = fecha.ToString("HH:mm:ss");
                        }
                        else if (l["Timestamp"].AsString.Length >= 19)
                        {
                            horaFormateada = l["Timestamp"].AsString.Substring(11, 8);
                        }
                    }

                    return new
                    {
                        id = l.Contains("IdLlamada") ? l["IdLlamada"].AsString : "Desconocido",
                        distrito = l.Contains("DistritoId") ? l["DistritoId"].AsString : "Desconocido",
                        tipo = l.Contains("Tipo") ? l["Tipo"].AsInt32 : 0,
                        prioridad = l.Contains("Prioridad") ? l["Prioridad"].AsInt32 : 0,
                        hora = horaFormateada,
                        estado = "Activo"
                    };
                }).ToList();

                return Ok(new
                {
                    TotalLlamadas = totalHistorico,
                    Llamadas = llamadasFormateadas
                });
            }
            catch (Exception ex)
            {
                // Si ocurre un error, ahora sí lo veremos en la consola negra
                Console.WriteLine("\n[ERROR CRÍTICO EN DASHBOARD]: " + ex.Message + "\n");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        // Método auxiliar para crear datos realistas
        private LlamadaEmergencia GenerarLlamadaAleatoria()
        {
            // Simulamos que el Distrito Central tiene más llamadas (Realismo)
            string distritoId = _random.Next(100) < 50 ? "Distrito Central" : _distritos[_random.Next(_distritos.Length)];

            // Simulamos que las emergencias médicas son las más comunes
            TipoEmergencia tipo = _random.Next(100) < 40 ? TipoEmergencia.Medica : (TipoEmergencia)_random.Next(0, 5);

            return new LlamadaEmergencia
            {
                DistritoId = distritoId,
                Tipo = tipo,
                Prioridad = (Prioridad)_random.Next(0, 4),
                Latitud = 14.0 + (_random.NextDouble() * 0.1), // Coordenadas ficticias
                Longitud = -87.2 + (_random.NextDouble() * 0.1),
                UnidadesRequeridas = _random.Next(1, 4) // Entre 1 y 3 unidades por emergencia
            };
        }
    }
}