import type { OrderStatus } from '@/types/database.types'
import { Pastilla } from '@/shared/components/panel'
import { ESTADO_PEDIDO } from './formato'

interface Props {
  estado: OrderStatus
  /** En papelera el estado se reemplaza por "En papelera". */
  enPapelera?: boolean
}

export function PastillaEstado({ estado, enPapelera }: Props) {
  if (enPapelera) return <Pastilla tono="neutro" conPunto>En papelera</Pastilla>
  const e = ESTADO_PEDIDO[estado]
  return <Pastilla tono={e.tono} conPunto>{e.etiqueta}</Pastilla>
}
