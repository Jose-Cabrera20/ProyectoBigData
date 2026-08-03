using Emergencia.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Registrar servicios y trabajadores en segundo plano
builder.Services.AddSingleton<KafkaProducerService>();
builder.Services.AddHostedService<KafkaConsumerService>();

// 2. Habilitar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirUI", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// 3. Activar CORS
app.UseCors("PermitirUI");

app.UseAuthorization();
app.MapControllers();

// Imprimir los puertos activos en la consola al iniciar
app.Lifetime.ApplicationStarted.Register(() => {
    foreach (var address in app.Urls)
    {
        Console.WriteLine($"\n[API ACTIVA] Escuchando en: {address}/api/generador/dashboard-stats\n");
    }
});

app.Run();