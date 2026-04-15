// Skeleton de carga — se muestra mientras se esperan datos

export function EstadoCargando() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-10 bg-gray-200 rounded w-full" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}
