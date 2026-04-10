const { Schema, model, models } = require('mongoose')

const topicSchema = new Schema(
	{
		subject: {
			type: Schema.Types.ObjectId,
			ref: 'Subject',
			required: true,
			index: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
			default: '',
		},
		order: {
			type: Number,
			default: 0,
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

topicSchema.index({ subject: 1, title: 1 }, { unique: true })

module.exports = models.Topic || model('Topic', topicSchema)
