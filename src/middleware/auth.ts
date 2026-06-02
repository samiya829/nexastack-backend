import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.slice(7)

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}
