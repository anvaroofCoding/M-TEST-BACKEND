require('dotenv').config()

const createApp = require('./app')
const connectDB = require('./config/db')

const PORT = Number(process.env.PORT) || 5000

async function bootstrap() {
	await connectDB(process.env.MONGODB_URI)
	const app = await createApp()

	app.listen(PORT, () => {
		console.log(`🚀 Server http://localhost:${PORT} da ishga tushdi`)
		console.log(`📚 Swagger docs: http://localhost:${PORT}/docs`)
		console.log(`🛠️ Admin panel: http://localhost:${PORT}/admin`)
	})
}

bootstrap().catch(error => {
	console.error('❌ Bootstrap jarayonida xato:', error)
	process.exit(1)
})
