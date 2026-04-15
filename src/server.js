const os = require('os')
require('dotenv').config()

const createApp = require('./app')
const connectDB = require('./config/db')

const PORT = Number(process.env.PORT) || 5000
const HOST = String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0'

function getNetworkUrls(port) {
	const interfaces = os.networkInterfaces()
	const urls = []

	for (const items of Object.values(interfaces)) {
		for (const item of items || []) {
			if (item.family === 'IPv4' && !item.internal) {
				urls.push(`http://${item.address}:${port}`)
			}
		}
	}

	return [...new Set(urls)]
}

async function bootstrap() {
	await connectDB(process.env.MONGODB_URI)
	const app = await createApp()

	app.listen(PORT, HOST, () => {
		console.log(`🚀 Server http://localhost:${PORT} da ishga tushdi`)
		console.log(`📚 Swagger docs: http://localhost:${PORT}/docs`)
		console.log(`🛠️ Admin panel: http://localhost:${PORT}/admin`)

		for (const baseUrl of getNetworkUrls(PORT)) {
			console.log(`🌐 Tarmoq manzili: ${baseUrl}`)
			console.log(`📚 Tarmoq Swagger: ${baseUrl}/docs`)
			console.log(`🛠️ Tarmoq Admin: ${baseUrl}/admin`)
		}
	})
}

bootstrap().catch(error => {
	console.error('❌ Bootstrap jarayonida xato:', error)
	process.exit(1)
})
