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

        private readonly string[] _distritos = { "Distrito Central", "San Pedro Sula", "Comayagua", "La Ceiba", "Choluteca" };

        public GeneradorController(KafkaProducerService kafkaService, IConfiguration configuration)
        {
            _kafkaService = kafkaService;
            _configuration = configuration;
        }

        [HttpPost("individual")]
        public async Task<IActionResult> EnviarIndividual([FromBody] LlamadaEmergencia llamadaWeb)
        {
            try
            {
                
                if (llamadaWeb.Timestamp == default)
                {
                    llamadaWeb.Timestamp = DateTime.UtcNow;
                }

                await _kafkaService.EnviarLlamadaAsync(llamadaWeb);

                return Ok(new { Mensaje = "Llamada manual enviada a Kafka", Llamada = llamadaWeb });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message });
            }
        }

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

            _kafkaService.EnviarRafaga(llamadas);

            return Ok(new { Mensaje = $"Ráfaga masiva de {cantidad} llamadas enviada a Kafka exitosamente." });
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetEstadisticas()
        {
            try
            {
                var connectionString = _configuration["MongoDbConfiguration:ConnectionString"];
                var databaseName = _configuration["MongoDbConfiguration:DatabaseName"];
                var collectionName = _configuration["MongoDbConfiguration:CollectionName"];

                var client = new MongoClient(connectionString);
                var db = client.GetDatabase(databaseName);
                var collection = db.GetCollection<BsonDocument>(collectionName);

                var ultimasLlamadas = await collection.Find(new BsonDocument())
                                               .Sort(Builders<BsonDocument>.Sort.Descending("Timestamp"))
                                               .Limit(20000)
                                               .ToListAsync();

                var totalHistorico = await collection.CountDocumentsAsync(new BsonDocument());

                var llamadasFormateadas = ultimasLlamadas.Select(l => {

                    string horaFormateada = "00:00:00";
                    if (l.Contains("Timestamp") && l["Timestamp"].IsString)
                    {
                        if (DateTime.TryParse(l["Timestamp"].AsString, out DateTime fecha))
                        {
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
                Console.WriteLine("\n[ERROR CRÍTICO EN DASHBOARD]: " + ex.Message + "\n");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        private LlamadaEmergencia GenerarLlamadaAleatoria()
        {
            string distritoId = _random.Next(100) < 50 ? "Distrito Central" : _distritos[_random.Next(_distritos.Length)];

            TipoEmergencia tipo = _random.Next(100) < 40 ? TipoEmergencia.Medica : (TipoEmergencia)_random.Next(0, 5);

            return new LlamadaEmergencia
            {
                DistritoId = distritoId,
                Tipo = tipo,
                Prioridad = (Prioridad)_random.Next(0, 4),
                Latitud = 14.0 + (_random.NextDouble() * 0.1), 
                Longitud = -87.2 + (_random.NextDouble() * 0.1),
                UnidadesRequeridas = _random.Next(1, 4) 
            };
        }
    }
}