const { Schema, model, models } = require('mongoose')

function generateAccessCode() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

async function generateUniqueAccessCode(TestSessionModel, currentId) {
	let accessCode = generateAccessCode()

	while (
		await TestSessionModel.exists({
			_id: { $ne: currentId },
			accessCode,
			status: 'active',
		})
	) {
		accessCode = generateAccessCode()
	}

	return accessCode
}

const testSessionSchema = new Schema(
	{
		subject: {
			type: Schema.Types.ObjectId,
			ref: 'Subject',
			required: true,
			index: true,
		},
		topic: {
			type: Schema.Types.ObjectId,
			ref: 'Topic',
			required: true,
			index: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			default: null,
			index: true,
		},
		createdByName: {
			type: String,
			trim: true,
			default: 'Admin',
		},
		durationMinutes: {
			type: Number,
			required: true,
			min: 1,
			max: 600,
		},
		questionCount: {
			type: Number,
			default: 20,
			min: 1,
			max: 100,
		},
		shuffleQuestions: {
			type: Boolean,
			default: true,
		},
		accessCode: {
			type: String,
			required: true,
			trim: true,
			match: /^\d{6}$/,
			index: true,
		},
		status: {
			type: String,
			enum: ['active', 'closed'],
			default: 'active',
			index: true,
		},
		startedAt: {
			type: Date,
			default: Date.now,
		},
		closedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

testSessionSchema.pre('validate', async function ensureAccessCode() {
	const normalizedCode = String(this.accessCode || '')
		.replace(/[^\d]/g, '')
		.trim()

	this.createdByName = String(this.createdByName || 'Admin').trim() || 'Admin'

	if (normalizedCode) {
		this.accessCode = normalizedCode
	} else {
		this.accessCode = await generateUniqueAccessCode(this.constructor, this._id)
	}

	if (this.status === 'closed' && !this.closedAt) {
		this.closedAt = new Date()
	}

	if (this.status === 'active') {
		this.closedAt = null
	}
})

testSessionSchema.index({ accessCode: 1, status: 1 })
testSessionSchema.index({ topic: 1, status: 1, createdAt: -1 })

module.exports = models.TestSession || model('TestSession', testSessionSchema)
