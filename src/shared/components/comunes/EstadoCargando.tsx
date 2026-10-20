// Skeleton de carga — se muestra mientras se esperan datos

export function EstadoCargando({ mensaje }: { mensaje?: string }) {
  return (
    <div className="animate-pulse space-y-4 p-4 md:p-6" role="status" aria-label="Cargando">
      <div className="h-8 w-1/3 rounded bg-superficie-2" />
      <div className="h-10 w-full rounded bg-superficie-2" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded bg-superficie-2" />
        ))}
      </div>
      {mensaje && <p className="mt-4 text-center text-texto-secundario">{mensaje}</p>}
    </div>
  )
}
