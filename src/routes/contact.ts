import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../lib/supabase'
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

const contactValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('subject').trim().isLength({ min: 5, max: 200 }).withMessage('Subject must be 5-200 characters'),
  body('message').trim().isLength({ min: 20, max: 5000 }).withMessage('Message must be 20-5000 characters'),
]

router.post('/', contactValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() })
  }

  const { name, email, subject, message } = req.body

  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message, status: 'new' })

  if (error) {
    console.error('Contact insert error:', error)
    return res.status(500).json({ error: 'Failed to submit message. Please try again.' })
  }

  res.status(201).json({ message: 'Message sent successfully' })
})

router.get('/', requireAdmin, async (req: AuthRequest, res) => {
  const { status, page = '1' } = req.query
  const pageSize = 20
  const offset = (Number(page) - 1) * pageSize

  let query = supabase
    .from('contact_messages')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status) {
    query = query.eq('status', status as string)
  }

  const { data, error, count } = await query

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch messages' })
  }

  res.json({ data, total: count, page: Number(page), pageSize })
})

router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['new', 'read', 'replied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: 'Failed to update message' })
  }

  res.json({ message: 'Status updated' })
})

export default router
