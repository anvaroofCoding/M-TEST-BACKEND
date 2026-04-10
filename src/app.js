const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const apiRoutes = require('./routes')
const setupAdminPanel = require('./config/adminjs')
const setupSwagger = require('./config/swagger')

async function createApp() {
	const app = express()

	app.disable('x-powered-by')
	app.use(
		helmet({
			contentSecurityPolicy: false,
			crossOriginEmbedderPolicy: false,
		}),
	)
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || '*',
			credentials: true,
		}),
	)
	app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

	// AdminJS login router `express-formidable` ishlatadi.
	// Shuning uchun global body parser'lar undan keyin ulanishi kerak.
	await setupAdminPanel(app)
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))
	setupSwagger(app)

	/**
	 * @openapi
	 * /:
	 *   get:
	 *     tags: [System]
	 *     summary: Loyiha haqida umumiy ma'lumot
	 *     responses:
	 *       200:
	 *         description: Backend bosh sahifasi
	 */
	app.get('/', (req, res) => {
		res.status(200).json({
			muvaffaqiyat: true,
			loyiha: 'M-TEST-BACKEND',
			xabar: 'Professional backend muhiti tayyor',
			manzillar: {
				adminPanel: '/admin',
				hujjatlar: '/docs',
				sogliq: '/api/sogliq',
				fanlar: '/api/fanlar',
			},
		})
	})

	app.use('/api', apiRoutes)

	app.use((req, res) => {
		res.status(404).json({
			muvaffaqiyat: false,
			xabar: 'So‘ralgan route topilmadi',
		})
	})

	app.use((error, req, res, next) => {
		console.error('❌ Server xatosi:', error)

		if (res.headersSent) {
			return next(error)
		}

		if (error.code === 11000) {
			return res.status(409).json({
				muvaffaqiyat: false,
				xabar: 'Bu ma’lumot allaqachon mavjud. Takror qiymat yuborildi.',
			})
		}

		if (error.name === 'ValidationError') {
			return res.status(400).json({
				muvaffaqiyat: false,
				xabar: Object.values(error.errors)
					.map(item => item.message)
					.join(', '),
			})
		}

		return res.status(error.status || 500).json({
			muvaffaqiyat: false,
			xabar: error.message || 'Ichki server xatosi yuz berdi',
		})
	})

	return app
}

module.exports = createApp
