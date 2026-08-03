using Confluent.Kafka;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Emergencia.Api.Services
{
    public class KafkaConsumerService : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider _serviceProvider;

        public KafkaConsumerService(IConfiguration configuration, IServiceProvider serviceProvider)
        {
            _configuration = configuration;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Esperar 3 segundos para asegurar que la API ya encendió por completo antes de escuchar Kafka
            await Task.Delay(3000, stoppingToken);

            var bootstrapServers = _configuration["KafkaConfiguration:BootstrapServers"];
            var topic = _configuration["KafkaConfiguration:TopicGenerador"];

            var config = new ConsumerConfig
            {
                BootstrapServers = bootstrapServers,
                GroupId = "emergencias-dashboard-group",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = true
            };

            // Ejecutar el consumidor en un hilo separado para que nunca congele la API
            _ = Task.Run(async () =>
            {
                try
                {
                    using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
                    consumer.Subscribe(topic);

                    Console.WriteLine("\n[KAFKA CONSUMER] Escuchando mensajes activamente...\n");

                    while (!stoppingToken.IsCancellationRequested)
                    {
                        try
                        {
                            var consumeResult = consumer.Consume(TimeSpan.FromMilliseconds(500));
                            if (consumeResult != null && !string.IsNullOrEmpty(consumeResult.Message.Value))
                            {
                                var mensajeJson = consumeResult.Message.Value;

                                // Guardar en MongoDB usando un scope seguro
                                using (var scope = _serviceProvider.CreateScope())
                                {
                                    var connectionString = _configuration["MongoDbConfiguration:ConnectionString"];
                                    var databaseName = _configuration["MongoDbConfiguration:DatabaseName"];
                                    var collectionName = _configuration["MongoDbConfiguration:CollectionName"];

                                    var mongoClient = new MongoClient(connectionString);
                                    var mongoDatabase = mongoClient.GetDatabase(databaseName);
                                    var collection = mongoDatabase.GetCollection<BsonDocument>(collectionName);

                                    var documentoMongo = BsonDocument.Parse(mensajeJson);
                                    await collection.InsertOneAsync(documentoMongo);
                                }
                            }
                        }
                        catch (ConsumeException)
                        {
                            // Ignorar timeouts de lectura para mantener el ciclo fluido
                        }
                    }
                    consumer.Close();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[KAFKA ERROR]: {ex.Message}");
                }
            }, stoppingToken);
        }
    }
}