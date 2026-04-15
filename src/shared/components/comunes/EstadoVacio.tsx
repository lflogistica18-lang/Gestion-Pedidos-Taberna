// Estado vacio — cuando no hay datos para mostrar

interface Props {
  mensaje: string
  accion?: {
    texto: string
    onClick: () => void
  }
}

export function EstadoVacio({ mensaje, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-400 text-4xl mb-3">0</div>
      <p className="text-gray-500 mb-4">{mensaje}</p>
      {accion && (
        <button
          onClick={accion.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
        >
          {accion.texto}
        </button>
      )}
    </div>
  )
}
