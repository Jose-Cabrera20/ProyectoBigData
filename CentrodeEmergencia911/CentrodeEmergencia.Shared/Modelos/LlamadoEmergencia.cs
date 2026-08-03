using CentrodeEmergencia.Shared.Enums;
using System;

namespace CentrodeEmergencia.Shared.Modelos
{
    public class LlamadaEmergencia
    {
        public Guid IdLlamada { get; set; } = Guid.NewGuid();

        public string DistritoId { get; set; }

        public TipoEmergencia Tipo { get; set; }
        public Prioridad Prioridad { get; set; }

        
        public double Latitud { get; set; }
        public double Longitud { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        
        public int UnidadesRequeridas { get; set; }
    }
}