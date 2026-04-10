const { Schema, model, models } = require('mongoose')

const questionSchema = new Schema(
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
		prompt: {
			type: String,
			required: true,
			trim: true,
		},
		options: {
			a: {
				type: String,
				required: true,
				trim: true,
			},
			b: {
				type: String,
				required: true,
				trim: true,
			},
			c: {
				type: String,
				required: true,
				trim: true,
			},
			d: {
				type: String,
				required: true,
				trim: true,
			},
		},
		correctAnswer: {
			type: String,
			required: true,
			enum: ['a', 'b', 'c', 'd'],
		},
		explanation: {
			type: String,
			trim: true,
			default: '',
		},
		difficulty: {
			type: String,
			enum: ['easy', 'medium', 'hard'],
			default: 'medium',
		},
		order: {
			type: Number,
			default: 0,
		},
		points: {
			type: Number,
			default: 1,
			min: 1,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

questionSchema.index({ topic: 1, order: 1, createdAt: 1 })

module.exports = models.Question || model('Question', questionSchema)
