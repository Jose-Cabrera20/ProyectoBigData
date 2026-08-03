using Confluent.Kafka;
using CentrodeEmergencia.Shared.Modelos;
using System.Text.Json;

namespace Emergencia.Api.Services
{
    public class KafkaProducerService : IDisposable
    {
        private readonly IProducer<string, string> _producer;
        private readonly string _topic = "llamadas-emergencia";

        public KafkaProducerService(IConfiguration config)
        {
            var producerConfig = new ProducerConfig
            {
                BootstrapServers = config["KafkaConfiguration:BootstrapServers"],

                LingerMs = 10,
                BatchSize = 32768,
                Acks = Acks.Leader
            };

            _producer = new ProducerBuilder<string, string>(producerConfig).Build();
        }

        public async Task EnviarLlamadaAsync(LlamadaEmergencia llamada)
        {
            var mensajeJson = JsonSerializer.Serialize(llamada);

            var mensajeKafka = new Message<string, string>
            {
                Key = llamada.DistritoId,
                Value = mensajeJson
            };

            await _producer.ProduceAsync(_topic, mensajeKafka);
        }

        public void EnviarRafaga(IEnumerable<LlamadaEmergencia> llamadas)
        {
            foreach (var llamada in llamadas)
            {
                var mensajeJson = JsonSerializer.Serialize(llamada);

                _producer.Produce(_topic, new Message<string, string>
                {
                    Key = llamada.DistritoId,
                    Value = mensajeJson
                });
            }

            _producer.Flush(TimeSpan.FromSeconds(10));
        }

        public void Dispose()
        {
            _producer?.Flush(TimeSpan.FromSeconds(2));
            _producer?.Dispose();
        }
    }
}