const { Schema, model, models } = require('mongoose')

const answerSchema = new Schema(
	{
		savolId: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
			required: true,
		},
		javob: {
			type: String,
			enum: ['a', 'b', 'c', 'd'],
			required: true,
		},
		saqlanganVaqt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false },
)

const questionSnapshotSchema = new Schema(
	{
		savolId: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
			required: true,
		},
		savolMatni: {
			type: String,
			required: true,
		},
		variantlar: {
			a: { type: String, required: true },
			b: { type: String, required: true },
			c: { type: String, required: true },
			d: { type: String, required: true },
		},
		togriJavob: {
			type: String,
			enum: ['a', 'b', 'c', 'd'],
			required: true,
		},
		izoh: {
			type: String,
			default: '',
		},
		qiyinlik: {
			type: String,
			enum: ['easy', 'medium', 'hard'],
			default: 'medium',
		},
		tartib: {
			type: Number,
			default: 0,
		},
		ball: {
			type: Number,
			default: 1,
		},
	},
	{ _id: false },
)

const testAttemptSchema = new Schema(
	{
		testSession: {
			type: Schema.Types.ObjectId,
			ref: 'TestSession',
			default: null,
			index: true,
		},
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
		ishtirokchi: {
			type: String,
			trim: true,
			default: 'Mehmon',
		},
		ishtirokchiMalumoti: {
			ism: {
				type: String,
				trim: true,
				default: '',
			},
			familiya: {
				type: String,
				trim: true,
				default: '',
			},
			telefonRaqami: {
				type: String,
				trim: true,
				default: '',
			},
			tuzilmaNomi: {
				type: String,
				trim: true,
				default: '',
			},
		},
		kirishKodi: {
			type: String,
			trim: true,
			default: '',
		},
		vaqtLimitMinut: {
			type: Number,
			default: 0,
			min: 0,
		},
		tugashVaqti: {
			type: Date,
			default: null,
		},
		yakunlashSababi: {
			type: String,
			enum: ['foydalanuvchi', 'vaqt_tugadi', 'admin_yakunladi', 'tizim', null],
			default: null,
		},
		holat: {
			type: String,
			enum: ['boshlangan', 'yakunlangan'],
			default: 'boshlangan',
			index: true,
		},
		savollar: {
			type: [questionSnapshotSchema],
			default: [],
		},
		javoblar: {
			type: [answerSchema],
			default: [],
		},
		natija: {
			jamiSavollar: { type: Number, default: 0 },
			ishlanganSavollarSoni: { type: Number, default: 0 },
			togriJavoblarSoni: { type: Number, default: 0 },
			notogriJavoblarSoni: { type: Number, default: 0 },
			javobsizSavollarSoni: { type: Number, default: 0 },
			toplanganBall: { type: Number, default: 0 },
			umumiyBall: { type: Number, default: 0 },
			foiz: { type: Number, default: 0 },
		},
		boshlanganVaqt: {
			type: Date,
			default: Date.now,
		},
		yakunlanganVaqt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
)

testAttemptSchema.index({ topic: 1, holat: 1, createdAt: -1 })
testAttemptSchema.index({ holat: 1, yakunlanganVaqt: -1, createdAt: -1 })
testAttemptSchema.index({ kirishKodi: 1, holat: 1 })
testAttemptSchema.index({ 'ishtirokchiMalumoti.telefonRaqami': 1, holat: 1 })

module.exports = models.TestAttempt || model('TestAttempt', testAttemptSchema)
