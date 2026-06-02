import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../lib/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Profile not found' })
  }

  res.json({ data: profile })
})

router.patch('/me', requireAuth, [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('website').optional().trim().isURL(),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }

  const { full_name, bio, website } = req.body

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, bio, website, updated_at: new Date().toISOString() })
    .eq('id', req.user!.id)
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to update profile' })
  }

  res.json({ data })
})

router.get('/users', requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { page = '1' } = req.query
  const pageSize = 20
  const offset = (Number(page) - 1) * pageSize

  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch users' })
  }

  res.json({ data, total: count, page: Number(page), pageSize })
})

router.patch('/users/:id/role', requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { id } = req.params
  const { role } = req.body

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: 'Failed to update role' })
  }

  res.json({ message: 'Role updated successfully' })
})

export default router
