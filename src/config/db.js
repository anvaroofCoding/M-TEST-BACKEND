const mongoose = require('mongoose')

async function connectDB(uri) {
	if (!uri) {
		console.warn(
			"⚠️ MONGODB_URI topilmadi. Server vaqtincha MongoDB'siz ishga tushadi. '.env' faylini to'ldiring.",
		)
		return
	}

	try {
		await mongoose.connect(uri)
		console.log('✅ MongoDB muvaffaqiyatli ulandi.')
	} catch (error) {
		console.error('❌ MongoDB ulanishida xato:', error.message)
	}
}

module.exports = connectDB
