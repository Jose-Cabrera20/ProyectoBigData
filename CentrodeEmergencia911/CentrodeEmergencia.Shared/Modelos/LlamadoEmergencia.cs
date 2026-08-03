using CentrodeEmergencia.Shared.Enums;
using System;

namespace CentrodeEmergencia.Shared.Modelos
{
    public class LlamadaEmergencia
    {
        public Guid IdLlamada { get; set; } = Guid.NewGuid();

        // ¡Clave para Kafka! Lo usaremos para el particionamiento
        public string DistritoId { get; set; }

        public TipoEmergencia Tipo { get; set; }
        public Prioridad Prioridad { get; set; }

        // Coordenadas simuladas
        public double Latitud { get; set; }
        public double Longitud { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Para calcular el balance de carga en el consumidor
        public int UnidadesRequeridas { get; set; }
    }
}