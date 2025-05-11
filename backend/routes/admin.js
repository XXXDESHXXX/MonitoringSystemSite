import express from 'express'
import { Op } from 'sequelize'
import { ensureAuthenticated } from '../middleware/auth.js'
import { ensureAdmin }         from '../middleware/admin.js'
import Tag      from '../models/Tag.js'
import User     from '../models/User.js'
import Metric   from '../models/Metric.js'
import MetricTag from '../models/MetricTag.js'

const router = express.Router()

router.use(ensureAuthenticated, ensureAdmin)

// GET /admin/tags?search=...
router.get('/tags', async (req, res) => {
  const { search } = req.query
  const where = {}
  if (search) {
    where.name = { [Op.iLike]: `%${search.trim()}%` }
  }
  const tags = await Tag.findAll({ where })
  res.json(tags)
})

// POST /admin/tags
router.post('/tags', async (req, res) => {
  const { name, color } = req.body
  const tag = await Tag.create({ name, color })
  res.status(201).json(tag)
})

// DELETE /admin/tags/:id
router.delete('/tags/:id', async (req, res) => {
  await Tag.destroy({ where: { id: req.params.id } })
  res.json({ message: 'Tag deleted' })
})

// POST /admin/metrics/:metricId/tags/:tagId
router.post('/metrics/:metricId/tags/:tagId', async (req, res) => {
  const { metricId, tagId } = req.params
  const metric = await Metric.findByPk(metricId)
  if (!metric) return res.status(404).json({ error: 'Metric not found' })
  const tag = await Tag.findByPk(tagId)
  if (!tag) return res.status(404).json({ error: 'Tag not found' })

  await MetricTag.findOrCreate({
    where: { metric_id: metricId, tag_id: tagId }
  })
  res.status(201).json({ message: 'Tag added to metric' })
})

// DELETE /admin/metrics/:metricId/tags/:tagId
router.delete('/metrics/:metricId/tags/:tagId', async (req, res) => {
  const { metricId, tagId } = req.params
  const deleted = await MetricTag.destroy({
    where: { metric_id: metricId, tag_id: tagId }
  })
  if (!deleted) return res.status(404).json({ error: 'Tag not linked' })
  res.json({ message: 'Tag removed from metric' })
})

// GET /admin/users?search=...
router.get('/users', async (req, res) => {
  const { search } = req.query
  const where = {}
  if (search) {
    where.username = { [Op.iLike]: `%${search.trim()}%` }
  }
  const users = await User.findAll({
    where,
    attributes: ['id','username','email','role']
  })
  res.json(users)
})

// DELETE /admin/users/:id
router.delete('/users/:id', async (req, res) => {
  await User.destroy({ where: { id: req.params.id } })
  res.json({ message: 'User deleted' })
})

export default router
