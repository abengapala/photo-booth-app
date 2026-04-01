import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('photos')
      .select('id')
      .limit(1)
    
    if (error) throw error
    
    return Response.json({ 
      status: 'alive', 
      time: new Date().toISOString(),
      rows: data?.length ?? 0
    })
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 })
  }
}