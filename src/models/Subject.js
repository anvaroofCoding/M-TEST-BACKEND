const { Schema, model, models } = require('mongoose')

const subjectSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
			default: '',
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

module.exports = models.Subject || model('Subject', subjectSchema)
