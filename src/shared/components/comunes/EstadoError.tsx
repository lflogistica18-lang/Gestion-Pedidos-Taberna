// Estado de error — con boton para reintentar

interface Props {
  mensaje: string
  onReintentar: () => void
}

export function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-red-400 text-4xl mb-3">!</div>
      <p className="text-red-600 font-medium mb-2">Ocurrio un error</p>
      <p className="text-gray-500 text-sm mb-4">{mensaje}</p>
      <button
        onClick={onReintentar}
        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 min-h-[44px]"
      >
        Reintentar
      </button>
    </div>
  )
}
