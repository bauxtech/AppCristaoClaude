import { supabase } from './supabase'

// Registro de acesso exigido pelo Marco Civil da Internet (art. 15): data, hora e IP de cada uso, guardados 6 meses.
// O banco pega o IP do pedido e grava no máximo um registro por hora. Falha sem internet não atrapalha nada.
export async function logAccess() {
  if (!supabase) return
  try {
    await supabase.rpc('log_access')
  } catch {
    // Sem internet: o próximo uso registra.
  }
}
