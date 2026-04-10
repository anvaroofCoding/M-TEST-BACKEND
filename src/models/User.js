const { Schema, model, models } = require('mongoose')

const userSchema = new Schema(
	{
		firstName: {
			type: String,
			required: true,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
		},
		fullName: {
			type: String,
			trim: true,
		},
		phoneNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		organizationName: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			default: '',
			sparse: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			trim: true,
			minlength: 4,
		},
		role: {
			type: String,
			enum: ['admin', 'tuzilma_raxbari', 'test_yechuvchi'],
			default: 'test_yechuvchi',
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

userSchema.pre('validate', function setComputedFields() {
	this.firstName = String(this.firstName || '').trim()
	this.lastName = String(this.lastName || '').trim()
	this.fullName = [this.firstName, this.lastName]
		.filter(Boolean)
		.join(' ')
		.trim()
	this.phoneNumber = String(this.phoneNumber || '').replace(/[^\d+]/g, '')
	this.organizationName = String(this.organizationName || '').trim()
	this.email = String(this.email || '')
		.trim()
		.toLowerCase()
})

module.exports = models.User || model('User', userSchema)
