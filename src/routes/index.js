const crypto = require('crypto')
const { Router } = require('express')
const mongoose = require('mongoose')
const Question = require('../models/Question')
const Subject = require('../models/Subject')
const TestAttempt = require('../models/TestAttempt')
const TestSession = require('../models/TestSession')
const Topic = require('../models/Topic')
const User = require('../models/User')

const router = Router()

const JAVOB_VARIANTLARI = ['a', 'b', 'c', 'd']
const QIYINLIK_XARITASI = {
	easy: 'oson',
	medium: "o'rta",
	hard: 'qiyin',
}
const QIYINLIK_TESKARI_XARITASI = {
	oson: 'easy',
	"o'rta": 'medium',
	orta: 'medium',
	easy: 'easy',
	medium: 'medium',
	qiyin: 'hard',
	hard: 'hard',
}
const MONGO_HOLATLARI = {
	0: 'uzilgan',
	1: 'ulangan',
	2: 'ulanmoqda',
	3: 'uzilmoqda',
}
const XODIM_ROLLARI = ['admin', 'tuzilma_raxbari']
const ROL_NOMLARI = {
	admin: 'Admin',
	tuzilma_raxbari: 'Tuzilma rahbari',
	test_yechuvchi: 'Test yechuvchi',
}
const TOKEN_TURI = 'Bearer'
const TOKEN_MUDDATI_SEKUND = Math.max(
	toNumber(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS, 60 * 60 * 8),
	60,
)

function getTokenSecret() {
	return (
		process.env.AUTH_TOKEN_SECRET ||
		process.env.SESSION_SECRET ||
		'dev-auth-token-secret-change-me'
	)
}

function encodeTokenPart(value) {
	return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function decodeTokenPart(value) {
	try {
		return JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'))
	} catch {
		throw createHttpError(401, 'Token noto‘g‘ri formatda')
	}
}

function createAccessToken(user) {
	const issuedAt = Math.floor(Date.now() / 1000)
	const expiresAt = issuedAt + TOKEN_MUDDATI_SEKUND
	const header = encodeTokenPart({ alg: 'HS256', typ: 'JWT' })
	const payload = encodeTokenPart({
		userId: String(user._id),
		role: user.role,
		phoneNumber: user.phoneNumber,
		iat: issuedAt,
		exp: expiresAt,
	})
	const signature = crypto
		.createHmac('sha256', getTokenSecret())
		.update(`${header}.${payload}`)
		.digest('base64url')

	return {
		token: `${header}.${payload}.${signature}`,
		expiresAt,
	}
}

function verifyAccessToken(token) {
	const parts = String(token || '')
		.trim()
		.split('.')
	if (parts.length !== 3) {
		throw createHttpError(401, 'Token formati noto‘g‘ri')
	}

	const [header, payload, signature] = parts
	const expectedSignature = crypto
		.createHmac('sha256', getTokenSecret())
		.update(`${header}.${payload}`)
		.digest('base64url')
	const providedBuffer = Buffer.from(signature, 'utf8')
	const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

	if (
		providedBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(providedBuffer, expectedBuffer)
	) {
		throw createHttpError(401, 'Token imzosi noto‘g‘ri')
	}

	const decodedHeader = decodeTokenPart(header)
	if (decodedHeader.alg !== 'HS256') {
		throw createHttpError(401, 'Token algoritmi qo‘llab-quvvatlanmaydi')
	}

	const decodedPayload = decodeTokenPart(payload)
	const now = Math.floor(Date.now() / 1000)
	if (!decodedPayload.exp || decodedPayload.exp <= now) {
		throw createHttpError(401, 'Token muddati tugagan')
	}

	return decodedPayload
}

function getAccessTokenFromRequest(req) {
	const authorization = String(req.headers.authorization || '').trim()
	if (/^bearer\s+/i.test(authorization)) {
		return authorization.replace(/^bearer\s+/i, '').trim()
	}

	return String(
		req.headers['x-access-token'] ||
			req.headers['x-auth-token'] ||
			req.body?.token ||
			req.query?.token ||
			'',
	).trim()
}

async function getAuthorizedStaff(req, { required = false } = {}) {
	const token = getAccessTokenFromRequest(req)
	if (!token) {
		if (required) {
			throw createHttpError(401, 'Token talab qilinadi')
		}

		return null
	}

	const payload = verifyAccessToken(token)
	ensureObjectId(payload.userId, 'Token foydalanuvchi ID')

	const user = await User.findOne({
		_id: payload.userId,
		isActive: true,
	})
	if (!user) {
		throw createHttpError(401, 'Token bo‘yicha foydalanuvchi topilmadi')
	}

	if (!XODIM_ROLLARI.includes(user.role)) {
		throw createHttpError(403, 'Bu token xodim uchun ruxsat bermaydi')
	}

	return user
}

function createHttpError(status, message) {
	const error = new Error(message)
	error.status = status
	return error
}

function yubor(res, status, xabar, malumot) {
	const body = {
		muvaffaqiyat: status >= 200 && status < 400,
		xabar,
	}

	if (malumot !== undefined) {
		body.malumot = malumot
	}

	return res.status(status).json(body)
}

function ensureObjectId(id, fieldName = 'ID') {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		throw createHttpError(400, `${fieldName} noto'g'ri formatda yuborilgan`)
	}
}

function toBoolean(value, defaultValue = true) {
	return typeof value === 'boolean' ? value : defaultValue
}

function toNumber(value, defaultValue = 0) {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : defaultValue
}

function shuffleArray(items) {
	const array = [...items]

	for (let index = array.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1))
		const current = array[index]
		array[index] = array[randomIndex]
		array[randomIndex] = current
	}

	return array
}

function getRelationId(value) {
	if (!value) {
		return null
	}

	if (typeof value === 'object' && value._id) {
		return value._id
	}

	return value
}

function getRelationName(value, fallback = '') {
	if (value && typeof value === 'object') {
		if (value.name) {
			return value.name
		}

		if (value.title) {
			return value.title
		}

		if (value.fullName) {
			return value.fullName
		}

		const fio = fullNameFromParts(value.firstName, value.lastName)
		if (fio) {
			return fio
		}
	}

	return fallback
}

function getText(body, uzKey, enKey) {
	return String(body[uzKey] ?? body[enKey] ?? '').trim()
}

function normalizeDifficulty(value) {
	const normalized = String(value || "o'rta")
		.trim()
		.toLowerCase()
	return QIYINLIK_TESKARI_XARITASI[normalized] || null
}

function difficultyToUz(value) {
	return QIYINLIK_XARITASI[value] || "o'rta"
}

function normalizePhoneNumber(value) {
	return String(value || '')
		.replace(/[^\d+]/g, '')
		.trim()
}

function fullNameFromParts(firstName = '', lastName = '') {
	return [String(firstName || '').trim(), String(lastName || '').trim()]
		.filter(Boolean)
		.join(' ')
}

function roleToUz(value) {
	return ROL_NOMLARI[value] || value
}

function xodimFormatla(user) {
	return {
		id: user._id,
		ism: user.firstName || '',
		familiya: user.lastName || '',
		fio: user.fullName || fullNameFromParts(user.firstName, user.lastName),
		telefonRaqami: user.phoneNumber || '',
		email: user.email || '',
		tuzilmaNomi: user.organizationName || '',
		rol: user.role,
		rolNomi: roleToUz(user.role),
		faol: user.isActive,
		yaratilganVaqt: user.createdAt,
		yangilanganVaqt: user.updatedAt,
	}
}

function buildParticipantInfo(body = {}, { strict = true } = {}) {
	const ism = getText(body, 'ism', 'firstName')
	const familiya = getText(body, 'familiya', 'lastName')
	const telefonRaqami = normalizePhoneNumber(
		body.telefonRaqami ?? body.phoneNumber ?? body.phone,
	)
	const tuzilmaNomi = String(
		body.tuzilmaNomi ?? body.organizationName ?? body.organization ?? '',
	).trim()

	const malumot = {
		ism,
		familiya,
		telefonRaqami,
		tuzilmaNomi,
	}

	if (
		strict &&
		(!malumot.ism ||
			!malumot.familiya ||
			!malumot.telefonRaqami ||
			!malumot.tuzilmaNomi)
	) {
		throw createHttpError(
			400,
			'ism, familiya, telefonRaqami va tuzilmaNomi majburiy',
		)
	}

	return malumot
}

function extractAccessCode(body = {}) {
	return String(
		body.kod ?? body.accessCode ?? body.code ?? body.oltiXonaliKod ?? '',
	)
		.trim()
		.replace(/\s+/g, '')
}

function getAttemptDeviceKey(body = {}) {
	return String(
		body.qurilmaId ??
			body.deviceId ??
			body.participantKey ??
			body.sessionKey ??
			'',
	)
		.trim()
		.slice(0, 160)
}

function getParticipantName(
	body = {},
	participantInfo = buildParticipantInfo(body, { strict: false }),
) {
	return (
		getText(body, 'ishtirokchi', 'participant') ||
		fullNameFromParts(participantInfo.ism, participantInfo.familiya) ||
		'Mehmon'
	)
}

function buildAttemptIdentityConditions(
	participantInfo = {},
	participantName = '',
	deviceKey = '',
) {
	const shartlar = []

	if (deviceKey) {
		shartlar.push({ qurilmaKaliti: deviceKey })
	}

	if (participantInfo.telefonRaqami) {
		shartlar.push({
			'ishtirokchiMalumoti.telefonRaqami': participantInfo.telefonRaqami,
		})
	}

	if (participantName && participantName !== 'Mehmon') {
		if (participantInfo.tuzilmaNomi) {
			shartlar.push({
				ishtirokchi: participantName,
				'ishtirokchiMalumoti.tuzilmaNomi': participantInfo.tuzilmaNomi,
			})
		} else {
			shartlar.push({ ishtirokchi: participantName })
		}
	}

	return shartlar
}

async function createOrContinueSessionAttempt({
	req,
	session,
	ishtirokchiMalumoti = {},
	ishtirokchi = 'Mehmon',
}) {
	const qurilmaKaliti = getAttemptDeviceKey(req.body)
	const identityConditions = buildAttemptIdentityConditions(
		ishtirokchiMalumoti,
		ishtirokchi,
		qurilmaKaliti,
	)

	if (identityConditions.length) {
		const mavjudUrinish = await TestAttempt.findOne({
			testSession: session._id,
			$or: identityConditions,
		})
			.populate('subject', 'name')
			.populate('topic', 'title')
			.populate('testSession')
			.sort({ createdAt: -1 })

		if (mavjudUrinish) {
			const urinishHolati = await ensureAttemptIsCurrent(mavjudUrinish)

			return {
				status: urinishHolati.open ? 200 : 409,
				xabar: urinishHolati.open
					? 'Siz uchun avval boshlangan test davom ettirildi'
					: 'Bu kod bilan test faqat bir marta ishlanadi. Oldingi urinishingiz yakunlangan',
				urinish: urinishFormatla(mavjudUrinish.toObject(), {
					savollarniQosh: true,
				}),
			}
		}
	}

	const questions = await Question.find({
		topic: getRelationId(session.topic),
		isActive: true,
	})
		.sort({ order: 1, createdAt: 1 })
		.limit(session.questionCount || 20)
		.lean()

	if (!questions.length) {
		throw createHttpError(404, 'Testni boshlash uchun savollar topilmadi')
	}

	const preparedQuestions = session.shuffleQuestions
		? shuffleArray(questions)
		: questions
	const natija = natijaHisobla(preparedQuestions, new Map())
	const vaqtLimitMinut = Math.max(1, toNumber(session.durationMinutes, 30))

	const urinish = await TestAttempt.create({
		testSession: session._id,
		subject: getRelationId(session.subject),
		topic: getRelationId(session.topic),
		ishtirokchi,
		ishtirokchiMalumoti,
		kirishKodi: session.accessCode,
		qurilmaKaliti,
		vaqtLimitMinut,
		tugashVaqti: new Date(Date.now() + vaqtLimitMinut * 60 * 1000),
		savollar: preparedQuestions.map(question => ({
			savolId: question._id,
			savolMatni: question.prompt,
			variantlar: question.options,
			togriJavob: question.correctAnswer,
			izoh: question.explanation,
			qiyinlik: question.difficulty,
			tartib: question.order,
			ball: question.points,
		})),
		natija: {
			jamiSavollar: natija.jamiSavollar,
			umumiyBall: natija.umumiyBall,
		},
	})

	const urinishWithRelations = await TestAttempt.findById(urinish._id)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.populate('testSession')
		.lean()

	return {
		status: 201,
		xabar: 'Kod tasdiqlandi va test boshlandi',
		urinish: urinishFormatla(urinishWithRelations, { savollarniQosh: true }),
	}
}

function generateAccessCode() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

async function generateUniqueAccessCode() {
	let accessCode = generateAccessCode()

	while (await TestSession.exists({ accessCode, status: 'active' })) {
		accessCode = generateAccessCode()
	}

	return accessCode
}

function getTimeLeftSeconds(deadline) {
	if (!deadline) {
		return null
	}

	const diff = new Date(deadline).getTime() - Date.now()
	return Math.max(Math.floor(diff / 1000), 0)
}

function escapeRegex(value = '') {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseDateValue(value, fieldName) {
	if (value === undefined || value === null || value === '') {
		return null
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		throw createHttpError(
			400,
			`${fieldName} noto'g'ri sana formatida yuborilgan`,
		)
	}

	return parsed
}

async function buildArchiveFilter(query = {}) {
	const filter = {}
	const holat = String(query.holat || 'yakunlangan')
		.trim()
		.toLowerCase()

	if (!['boshlangan', 'yakunlangan'].includes(holat)) {
		throw createHttpError(
			400,
			"holat faqat 'boshlangan' yoki 'yakunlangan' bo'lishi mumkin",
		)
	}
	filter.holat = holat

	if (query.fanId) {
		ensureObjectId(query.fanId, 'Fan ID')
		filter.subject = query.fanId
	}

	if (query.mavzuId) {
		ensureObjectId(query.mavzuId, 'Mavzu ID')
		filter.topic = query.mavzuId
	}

	const testSessiyaId = query.testSessiyaId || query.testSessionId
	if (testSessiyaId) {
		ensureObjectId(testSessiyaId, 'Test sessiya ID')
		filter.testSession = testSessiyaId
	}

	const kod = String(query.kod ?? query.accessCode ?? '').trim()
	if (kod) {
		filter.kirishKodi = kod
	}

	const yakunlashSababi = String(query.yakunlashSababi || '')
		.trim()
		.toLowerCase()
	if (yakunlashSababi) {
		filter.yakunlashSababi = yakunlashSababi
	}

	const minFoiz = query.minFoiz ?? query.minPercent
	if (minFoiz !== undefined && minFoiz !== '') {
		filter['natija.foiz'] = {
			...(filter['natija.foiz'] || {}),
			$gte: Math.max(0, toNumber(minFoiz, 0)),
		}
	}

	const maxFoiz = query.maxFoiz ?? query.maxPercent
	if (maxFoiz !== undefined && maxFoiz !== '') {
		filter['natija.foiz'] = {
			...(filter['natija.foiz'] || {}),
			$lte: Math.min(100, toNumber(maxFoiz, 100)),
		}
	}

	const sanadan = parseDateValue(
		query.sanadan ?? query.fromDate ?? query.from,
		'Boshlanish sanasi',
	)
	const gacha = parseDateValue(
		query.gacha ?? query.toDate ?? query.to,
		'Tugash sanasi',
	)
	if (sanadan || gacha) {
		filter.yakunlanganVaqt = {}
		if (sanadan) {
			filter.yakunlanganVaqt.$gte = sanadan
		}
		if (gacha) {
			filter.yakunlanganVaqt.$lte = gacha
		}
	}

	const qidiruv = String(query.q ?? query.search ?? '').trim()
	if (qidiruv) {
		const regex = new RegExp(escapeRegex(qidiruv), 'i')
		const [fanlar, mavzular] = await Promise.all([
			Subject.find({ name: regex }).select('_id').lean(),
			Topic.find({ title: regex }).select('_id').lean(),
		])
		const shartlar = [
			{ ishtirokchi: regex },
			{ 'ishtirokchiMalumoti.ism': regex },
			{ 'ishtirokchiMalumoti.familiya': regex },
			{ 'ishtirokchiMalumoti.telefonRaqami': regex },
			{ 'ishtirokchiMalumoti.tuzilmaNomi': regex },
			{ kirishKodi: regex },
		]

		if (fanlar.length) {
			shartlar.push({ subject: { $in: fanlar.map(item => item._id) } })
		}

		if (mavzular.length) {
			shartlar.push({ topic: { $in: mavzular.map(item => item._id) } })
		}

		filter.$or = shartlar
	}

	return filter
}

function arxivFormatla(urinish) {
	return {
		id: urinish._id,
		testSessiyaId: getRelationId(urinish.testSession),
		fanId: getRelationId(urinish.subject),
		fanNomi: getRelationName(urinish.subject),
		mavzuId: getRelationId(urinish.topic),
		mavzuNomi: getRelationName(urinish.topic),
		ishtirokchi: urinish.ishtirokchi || 'Mehmon',
		ishtirokchiMalumoti: urinish.ishtirokchiMalumoti || null,
		kirishKodi: urinish.kirishKodi || '',
		holat: urinish.holat,
		yakunlashSababi: urinish.yakunlashSababi || null,
		natija: {
			jamiSavollar: urinish.natija?.jamiSavollar || 0,
			ishlanganSavollarSoni: urinish.natija?.ishlanganSavollarSoni || 0,
			togriJavoblarSoni: urinish.natija?.togriJavoblarSoni || 0,
			notogriJavoblarSoni: urinish.natija?.notogriJavoblarSoni || 0,
			javobsizSavollarSoni: urinish.natija?.javobsizSavollarSoni || 0,
			toplanganBall: urinish.natija?.toplanganBall || 0,
			umumiyBall: urinish.natija?.umumiyBall || 0,
			foiz: urinish.natija?.foiz || 0,
		},
		vaqtLimitMinut: urinish.vaqtLimitMinut || 0,
		boshlanganVaqt: urinish.boshlanganVaqt,
		tugashVaqti: urinish.tugashVaqti,
		yakunlanganVaqt: urinish.yakunlanganVaqt,
		yaratilganVaqt: urinish.createdAt,
		yangilanganVaqt: urinish.updatedAt,
	}
}

function testSessionFormatla(session) {
	return {
		id: session._id,
		fanId: getRelationId(session.subject),
		fanNomi: getRelationName(session.subject),
		mavzuId: getRelationId(session.topic),
		mavzuNomi: getRelationName(session.topic),
		yaratuvchiId: getRelationId(session.createdBy),
		yaratuvchi: session.createdByName || getRelationName(session.createdBy),
		davomiylikMinut: session.durationMinutes,
		savollarSoni: session.questionCount,
		aralashtir: session.shuffleQuestions,
		kod: session.accessCode,
		holat: session.status,
		boshlanganVaqt: session.startedAt,
		yopilganVaqt: session.closedAt,
		yaratilganVaqt: session.createdAt,
	}
}

async function getFaolSessiyaByMavzu(mavzuId) {
	const session = await TestSession.findOne({
		topic: mavzuId,
		status: 'active',
	})
		.populate('subject', 'name isActive')
		.populate('topic', 'title isActive')
		.populate('createdBy', 'firstName lastName fullName role organizationName')
		.sort({ startedAt: -1, createdAt: -1, _id: -1 })
		.lean()

	if (!session || !session.topic || !session.subject) {
		return null
	}

	if (session.subject.isActive === false || session.topic.isActive === false) {
		return null
	}

	return session
}

async function yakunlaUrinish(urinish, yakunlashSababi = 'foydalanuvchi') {
	const javobMap = new Map(
		(urinish.javoblar || []).map(item => [String(item.savolId), item.javob]),
	)
	const natija = natijaHisobla(urinish.savollar || [], javobMap)

	urinish.holat = 'yakunlangan'
	urinish.yakunlanganVaqt = urinish.yakunlanganVaqt || new Date()
	urinish.yakunlashSababi = yakunlashSababi
	urinish.natija = {
		jamiSavollar: natija.jamiSavollar,
		ishlanganSavollarSoni: natija.ishlanganSavollarSoni,
		togriJavoblarSoni: natija.togriJavoblarSoni,
		notogriJavoblarSoni: natija.notogriJavoblarSoni,
		javobsizSavollarSoni: natija.javobsizSavollarSoni,
		toplanganBall: natija.toplanganBall,
		umumiyBall: natija.umumiyBall,
		foiz: natija.foiz,
	}
	await urinish.save()

	return natija
}

async function ensureAttemptIsCurrent(urinish) {
	if (urinish.holat === 'yakunlangan') {
		const javobMap = new Map(
			(urinish.javoblar || []).map(item => [String(item.savolId), item.javob]),
		)
		return {
			open: false,
			autoFinished: false,
			natija: natijaHisobla(urinish.savollar || [], javobMap),
		}
	}

	if (
		urinish.tugashVaqti &&
		new Date(urinish.tugashVaqti).getTime() <= Date.now()
	) {
		const natija = await yakunlaUrinish(urinish, 'vaqt_tugadi')
		return {
			open: false,
			autoFinished: true,
			natija,
		}
	}

	return {
		open: true,
		autoFinished: false,
		natija: null,
	}
}

function fanFormatla(subject, counts = {}) {
	return {
		id: subject._id,
		nomi: subject.name,
		tavsif: subject.description,
		faol: subject.isActive,
		mavzularSoni: counts.mavzularSoni || 0,
		savollarSoni: counts.savollarSoni || 0,
		yaratilganVaqt: subject.createdAt,
		yangilanganVaqt: subject.updatedAt,
	}
}

function mavzuFormatla(topic, extra = {}) {
	return {
		id: topic._id,
		fanId: getRelationId(topic.subject),
		fanNomi: getRelationName(topic.subject, extra.fanNomi || ''),
		nomi: topic.title,
		tavsif: topic.description,
		tartib: topic.order,
		faol: topic.isActive,
		savollarSoni: extra.savollarSoni || 0,
		yaratilganVaqt: topic.createdAt,
		yangilanganVaqt: topic.updatedAt,
	}
}

function savolFormatla(question, options = {}) {
	const savol = {
		id: question._id,
		fanId: getRelationId(question.subject),
		mavzuId: getRelationId(question.topic),
		savolMatni: question.prompt,
		variantlar: question.options,
		qiyinlik: difficultyToUz(question.difficulty),
		tartib: question.order,
		ball: question.points,
		faol: question.isActive,
		yaratilganVaqt: question.createdAt,
		yangilanganVaqt: question.updatedAt,
	}

	if (!options.testRejimi) {
		savol.togriJavob = question.correctAnswer
	}

	if (question.explanation) {
		savol.izoh = question.explanation
	}

	return savol
}

function urinishFormatla(urinish, options = {}) {
	const javobMap = new Map(
		(urinish.javoblar || []).map(item => [String(item.savolId), item.javob]),
	)

	const urinishMalumoti = {
		id: urinish._id,
		testSessiyaId: getRelationId(urinish.testSession),
		fanId: getRelationId(urinish.subject),
		fanNomi: getRelationName(urinish.subject),
		mavzuId: getRelationId(urinish.topic),
		mavzuNomi: getRelationName(urinish.topic),
		ishtirokchi: urinish.ishtirokchi,
		ishtirokchiMalumoti: urinish.ishtirokchiMalumoti || null,
		kirishKodi: urinish.kirishKodi || '',
		holat: urinish.holat,
		vaqtLimitMinut: urinish.vaqtLimitMinut || 0,
		tugashVaqti: urinish.tugashVaqti,
		qolganVaqtSekund:
			urinish.holat === 'yakunlangan'
				? 0
				: getTimeLeftSeconds(urinish.tugashVaqti),
		yakunlashSababi: urinish.yakunlashSababi || null,
		jamiSavollar:
			urinish.natija?.jamiSavollar || (urinish.savollar || []).length,
		javoblarSoni: (urinish.javoblar || []).length,
		boshlanganVaqt: urinish.boshlanganVaqt,
		yakunlanganVaqt: urinish.yakunlanganVaqt,
	}

	if (urinish.holat === 'yakunlangan' && urinish.natija) {
		urinishMalumoti.natija = urinish.natija
	}

	if (options.savollarniQosh) {
		urinishMalumoti.savollar = (urinish.savollar || []).map(savol => ({
			id: savol.savolId,
			savolMatni: savol.savolMatni,
			variantlar: savol.variantlar,
			qiyinlik: difficultyToUz(savol.qiyinlik),
			tartib: savol.tartib,
			ball: savol.ball,
			tanlanganJavob: javobMap.get(String(savol.savolId)) || null,
		}))
	}

	return urinishMalumoti
}

function natijaHisobla(savollar, javobMap) {
	let umumiyBall = 0
	let toplanganBall = 0
	let togriJavoblarSoni = 0
	let notogriJavoblarSoni = 0
	let javobsizSavollarSoni = 0

	const natijalar = savollar.map(question => {
		const savolId = String(question._id || question.savolId)
		const ball = question.points ?? question.ball ?? 1
		const togriJavob = question.correctAnswer || question.togriJavob
		const savolMatni = question.prompt || question.savolMatni
		const izoh = question.explanation || question.izoh || ''
		const tanlanganJavob = javobMap.get(savolId) || null
		const togri = tanlanganJavob === togriJavob

		umumiyBall += ball

		if (!tanlanganJavob) {
			javobsizSavollarSoni += 1
		} else if (togri) {
			togriJavoblarSoni += 1
			toplanganBall += ball
		} else {
			notogriJavoblarSoni += 1
		}

		return {
			savolId,
			savolMatni,
			tanlanganJavob,
			togriJavob,
			togri,
			izoh,
			ball,
		}
	})

	const ishlanganSavollarSoni = togriJavoblarSoni + notogriJavoblarSoni
	const foiz = umumiyBall
		? Number(((toplanganBall / umumiyBall) * 100).toFixed(2))
		: 0

	return {
		jamiSavollar: savollar.length,
		ishlanganSavollarSoni,
		togriJavoblarSoni,
		notogriJavoblarSoni,
		javobsizSavollarSoni,
		toplanganBall,
		umumiyBall,
		foiz,
		natijalar,
	}
}

function normalizeQuestionPayload(body, topic) {
	const savolMatni = getText(body, 'savolMatni', 'prompt')
	if (!savolMatni) {
		throw createHttpError(400, 'Savol matni majburiy')
	}

	const variantlar = body.variantlar || body.options || {}
	const normalizedOptions = {}

	for (const key of JAVOB_VARIANTLARI) {
		const optionValue = String(variantlar[key] || '').trim()
		if (!optionValue) {
			throw createHttpError(400, `variantlar.${key} qiymati majburiy`)
		}
		normalizedOptions[key] = optionValue
	}

	const togriJavob = String(body.togriJavob ?? body.correctAnswer ?? '')
		.trim()
		.toLowerCase()
	if (!JAVOB_VARIANTLARI.includes(togriJavob)) {
		throw createHttpError(
			400,
			"To'g'ri javob faqat 'a', 'b', 'c' yoki 'd' bo'lishi mumkin",
		)
	}

	const qiyinlik = normalizeDifficulty(body.qiyinlik ?? body.difficulty)
	if (!qiyinlik) {
		throw createHttpError(
			400,
			"Qiyinlik faqat oson, o'rta yoki qiyin bo'lishi mumkin",
		)
	}

	return {
		subject: topic.subject,
		topic: topic._id,
		prompt: savolMatni,
		options: normalizedOptions,
		correctAnswer: togriJavob,
		explanation: getText(body, 'izoh', 'explanation'),
		difficulty: qiyinlik,
		order: toNumber(body.tartib ?? body.order, 0),
		points: Math.max(1, toNumber(body.ball ?? body.points, 1)),
		isActive: toBoolean(body.faol ?? body.isActive, true),
	}
}

/**
 * @openapi
 * /api/sogliq:
 *   get:
 *     tags: [Sog‘liq]
 *     summary: Server va MongoDB holatini tekshirish
 *     responses:
 *       200:
 *         description: Server sog'lom ishlayapti
 */
router.get(['/sogliq', '/health'], (req, res) => {
	return yubor(res, 200, 'Server ishlayapti', {
		vaqt: new Date().toISOString(),
		ishgaTushganVaqtSekund: Math.floor(process.uptime()),
		mongoHolati: MONGO_HOLATLARI[mongoose.connection.readyState] || 'noma’lum',
	})
})

router.post('/auth/hodimlar', async (req, res) => {
	const rol = String(req.body.rol || '')
		.trim()
		.toLowerCase()
	if (!XODIM_ROLLARI.includes(rol)) {
		throw createHttpError(
			400,
			"rol faqat 'admin' yoki 'tuzilma_raxbari' bo‘lishi mumkin",
		)
	}

	const ism = getText(req.body, 'ism', 'firstName')
	const familiya = getText(req.body, 'familiya', 'lastName')
	const telefonRaqami = normalizePhoneNumber(
		req.body.telefonRaqami ?? req.body.phoneNumber ?? req.body.phone,
	)
	const tuzilmaNomi = String(
		req.body.tuzilmaNomi ?? req.body.organizationName ?? '',
	).trim()
	const parol = getText(req.body, 'parol', 'password')

	if (!ism || !familiya || !telefonRaqami || !tuzilmaNomi || !parol) {
		throw createHttpError(
			400,
			'ism, familiya, telefonRaqami, tuzilmaNomi va parol majburiy',
		)
	}

	const user = await User.create({
		firstName: ism,
		lastName: familiya,
		phoneNumber: telefonRaqami,
		organizationName: tuzilmaNomi,
		email: String(req.body.email || '').trim(),
		password: parol,
		role: rol,
		isActive: toBoolean(req.body.faol ?? req.body.isActive, true),
	})

	return yubor(res, 201, 'Xodim muvaffaqiyatli ro‘yxatga olindi', {
		xodim: xodimFormatla(user),
	})
})

router.post('/auth/kirish', async (req, res) => {
	const telefonRaqami = normalizePhoneNumber(
		req.body.telefonRaqami ?? req.body.phoneNumber ?? req.body.phone,
	)
	const parol = getText(req.body, 'parol', 'password')

	if (!telefonRaqami || !parol) {
		throw createHttpError(400, 'telefonRaqami va parol majburiy')
	}

	const user = await User.findOne({
		phoneNumber: telefonRaqami,
		isActive: true,
	})
	if (!user) {
		throw createHttpError(404, 'Bunday telefon raqamli xodim topilmadi')
	}

	if (!XODIM_ROLLARI.includes(user.role)) {
		throw createHttpError(
			403,
			'Bu kirish faqat admin va tuzilma rahbari uchun mo‘ljallangan',
		)
	}

	if (user.password !== parol) {
		throw createHttpError(401, 'Telefon raqami yoki parol noto‘g‘ri')
	}

	const { token, expiresAt } = createAccessToken(user)

	return yubor(res, 200, 'Kirish muvaffaqiyatli bajarildi', {
		xodim: xodimFormatla(user),
		accessToken: token,
		tokenType: TOKEN_TURI,
		expiresIn: TOKEN_MUDDATI_SEKUND,
		expiresAt: new Date(expiresAt * 1000).toISOString(),
	})
})

router.get(['/auth/men', '/auth/me'], async (req, res) => {
	const user = await getAuthorizedStaff(req, { required: true })

	return yubor(res, 200, 'Token tasdiqlandi', {
		xodim: xodimFormatla(user),
	})
})

router.patch(
	['/auth/profil', '/auth/profile', '/auth/men', '/auth/me'],
	async (req, res) => {
		const user = await getAuthorizedStaff(req, { required: true })
		let yangilandi = false

		if (req.body.ism !== undefined || req.body.firstName !== undefined) {
			const ism = getText(req.body, 'ism', 'firstName')
			if (!ism) {
				throw createHttpError(400, 'Ism bo‘sh bo‘lishi mumkin emas')
			}
			user.firstName = ism
			yangilandi = true
		}

		if (req.body.familiya !== undefined || req.body.lastName !== undefined) {
			const familiya = getText(req.body, 'familiya', 'lastName')
			if (!familiya) {
				throw createHttpError(400, 'Familiya bo‘sh bo‘lishi mumkin emas')
			}
			user.lastName = familiya
			yangilandi = true
		}

		if (
			req.body.telefonRaqami !== undefined ||
			req.body.phoneNumber !== undefined ||
			req.body.phone !== undefined
		) {
			const telefonRaqami = normalizePhoneNumber(
				req.body.telefonRaqami ?? req.body.phoneNumber ?? req.body.phone,
			)
			if (!telefonRaqami) {
				throw createHttpError(400, 'Telefon raqami bo‘sh bo‘lishi mumkin emas')
			}

			const boshqaXodim = await User.findOne({
				_id: { $ne: user._id },
				phoneNumber: telefonRaqami,
			})
			if (boshqaXodim) {
				throw createHttpError(409, 'Bu telefon raqami boshqa xodimga tegishli')
			}

			user.phoneNumber = telefonRaqami
			yangilandi = true
		}

		if (
			req.body.tuzilmaNomi !== undefined ||
			req.body.organizationName !== undefined
		) {
			const tuzilmaNomi = String(
				req.body.tuzilmaNomi ?? req.body.organizationName ?? '',
			).trim()
			if (!tuzilmaNomi) {
				throw createHttpError(400, 'Tuzilma nomi bo‘sh bo‘lishi mumkin emas')
			}
			user.organizationName = tuzilmaNomi
			yangilandi = true
		}

		if (req.body.email !== undefined) {
			user.email = String(req.body.email || '')
				.trim()
				.toLowerCase()
			yangilandi = true
		}

		if (req.body.parol !== undefined || req.body.password !== undefined) {
			const parol = getText(req.body, 'parol', 'password')
			if (!parol) {
				throw createHttpError(400, 'Parol bo‘sh bo‘lishi mumkin emas')
			}
			if (parol.length < 4) {
				throw createHttpError(
					400,
					'Parol kamida 4 ta belgidan iborat bo‘lishi kerak',
				)
			}
			user.password = parol
			yangilandi = true
		}

		if (!yangilandi) {
			throw createHttpError(
				400,
				'Yangilash uchun kamida bitta profil maydoni yuborilishi kerak',
			)
		}

		await user.save()

		return yubor(res, 200, 'Profil muvaffaqiyatli yangilandi', {
			xodim: xodimFormatla(user),
		})
	},
)

router.post(
	['/test-sessiyalar/boshlash', '/testlar/sessiyalar/boshlash'],
	async (req, res) => {
		const mavzuId = req.body.mavzuId || req.body.topicId
		if (!mavzuId) {
			throw createHttpError(400, 'mavzuId majburiy')
		}
		ensureObjectId(mavzuId, 'Mavzu ID')

		if (req.body.fanId || req.body.subjectId) {
			ensureObjectId(req.body.fanId || req.body.subjectId, 'Fan ID')
		}

		const vaqtMinut = Math.min(
			Math.max(toNumber(req.body.vaqtMinut ?? req.body.durationMinutes, 0), 1),
			600,
		)
		if (!vaqtMinut) {
			throw createHttpError(
				400,
				'vaqtMinut majburiy va 1 dan katta bo‘lishi kerak',
			)
		}

		let yaratuvchi = await getAuthorizedStaff(req, { required: false })
		const yaratuvchiId = req.body.yaratuvchiId || req.body.createdById
		if (yaratuvchiId) {
			ensureObjectId(yaratuvchiId, 'Yaratuvchi ID')
			yaratuvchi = await User.findById(yaratuvchiId)
			if (!yaratuvchi || !yaratuvchi.isActive) {
				throw createHttpError(404, 'Sessiyani boshlovchi xodim topilmadi')
			}
			if (!XODIM_ROLLARI.includes(yaratuvchi.role)) {
				throw createHttpError(
					403,
					'Sessiyani faqat admin yoki tuzilma rahbari boshlaydi',
				)
			}
		}

		const topic = await Topic.findOne({ _id: mavzuId, isActive: true })
			.populate('subject', 'name isActive')
			.lean()
		if (!topic || !topic.subject || topic.subject.isActive === false) {
			throw createHttpError(404, 'Mavzu topilmadi yoki faol emas')
		}

		const tanlanganFanId = String(req.body.fanId || req.body.subjectId || '')
		if (
			tanlanganFanId &&
			String(getRelationId(topic.subject)) !== tanlanganFanId
		) {
			throw createHttpError(400, 'Tanlangan fan va mavzu bir-biriga mos emas')
		}

		const faolSavollarSoni = await Question.countDocuments({
			topic: topic._id,
			isActive: true,
		})
		if (!faolSavollarSoni) {
			throw createHttpError(404, 'Bu mavzu uchun faol savollar topilmadi')
		}

		const savollarSoni = Math.min(
			Math.max(
				toNumber(
					req.body.savollarSoni ?? req.body.questionCount,
					faolSavollarSoni,
				),
				1,
			),
			faolSavollarSoni,
		)
		const aralashtir =
			String(
				req.body.aralashtir ?? req.body.shuffle ?? 'true',
			).toLowerCase() === 'true'
		const accessCode = await generateUniqueAccessCode()

		const session = await TestSession.create({
			subject: getRelationId(topic.subject),
			topic: topic._id,
			createdBy: yaratuvchi?._id || null,
			createdByName:
				yaratuvchi?.fullName ||
				fullNameFromParts(yaratuvchi?.firstName, yaratuvchi?.lastName) ||
				String(req.body.yaratuvchi || 'Admin').trim() ||
				'Admin',
			durationMinutes: vaqtMinut,
			questionCount: savollarSoni,
			shuffleQuestions: aralashtir,
			accessCode,
		})

		const sessionWithRelations = await TestSession.findById(session._id)
			.populate('subject', 'name')
			.populate('topic', 'title')
			.populate(
				'createdBy',
				'firstName lastName fullName role organizationName',
			)
			.lean()

		return yubor(
			res,
			201,
			'Test sessiyasi boshlandi va 6 xonali kod yaratildi',
			{
				kod: accessCode,
				accessCode,
				testSessiya: testSessionFormatla(sessionWithRelations),
			},
		)
	},
)

router.get('/test-sessiyalar/faol', async (req, res) => {
	const filter = { status: 'active' }

	if (req.query.mavzuId) {
		ensureObjectId(req.query.mavzuId, 'Mavzu ID')
		filter.topic = req.query.mavzuId
	}

	if (req.query.fanId) {
		ensureObjectId(req.query.fanId, 'Fan ID')
		filter.subject = req.query.fanId
	}

	const sessions = await TestSession.find(filter)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.populate('createdBy', 'firstName lastName fullName role organizationName')
		.sort({ createdAt: -1 })
		.lean()

	return yubor(res, 200, 'Faol test sessiyalari olindi', {
		jami: sessions.length,
		sessiyalar: sessions.map(testSessionFormatla),
	})
})

router.post(
	['/test-sessiyalar/kod-bilan-kirish', '/testlar/kod-bilan-kirish'],
	async (req, res) => {
		const ishtirokchiMalumoti = buildParticipantInfo(req.body, {
			strict: false,
		})
		const ishtirokchi = getParticipantName(req.body, ishtirokchiMalumoti)
		const accessCode = extractAccessCode(req.body)

		if (!/^\d{6}$/.test(accessCode)) {
			throw createHttpError(400, 'Kod 6 xonali raqam bo‘lishi kerak')
		}

		const session = await TestSession.findOne({
			accessCode,
			status: 'active',
		})
			.populate('subject', 'name isActive')
			.populate('topic', 'title isActive')
			.populate(
				'createdBy',
				'firstName lastName fullName role organizationName',
			)
			.lean()

		if (!session) {
			throw createHttpError(404, 'Kiritilgan kod bo‘yicha faol test topilmadi')
		}

		if (
			!session.topic ||
			!session.subject ||
			session.subject.isActive === false
		) {
			throw createHttpError(404, 'Bu kodga bog‘langan test hozir faol emas')
		}

		const natija = await createOrContinueSessionAttempt({
			req,
			session,
			ishtirokchiMalumoti,
			ishtirokchi,
		})

		return yubor(res, natija.status, natija.xabar, {
			kodOrqali: true,
			testSessiya: testSessionFormatla(session),
			urinish: natija.urinish,
		})
	},
)

/**
 * @openapi
 * /api/fanlar:
 *   get:
 *     tags: [Fanlar]
 *     summary: Barcha fanlarni olish
 *   post:
 *     tags: [Fanlar]
 *     summary: Yangi fan yaratish
 */
router.get(['/fanlar', '/subjects'], async (req, res) => {
	const sahifa = Math.max(
		1,
		Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
	)
	const limit = Math.min(
		Math.max(
			Math.trunc(toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10)),
			1,
		),
		100,
	)
	const qidiruvMatni = String(
		req.query.matn ?? req.query.q ?? req.query.search ?? '',
	).trim()
	const saralashMaydoni = String(
		req.query.saralashMaydoni ?? req.query.sortBy ?? 'yaratilganVaqt',
	).trim()
	const yonalish =
		String(
			req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'desc',
		)
			.trim()
			.toLowerCase() === 'asc'
			? 1
			: -1
	const sortByMap = {
		nomi: 'name',
		yaratilganVaqt: 'createdAt',
		yangilanganVaqt: 'updatedAt',
	}
	const filter = {}

	if (req.query.faol !== undefined || req.query.isActive !== undefined) {
		filter.isActive = toBoolean(req.query.faol ?? req.query.isActive, true)
	}

	if (qidiruvMatni) {
		const regex = new RegExp(escapeRegex(qidiruvMatni), 'i')
		filter.$or = [{ name: regex }, { description: regex }]
	}

	const sortBy = sortByMap[saralashMaydoni] || 'createdAt'
	const skip = (sahifa - 1) * limit

	const [jami, subjects] = await Promise.all([
		Subject.countDocuments(filter),
		Subject.find(filter)
			.sort({ [sortBy]: yonalish, _id: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
	])
	const subjectIds = subjects.map(subject => subject._id)

	const [topicCounts, questionCounts] = await Promise.all([
		subjectIds.length
			? Topic.aggregate([
					{ $match: { subject: { $in: subjectIds } } },
					{ $group: { _id: '$subject', totalTopics: { $sum: 1 } } },
				])
			: [],
		subjectIds.length
			? Question.aggregate([
					{ $match: { subject: { $in: subjectIds } } },
					{ $group: { _id: '$subject', totalQuestions: { $sum: 1 } } },
				])
			: [],
	])

	const topicMap = new Map(
		topicCounts.map(item => [String(item._id), item.totalTopics]),
	)
	const questionMap = new Map(
		questionCounts.map(item => [String(item._id), item.totalQuestions]),
	)
	const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

	return yubor(res, 200, 'Fanlar ro‘yxati olindi', {
		qidiruv: {
			matn: qidiruvMatni,
			faol:
				req.query.faol !== undefined || req.query.isActive !== undefined
					? filter.isActive
					: null,
		},
		sahifalash: {
			jami,
			sahifa,
			harSahifadagiSoni: limit,
			jamiSahifalar,
			keyingiSahifaBor: sahifa < jamiSahifalar,
			oldingiSahifaBor: sahifa > 1,
		},
		tartiblash: {
			maydon: sortByMap[saralashMaydoni] ? saralashMaydoni : 'yaratilganVaqt',
			yonalish: yonalish === 1 ? 'asc' : 'desc',
		},
		fanlar: subjects.map(subject =>
			fanFormatla(subject, {
				mavzularSoni: topicMap.get(String(subject._id)) || 0,
				savollarSoni: questionMap.get(String(subject._id)) || 0,
			}),
		),
	})
})

router.post(['/fanlar', '/subjects'], async (req, res) => {
	const nomi = getText(req.body, 'nomi', 'name')

	if (!nomi) {
		throw createHttpError(400, 'Fan nomi majburiy')
	}

	const subject = await Subject.create({
		name: nomi,
		description: getText(req.body, 'tavsif', 'description'),
		isActive: toBoolean(req.body.faol ?? req.body.isActive, true),
	})

	return yubor(res, 201, 'Fan muvaffaqiyatli yaratildi', {
		fan: fanFormatla(subject),
	})
})

router.get(['/fanlar/:fanId', '/subjects/:fanId'], async (req, res) => {
	ensureObjectId(req.params.fanId, 'Fan ID')

	const subject = await Subject.findById(req.params.fanId).lean()
	if (!subject) {
		throw createHttpError(404, 'Fan topilmadi')
	}

	const topics = await Topic.find({ subject: subject._id })
		.sort({ createdAt: -1, _id: -1 })
		.lean()

	const topicIds = topics.map(topic => topic._id)
	const questionCounts = topicIds.length
		? await Question.aggregate([
				{ $match: { topic: { $in: topicIds } } },
				{ $group: { _id: '$topic', totalQuestions: { $sum: 1 } } },
			])
		: []

	const questionMap = new Map(
		questionCounts.map(item => [String(item._id), item.totalQuestions]),
	)
	const fan = fanFormatla(subject, {
		mavzularSoni: topics.length,
		savollarSoni: questionCounts.reduce(
			(sum, item) => sum + item.totalQuestions,
			0,
		),
	})

	return yubor(res, 200, 'Fan ma’lumotlari olindi', {
		fan,
		mavzular: topics.map(topic =>
			mavzuFormatla(topic, {
				fanNomi: subject.name,
				savollarSoni: questionMap.get(String(topic._id)) || 0,
			}),
		),
	})
})

router.patch(['/fanlar/:fanId', '/subjects/:fanId'], async (req, res) => {
	ensureObjectId(req.params.fanId, 'Fan ID')

	const subject = await Subject.findById(req.params.fanId)
	if (!subject) {
		throw createHttpError(404, 'Fan topilmadi')
	}

	if (req.body.nomi !== undefined || req.body.name !== undefined) {
		const nomi = getText(req.body, 'nomi', 'name')
		if (!nomi) {
			throw createHttpError(400, "Fan nomi bo'sh bo'lishi mumkin emas")
		}
		subject.name = nomi
	}

	if (req.body.tavsif !== undefined || req.body.description !== undefined) {
		subject.description = getText(req.body, 'tavsif', 'description')
	}

	if (req.body.faol !== undefined || req.body.isActive !== undefined) {
		subject.isActive = Boolean(req.body.faol ?? req.body.isActive)
	}

	await subject.save()

	return yubor(res, 200, 'Fan yangilandi', {
		fan: fanFormatla(subject),
	})
})

router.delete(['/fanlar/:fanId', '/subjects/:fanId'], async (req, res) => {
	ensureObjectId(req.params.fanId, 'Fan ID')

	const subject = await Subject.findById(req.params.fanId)
	if (!subject) {
		throw createHttpError(404, 'Fan topilmadi')
	}

	const topics = await Topic.find({ subject: subject._id }).select('_id').lean()
	const topicIds = topics.map(topic => topic._id)

	await Promise.all([
		Topic.deleteMany({ subject: subject._id }),
		Question.deleteMany({
			$or: [{ subject: subject._id }, { topic: { $in: topicIds } }],
		}),
		subject.deleteOne(),
	])

	return yubor(res, 200, 'Fan va unga tegishli barcha ma’lumotlar o‘chirildi')
})

/**
 * @openapi
 * /api/fanlar/{fanId}/mavzular:
 *   get:
 *     tags: [Mavzular]
 *     summary: Fan ichidagi barcha mavzularni olish
 *   post:
 *     tags: [Mavzular]
 *     summary: Fan ichiga yangi mavzu qo'shish
 */
router.get(
	['/fanlar/:fanId/mavzular', '/subjects/:fanId/topics'],
	async (req, res) => {
		ensureObjectId(req.params.fanId, 'Fan ID')

		const subject = await Subject.findById(req.params.fanId).lean()
		if (!subject) {
			throw createHttpError(404, 'Fan topilmadi')
		}

		const sahifa = Math.max(
			1,
			Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
		)
		const limit = Math.min(
			Math.max(
				Math.trunc(
					toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10),
				),
				1,
			),
			100,
		)
		const qidiruvMatni = String(
			req.query.matn ?? req.query.q ?? req.query.search ?? '',
		).trim()
		const saralashMaydoni = String(
			req.query.saralashMaydoni ?? req.query.sortBy ?? 'yaratilganVaqt',
		).trim()
		const yonalish =
			String(
				req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'desc',
			)
				.trim()
				.toLowerCase() === 'asc'
				? 1
				: -1
		const topicFilter = { subject: subject._id }

		if (req.query.faol !== undefined || req.query.isActive !== undefined) {
			topicFilter.isActive = toBoolean(
				req.query.faol ?? req.query.isActive,
				true,
			)
		}

		if (qidiruvMatni) {
			const regex = new RegExp(escapeRegex(qidiruvMatni), 'i')
			topicFilter.$or = [{ title: regex }, { description: regex }]
		}

		const sortByMap = {
			nomi: 'title',
			yaratilganVaqt: 'createdAt',
			yangilanganVaqt: 'updatedAt',
		}
		const sortBy = sortByMap[saralashMaydoni] || 'createdAt'
		const skip = (sahifa - 1) * limit

		const [jami, topics] = await Promise.all([
			Topic.countDocuments(topicFilter),
			Topic.find(topicFilter)
				.sort({ [sortBy]: yonalish, _id: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
		])

		const topicIds = topics.map(topic => topic._id)
		const questionCounts = topicIds.length
			? await Question.aggregate([
					{ $match: { topic: { $in: topicIds } } },
					{ $group: { _id: '$topic', totalQuestions: { $sum: 1 } } },
				])
			: []

		const questionMap = new Map(
			questionCounts.map(item => [String(item._id), item.totalQuestions]),
		)
		const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

		return yubor(res, 200, 'Mavzular ro‘yxati olindi', {
			fan: fanFormatla(subject, {
				mavzularSoni: jami,
				savollarSoni: questionCounts.reduce(
					(sum, item) => sum + item.totalQuestions,
					0,
				),
			}),
			qidiruv: {
				matn: qidiruvMatni,
				faol:
					req.query.faol !== undefined || req.query.isActive !== undefined
						? topicFilter.isActive
						: null,
			},
			sahifalash: {
				jami,
				sahifa,
				harSahifadagiSoni: limit,
				jamiSahifalar,
				keyingiSahifaBor: sahifa < jamiSahifalar,
				oldingiSahifaBor: sahifa > 1,
			},
			tartiblash: {
				maydon: sortByMap[saralashMaydoni] ? saralashMaydoni : 'yaratilganVaqt',
				yonalish: yonalish === 1 ? 'asc' : 'desc',
			},
			mavzular: topics.map(topic =>
				mavzuFormatla(topic, {
					fanNomi: subject.name,
					savollarSoni: questionMap.get(String(topic._id)) || 0,
				}),
			),
		})
	},
)

router.post(
	['/fanlar/:fanId/mavzular', '/subjects/:fanId/topics'],
	async (req, res) => {
		ensureObjectId(req.params.fanId, 'Fan ID')

		const subject = await Subject.findById(req.params.fanId)
		if (!subject) {
			throw createHttpError(404, 'Fan topilmadi')
		}

		const nomi = getText(req.body, 'nomi', 'title')
		if (!nomi) {
			throw createHttpError(400, 'Mavzu nomi majburiy')
		}

		const topic = await Topic.create({
			subject: subject._id,
			title: nomi,
			description: getText(req.body, 'tavsif', 'description'),
			isActive: toBoolean(req.body.faol ?? req.body.isActive, true),
		})

		return yubor(res, 201, 'Mavzu muvaffaqiyatli yaratildi', {
			mavzu: mavzuFormatla(topic, { fanNomi: subject.name }),
		})
	},
)

router.get(['/mavzular/:mavzuId', '/topics/:mavzuId'], async (req, res) => {
	ensureObjectId(req.params.mavzuId, 'Mavzu ID')

	const topic = await Topic.findById(req.params.mavzuId)
		.populate('subject')
		.lean()
	if (!topic) {
		throw createHttpError(404, 'Mavzu topilmadi')
	}

	const savollarSoni = await Question.countDocuments({ topic: topic._id })

	return yubor(res, 200, 'Mavzu ma’lumotlari olindi', {
		mavzu: mavzuFormatla(topic, { savollarSoni }),
	})
})

router.patch(['/mavzular/:mavzuId', '/topics/:mavzuId'], async (req, res) => {
	ensureObjectId(req.params.mavzuId, 'Mavzu ID')

	const topic = await Topic.findById(req.params.mavzuId)
	if (!topic) {
		throw createHttpError(404, 'Mavzu topilmadi')
	}

	if (req.body.nomi !== undefined || req.body.title !== undefined) {
		const nomi = getText(req.body, 'nomi', 'title')
		if (!nomi) {
			throw createHttpError(400, "Mavzu nomi bo'sh bo'lishi mumkin emas")
		}
		topic.title = nomi
	}

	if (req.body.tavsif !== undefined || req.body.description !== undefined) {
		topic.description = getText(req.body, 'tavsif', 'description')
	}

	if (req.body.tartib !== undefined || req.body.order !== undefined) {
		topic.order = toNumber(req.body.tartib ?? req.body.order, topic.order)
	}

	if (req.body.faol !== undefined || req.body.isActive !== undefined) {
		topic.isActive = Boolean(req.body.faol ?? req.body.isActive)
	}

	await topic.save()

	return yubor(res, 200, 'Mavzu yangilandi', {
		mavzu: mavzuFormatla(topic),
	})
})

router.delete(['/mavzular/:mavzuId', '/topics/:mavzuId'], async (req, res) => {
	ensureObjectId(req.params.mavzuId, 'Mavzu ID')

	const topic = await Topic.findById(req.params.mavzuId)
	if (!topic) {
		throw createHttpError(404, 'Mavzu topilmadi')
	}

	await Promise.all([
		Question.deleteMany({ topic: topic._id }),
		topic.deleteOne(),
	])

	return yubor(res, 200, 'Mavzu va unga tegishli savollar o‘chirildi')
})

/**
 * @openapi
 * /api/mavzular/{mavzuId}/savollar:
 *   get:
 *     tags: [Savollar]
 *     summary: Mavzu ichidagi savollarni olish
 *   post:
 *     tags: [Savollar]
 *     summary: Mavzu ichiga yangi savol qo'shish
 */
router.get(
	['/mavzular/:mavzuId/savollar', '/topics/:mavzuId/questions'],
	async (req, res) => {
		ensureObjectId(req.params.mavzuId, 'Mavzu ID')

		const topic = await Topic.findById(req.params.mavzuId)
			.populate('subject')
			.lean()
		if (!topic) {
			throw createHttpError(404, 'Mavzu topilmadi')
		}

		const sahifa = Math.max(
			1,
			Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
		)
		const limit = Math.min(
			Math.max(
				Math.trunc(
					toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10),
				),
				1,
			),
			100,
		)
		const qidiruvMatni = String(
			req.query.matn ?? req.query.q ?? req.query.search ?? '',
		).trim()
		const saralashMaydoni = String(
			req.query.saralashMaydoni ?? req.query.sortBy ?? 'yaratilganVaqt',
		).trim()
		const yonalish =
			String(
				req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'desc',
			)
				.trim()
				.toLowerCase() === 'asc'
				? 1
				: -1
		const filter = { topic: topic._id }

		if (req.query.faol !== undefined || req.query.isActive !== undefined) {
			filter.isActive = toBoolean(req.query.faol ?? req.query.isActive, true)
		}

		if (qidiruvMatni) {
			const regex = new RegExp(escapeRegex(qidiruvMatni), 'i')
			filter.$or = [
				{ prompt: regex },
				{ explanation: regex },
				{ correctAnswer: regex },
				{ difficulty: regex },
				{ 'options.a': regex },
				{ 'options.b': regex },
				{ 'options.c': regex },
				{ 'options.d': regex },
			]
		}

		const sortByMap = {
			tartib: 'order',
			yaratilganVaqt: 'createdAt',
			yangilanganVaqt: 'updatedAt',
			ball: 'points',
			qiyinlik: 'difficulty',
		}
		const sortBy = sortByMap[saralashMaydoni] || 'createdAt'
		const skip = (sahifa - 1) * limit

		const [jami, questions] = await Promise.all([
			Question.countDocuments(filter),
			Question.find(filter)
				.sort({ [sortBy]: yonalish, _id: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
		])
		const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

		return yubor(res, 200, 'Savollar ro‘yxati olindi', {
			mavzu: mavzuFormatla(topic, { fanNomi: getRelationName(topic.subject) }),
			qidiruv: {
				matn: qidiruvMatni,
				faol:
					req.query.faol !== undefined || req.query.isActive !== undefined
						? filter.isActive
						: null,
			},
			sahifalash: {
				jami,
				sahifa,
				harSahifadagiSoni: limit,
				jamiSahifalar,
				keyingiSahifaBor: sahifa < jamiSahifalar,
				oldingiSahifaBor: sahifa > 1,
			},
			tartiblash: {
				maydon: sortByMap[saralashMaydoni] ? saralashMaydoni : 'yaratilganVaqt',
				yonalish: yonalish === 1 ? 'asc' : 'desc',
			},
			savollar: questions.map(question => savolFormatla(question)),
		})
	},
)

router.post(
	['/mavzular/:mavzuId/savollar', '/topics/:mavzuId/questions'],
	async (req, res) => {
		ensureObjectId(req.params.mavzuId, 'Mavzu ID')

		const topic = await Topic.findById(req.params.mavzuId)
		if (!topic) {
			throw createHttpError(404, 'Mavzu topilmadi')
		}

		const question = await Question.create(
			normalizeQuestionPayload(req.body, topic),
		)

		return yubor(res, 201, 'Savol muvaffaqiyatli qo‘shildi', {
			savol: savolFormatla(question),
		})
	},
)

router.get(['/savollar/:savolId', '/questions/:savolId'], async (req, res) => {
	ensureObjectId(req.params.savolId, 'Savol ID')

	const question = await Question.findById(req.params.savolId)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.lean()

	if (!question) {
		throw createHttpError(404, 'Savol topilmadi')
	}

	return yubor(res, 200, 'Savol ma’lumotlari olindi', {
		savol: savolFormatla(question),
	})
})

router.patch(
	['/savollar/:savolId', '/questions/:savolId'],
	async (req, res) => {
		ensureObjectId(req.params.savolId, 'Savol ID')

		const question = await Question.findById(req.params.savolId)
		if (!question) {
			throw createHttpError(404, 'Savol topilmadi')
		}

		const nextPayload = normalizeQuestionPayload(
			{
				...question.toObject(),
				...req.body,
				variantlar: {
					...question.options,
					...(req.body.variantlar || req.body.options || {}),
				},
			},
			{ _id: question.topic, subject: question.subject },
		)

		Object.assign(question, nextPayload)
		await question.save()

		return yubor(res, 200, 'Savol yangilandi', {
			savol: savolFormatla(question),
		})
	},
)

router.delete(
	['/savollar/:savolId', '/questions/:savolId'],
	async (req, res) => {
		ensureObjectId(req.params.savolId, 'Savol ID')

		const question = await Question.findById(req.params.savolId)
		if (!question) {
			throw createHttpError(404, 'Savol topilmadi')
		}

		await question.deleteOne()

		return yubor(res, 200, 'Savol o‘chirildi')
	},
)

/**
 * @openapi
 * /api/testlar/mavzular/{mavzuId}/boshlash:
 *   get:
 *     tags: [Testlar]
 *     summary: Mavzu bo'yicha testni boshlash uchun savollarni olish
 * /api/testlar/mavzular/{mavzuId}/yakunlash:
 *   post:
 *     tags: [Testlar]
 *     summary: Yechilgan test natijasini tekshirish
 */
router.get(
	['/testlar/mavzular/:mavzuId/boshlash', '/quizzes/topics/:mavzuId/start'],
	async (req, res) => {
		ensureObjectId(req.params.mavzuId, 'Mavzu ID')

		const topic = await Topic.findById(req.params.mavzuId)
			.populate('subject', 'name')
			.lean()

		if (!topic) {
			throw createHttpError(404, 'Mavzu topilmadi')
		}

		const limit = Math.min(Math.max(toNumber(req.query.limit, 20), 1), 100)
		const shouldShuffle =
			String(
				req.query.aralashtir ?? req.query.shuffle ?? 'false',
			).toLowerCase() === 'true'

		const [questions, faolSessiya] = await Promise.all([
			Question.find({ topic: topic._id, isActive: true })
				.sort({ order: 1, createdAt: 1 })
				.limit(limit)
				.lean(),
			getFaolSessiyaByMavzu(topic._id),
		])

		if (!questions.length) {
			throw createHttpError(
				404,
				'Bu mavzu uchun hali test savollari qo‘shilmagan',
			)
		}

		const preparedQuestions = shouldShuffle
			? shuffleArray(questions)
			: questions

		return yubor(res, 200, 'Test savollari tayyorlandi', {
			mavzu: mavzuFormatla(topic, { fanNomi: getRelationName(topic.subject) }),
			faolSessiya: faolSessiya ? testSessionFormatla(faolSessiya) : null,
			jamiSavollar: preparedQuestions.length,
			savollar: preparedQuestions.map(question =>
				savolFormatla(question, { testRejimi: true }),
			),
		})
	},
)

router.post(
	['/testlar/mavzular/:mavzuId/yakunlash', '/quizzes/topics/:mavzuId/submit'],
	async (req, res) => {
		ensureObjectId(req.params.mavzuId, 'Mavzu ID')

		const topic = await Topic.findById(req.params.mavzuId)
			.populate('subject', 'name')
			.lean()

		if (!topic) {
			throw createHttpError(404, 'Mavzu topilmadi')
		}

		const javoblar = req.body.javoblar || req.body.answers
		if (!Array.isArray(javoblar)) {
			throw createHttpError(
				400,
				'javoblar massiv ko‘rinishida yuborilishi kerak',
			)
		}

		const savolIdlar = Array.isArray(
			req.body.savolIdlar || req.body.questionIds,
		)
			? (req.body.savolIdlar || req.body.questionIds)
					.map(item => String(item))
					.filter(Boolean)
			: []

		for (const savolId of savolIdlar) {
			ensureObjectId(savolId, 'savolIdlar elementi')
		}

		const javobMap = new Map()
		for (const item of javoblar) {
			const savolId = item.savolId || item.questionId
			ensureObjectId(savolId, 'savolId')

			const tanlanganJavob = String(item.javob ?? item.answer ?? '')
				.trim()
				.toLowerCase()
			if (!JAVOB_VARIANTLARI.includes(tanlanganJavob)) {
				throw createHttpError(
					400,
					"Har bir javob 'a', 'b', 'c' yoki 'd' bo'lishi kerak",
				)
			}

			javobMap.set(String(savolId), tanlanganJavob)
		}

		const filter = {
			topic: topic._id,
			isActive: true,
		}

		if (savolIdlar.length) {
			filter._id = { $in: savolIdlar }
		}

		const questions = await Question.find(filter)
			.sort({ order: 1, createdAt: 1 })
			.lean()
		if (!questions.length) {
			throw createHttpError(404, 'Tekshiruv uchun savollar topilmadi')
		}

		let umumiyBall = 0
		let toplanganBall = 0
		let togriJavoblarSoni = 0
		let notogriJavoblarSoni = 0
		let javobsizSavollarSoni = 0

		const natijalar = questions.map(question => {
			umumiyBall += question.points
			const tanlanganJavob = javobMap.get(String(question._id)) || null
			const togri = tanlanganJavob === question.correctAnswer

			if (!tanlanganJavob) {
				javobsizSavollarSoni += 1
			} else if (togri) {
				togriJavoblarSoni += 1
				toplanganBall += question.points
			} else {
				notogriJavoblarSoni += 1
			}

			return {
				savolId: question._id,
				savolMatni: question.prompt,
				tanlanganJavob,
				togriJavob: question.correctAnswer,
				togri,
				izoh: question.explanation,
				ball: question.points,
			}
		})

		const ishlanganSavollarSoni = togriJavoblarSoni + notogriJavoblarSoni
		const foiz = umumiyBall
			? Number(((toplanganBall / umumiyBall) * 100).toFixed(2))
			: 0

		return yubor(res, 200, 'Test natijasi hisoblandi', {
			mavzu: mavzuFormatla(topic, { fanNomi: getRelationName(topic.subject) }),
			jamiSavollar: questions.length,
			ishlanganSavollarSoni,
			togriJavoblarSoni,
			notogriJavoblarSoni,
			javobsizSavollarSoni,
			toplanganBall,
			umumiyBall,
			foiz,
			natijalar,
		})
	},
)

router.get('/testlar/fanlar', async (req, res) => {
	const sahifa = Math.max(
		1,
		Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
	)
	const limit = Math.min(
		Math.max(
			Math.trunc(toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10)),
			1,
		),
		100,
	)
	const qidiruvMatni = String(
		req.query.matn ?? req.query.q ?? req.query.search ?? '',
	).trim()
	const saralashMaydoni = String(
		req.query.saralashMaydoni ?? req.query.sortBy ?? 'nomi',
	).trim()
	const yonalish =
		String(
			req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'asc',
		)
			.trim()
			.toLowerCase() === 'desc'
			? -1
			: 1
	const filter = { isActive: true }

	if (qidiruvMatni) {
		const regex = new RegExp(escapeRegex(qidiruvMatni), 'i')
		filter.$or = [{ name: regex }, { description: regex }]
	}

	const sortByMap = {
		nomi: 'name',
		yaratilganVaqt: 'createdAt',
		yangilanganVaqt: 'updatedAt',
	}
	const sortBy = sortByMap[saralashMaydoni] || 'name'
	const skip = (sahifa - 1) * limit

	const [jami, subjects] = await Promise.all([
		Subject.countDocuments(filter),
		Subject.find(filter)
			.sort({ [sortBy]: yonalish, _id: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
	])
	const subjectIds = subjects.map(subject => subject._id)

	const [topicCounts, questionCounts] = await Promise.all([
		subjectIds.length
			? Topic.aggregate([
					{ $match: { subject: { $in: subjectIds }, isActive: true } },
					{ $group: { _id: '$subject', totalTopics: { $sum: 1 } } },
				])
			: [],
		subjectIds.length
			? Question.aggregate([
					{ $match: { subject: { $in: subjectIds }, isActive: true } },
					{ $group: { _id: '$subject', totalQuestions: { $sum: 1 } } },
				])
			: [],
	])

	const topicMap = new Map(
		topicCounts.map(item => [String(item._id), item.totalTopics]),
	)
	const questionMap = new Map(
		questionCounts.map(item => [String(item._id), item.totalQuestions]),
	)
	const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

	return yubor(res, 200, 'Test ishlash uchun fanlar ro‘yxati tayyor', {
		qidiruv: {
			matn: qidiruvMatni,
			faol: true,
		},
		sahifalash: {
			jami,
			sahifa,
			harSahifadagiSoni: limit,
			jamiSahifalar,
			keyingiSahifaBor: sahifa < jamiSahifalar,
			oldingiSahifaBor: sahifa > 1,
		},
		tartiblash: {
			maydon: sortByMap[saralashMaydoni] ? saralashMaydoni : 'nomi',
			yonalish: yonalish === 1 ? 'asc' : 'desc',
		},
		fanlar: subjects.map(subject =>
			fanFormatla(subject, {
				mavzularSoni: topicMap.get(String(subject._id)) || 0,
				savollarSoni: questionMap.get(String(subject._id)) || 0,
			}),
		),
	})
})

router.get('/testlar/fanlar/:fanId/mavzular', async (req, res) => {
	ensureObjectId(req.params.fanId, 'Fan ID')

	const subject = await Subject.findOne({
		_id: req.params.fanId,
		isActive: true,
	}).lean()
	if (!subject) {
		throw createHttpError(404, 'Fan topilmadi yoki faol emas')
	}

	const sahifa = Math.max(
		1,
		Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
	)
	const limit = Math.min(
		Math.max(
			Math.trunc(toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10)),
			1,
		),
		100,
	)
	const qidiruvMatni = String(
		req.query.matn ?? req.query.q ?? req.query.search ?? '',
	).trim()
	const saralashMaydoni = String(
		req.query.saralashMaydoni ?? req.query.sortBy ?? 'yaratilganVaqt',
	).trim()
	const yonalish =
		String(
			req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'desc',
		)
			.trim()
			.toLowerCase() === 'asc'
			? 1
			: -1
	const filter = { subject: subject._id, isActive: true }

	if (qidiruvMatni) {
		const regex = new RegExp(escapeRegex(qidiruvMatni), 'i')
		filter.$or = [{ title: regex }, { description: regex }]
	}

	const sortByMap = {
		nomi: 'title',
		yaratilganVaqt: 'createdAt',
		yangilanganVaqt: 'updatedAt',
	}
	const sortBy = sortByMap[saralashMaydoni] || 'createdAt'
	const skip = (sahifa - 1) * limit

	const [jami, topics] = await Promise.all([
		Topic.countDocuments(filter),
		Topic.find(filter)
			.sort({ [sortBy]: yonalish, _id: -1 })
			.skip(skip)
			.limit(limit)
			.lean(),
	])

	const topicIds = topics.map(topic => topic._id)
	const questionCounts = topicIds.length
		? await Question.aggregate([
				{ $match: { topic: { $in: topicIds }, isActive: true } },
				{ $group: { _id: '$topic', totalQuestions: { $sum: 1 } } },
			])
		: []

	const questionMap = new Map(
		questionCounts.map(item => [String(item._id), item.totalQuestions]),
	)
	const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

	return yubor(res, 200, 'Test ishlash uchun mavzular ro‘yxati tayyor', {
		fan: fanFormatla(subject, {
			mavzularSoni: jami,
			savollarSoni: questionCounts.reduce(
				(sum, item) => sum + item.totalQuestions,
				0,
			),
		}),
		qidiruv: {
			matn: qidiruvMatni,
			faol: true,
		},
		sahifalash: {
			jami,
			sahifa,
			harSahifadagiSoni: limit,
			jamiSahifalar,
			keyingiSahifaBor: sahifa < jamiSahifalar,
			oldingiSahifaBor: sahifa > 1,
		},
		tartiblash: {
			maydon: sortByMap[saralashMaydoni] ? saralashMaydoni : 'yaratilganVaqt',
			yonalish: yonalish === 1 ? 'asc' : 'desc',
		},
		mavzular: topics.map(topic =>
			mavzuFormatla(topic, {
				fanNomi: subject.name,
				savollarSoni: questionMap.get(String(topic._id)) || 0,
			}),
		),
	})
})

router.get('/testlar/mavzular/:mavzuId', async (req, res) => {
	ensureObjectId(req.params.mavzuId, 'Mavzu ID')

	const topic = await Topic.findOne({ _id: req.params.mavzuId, isActive: true })
		.populate('subject', 'name isActive')
		.lean()
	if (!topic || !topic.subject || topic.subject.isActive === false) {
		throw createHttpError(404, 'Mavzu topilmadi yoki test uchun faol emas')
	}

	const [savollarSoni, faolSessiya] = await Promise.all([
		Question.countDocuments({
			topic: topic._id,
			isActive: true,
		}),
		getFaolSessiyaByMavzu(topic._id),
	])

	return yubor(res, 200, 'Mavzu test ishlash uchun tayyor', {
		mavzu: mavzuFormatla(topic, {
			fanNomi: getRelationName(topic.subject),
			savollarSoni,
		}),
		taxminiyVaqtMinut: Math.max(1, savollarSoni),
		faolSessiya: faolSessiya ? testSessionFormatla(faolSessiya) : null,
	})
})

router.post('/testlar/mavzular/:mavzuId/boshlash', async (req, res) => {
	ensureObjectId(req.params.mavzuId, 'Mavzu ID')

	const topic = await Topic.findOne({ _id: req.params.mavzuId, isActive: true })
		.populate('subject', 'name isActive')
		.lean()
	if (!topic || !topic.subject || topic.subject.isActive === false) {
		throw createHttpError(404, 'Mavzu topilmadi yoki test uchun faol emas')
	}

	const faolSavollarSoni = await Question.countDocuments({
		topic: topic._id,
		isActive: true,
	})
	if (!faolSavollarSoni) {
		throw createHttpError(404, 'Bu mavzu uchun test savollari topilmadi')
	}

	const accessCode = extractAccessCode(req.body)
	const ishtirokchiMalumoti = buildParticipantInfo(req.body, { strict: false })
	const ishtirokchi = getParticipantName(req.body, ishtirokchiMalumoti)

	if (accessCode) {
		if (!/^\d{6}$/.test(accessCode)) {
			throw createHttpError(400, 'Kod 6 xonali raqam bo‘lishi kerak')
		}

		const session = await TestSession.findOne({
			accessCode,
			topic: topic._id,
			status: 'active',
		})
			.populate('subject', 'name isActive')
			.populate('topic', 'title isActive')
			.populate(
				'createdBy',
				'firstName lastName fullName role organizationName',
			)
			.lean()

		if (
			!session ||
			!session.topic ||
			!session.subject ||
			session.subject.isActive === false
		) {
			throw createHttpError(
				404,
				'Bu mavzu uchun kiritilgan kod bo‘yicha faol test sessiyasi topilmadi',
			)
		}

		const natija = await createOrContinueSessionAttempt({
			req,
			session,
			ishtirokchiMalumoti,
			ishtirokchi,
		})

		return yubor(res, natija.status, natija.xabar, {
			kodOrqali: true,
			testSessiya: testSessionFormatla(session),
			urinish: natija.urinish,
		})
	}

	const limit = Math.min(
		Math.max(
			toNumber(
				req.body.savollarSoni ?? req.body.limit,
				Math.min(20, faolSavollarSoni),
			),
			1,
		),
		Math.min(100, faolSavollarSoni),
	)
	const shouldShuffle =
		String(req.body.aralashtir ?? req.body.shuffle ?? 'true').toLowerCase() ===
		'true'
	const vaqtLimitMinut = Math.min(
		Math.max(
			toNumber(
				req.body.vaqtMinut ?? req.body.durationMinutes,
				Math.max(1, limit),
			),
			1,
		),
		600,
	)

	const questions = await Question.find({ topic: topic._id, isActive: true })
		.sort({ order: 1, createdAt: 1 })
		.limit(limit)
		.lean()

	const preparedQuestions = shouldShuffle ? shuffleArray(questions) : questions
	const natija = natijaHisobla(preparedQuestions, new Map())

	const urinish = await TestAttempt.create({
		subject: getRelationId(topic.subject),
		topic: topic._id,
		ishtirokchi,
		ishtirokchiMalumoti,
		vaqtLimitMinut,
		tugashVaqti: new Date(Date.now() + vaqtLimitMinut * 60 * 1000),
		savollar: preparedQuestions.map(question => ({
			savolId: question._id,
			savolMatni: question.prompt,
			variantlar: question.options,
			togriJavob: question.correctAnswer,
			izoh: question.explanation,
			qiyinlik: question.difficulty,
			tartib: question.order,
			ball: question.points,
		})),
		natija: {
			jamiSavollar: natija.jamiSavollar,
			umumiyBall: natija.umumiyBall,
		},
	})

	const urinishWithRelations = await TestAttempt.findById(urinish._id)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.lean()

	return yubor(res, 201, 'Test boshlandi', {
		urinish: urinishFormatla(urinishWithRelations, { savollarniQosh: true }),
	})
})

router.get('/testlar/urinishlar/:urinishId', async (req, res) => {
	ensureObjectId(req.params.urinishId, 'Urinish ID')

	const urinish = await TestAttempt.findById(req.params.urinishId)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.populate('testSession')

	if (!urinish) {
		throw createHttpError(404, 'Test urinish topilmadi')
	}

	await ensureAttemptIsCurrent(urinish)

	return yubor(res, 200, 'Test urinish ma’lumotlari olindi', {
		urinish: urinishFormatla(urinish.toObject(), { savollarniQosh: true }),
	})
})

router.post('/testlar/urinishlar/:urinishId/javob', async (req, res) => {
	ensureObjectId(req.params.urinishId, 'Urinish ID')

	const urinish = await TestAttempt.findById(req.params.urinishId)
	if (!urinish) {
		throw createHttpError(404, 'Test urinish topilmadi')
	}

	const urinishHolati = await ensureAttemptIsCurrent(urinish)
	if (!urinishHolati.open) {
		return yubor(
			res,
			200,
			urinishHolati.autoFinished
				? 'Vaqt tugagani uchun test avtomatik yakunlandi'
				: 'Bu test allaqachon yakunlangan',
			{
				urinish: urinishFormatla(urinish.toObject(), { savollarniQosh: true }),
				natijalar: urinishHolati.natija?.natijalar || [],
			},
		)
	}

	const kiruvchiJavoblar = Array.isArray(req.body.javoblar)
		? req.body.javoblar
		: [
				{
					savolId: req.body.savolId || req.body.questionId,
					javob: req.body.javob || req.body.answer,
				},
			]

	if (!kiruvchiJavoblar.length) {
		throw createHttpError(400, 'Kamida bitta javob yuborilishi kerak')
	}

	const ruxsatEtilganSavollar = new Set(
		urinish.savollar.map(item => String(item.savolId)),
	)
	const mavjudJavoblar = new Map(
		urinish.javoblar.map(item => [String(item.savolId), item]),
	)

	for (const item of kiruvchiJavoblar) {
		const savolId = item.savolId || item.questionId
		ensureObjectId(savolId, 'savolId')

		if (!ruxsatEtilganSavollar.has(String(savolId))) {
			throw createHttpError(400, 'Bu savol ushbu test urinishiga tegishli emas')
		}

		const javob = String(item.javob || item.answer || '')
			.trim()
			.toLowerCase()
		if (!JAVOB_VARIANTLARI.includes(javob)) {
			throw createHttpError(
				400,
				"Javob faqat 'a', 'b', 'c' yoki 'd' bo'lishi mumkin",
			)
		}

		mavjudJavoblar.set(String(savolId), {
			savolId,
			javob,
			saqlanganVaqt: new Date(),
		})
	}

	urinish.javoblar = Array.from(mavjudJavoblar.values())
	await urinish.save()

	return yubor(res, 200, 'Javoblar saqlandi', {
		urinishId: urinish._id,
		javoblarSoni: urinish.javoblar.length,
		qolganSavollarSoni: Math.max(
			urinish.savollar.length - urinish.javoblar.length,
			0,
		),
		qolganVaqtSekund: getTimeLeftSeconds(urinish.tugashVaqti),
	})
})

router.post('/testlar/urinishlar/:urinishId/yakunlash', async (req, res) => {
	ensureObjectId(req.params.urinishId, 'Urinish ID')

	const urinish = await TestAttempt.findById(req.params.urinishId)
		.populate('subject', 'name')
		.populate('topic', 'title')
		.populate('testSession')

	if (!urinish) {
		throw createHttpError(404, 'Test urinish topilmadi')
	}

	const joriyHolat = await ensureAttemptIsCurrent(urinish)
	if (!joriyHolat.open) {
		return yubor(
			res,
			200,
			joriyHolat.autoFinished
				? 'Vaqt tugagani uchun test avtomatik yakunlandi'
				: 'Bu test avvalroq yakunlangan',
			{
				urinish: urinishFormatla(urinish.toObject(), { savollarniQosh: true }),
				natijalar: joriyHolat.natija?.natijalar || [],
			},
		)
	}

	if (Array.isArray(req.body.javoblar) && req.body.javoblar.length) {
		const mavjudJavoblar = new Map(
			urinish.javoblar.map(item => [String(item.savolId), item]),
		)

		for (const item of req.body.javoblar) {
			const savolId = item.savolId || item.questionId
			ensureObjectId(savolId, 'savolId')

			const javob = String(item.javob || item.answer || '')
				.trim()
				.toLowerCase()
			if (!JAVOB_VARIANTLARI.includes(javob)) {
				throw createHttpError(
					400,
					"Javob faqat 'a', 'b', 'c' yoki 'd' bo'lishi mumkin",
				)
			}

			mavjudJavoblar.set(String(savolId), {
				savolId,
				javob,
				saqlanganVaqt: new Date(),
			})
		}

		urinish.javoblar = Array.from(mavjudJavoblar.values())
	}

	const yakunlashSababi =
		urinish.tugashVaqti && new Date(urinish.tugashVaqti).getTime() <= Date.now()
			? 'vaqt_tugadi'
			: 'foydalanuvchi'
	const natija = await yakunlaUrinish(urinish, yakunlashSababi)

	return yubor(
		res,
		200,
		yakunlashSababi === 'vaqt_tugadi'
			? 'Vaqt tugagani uchun test yakunlandi'
			: 'Test muvaffaqiyatli yakunlandi',
		{
			urinish: urinishFormatla(urinish.toObject(), { savollarniQosh: true }),
			natijalar: natija.natijalar,
		},
	)
})

router.get(
	['/testlar/arxiv', '/arxiv/testlar', '/test-sessiyalar/arxiv'],
	async (req, res) => {
		await getAuthorizedStaff(req, { required: true })

		const sahifa = Math.max(
			1,
			Math.trunc(toNumber(req.query.sahifa ?? req.query.page, 1)),
		)
		const limit = Math.min(
			Math.max(
				Math.trunc(
					toNumber(req.query.harSahifadagiSoni ?? req.query.limit, 10),
				),
				1,
			),
			100,
		)
		const sortByMap = {
			yakunlanganVaqt: 'yakunlanganVaqt',
			yaratilganVaqt: 'createdAt',
			boshlanganVaqt: 'boshlanganVaqt',
			foiz: 'natija.foiz',
			toplanganBall: 'natija.toplanganBall',
		}
		const sortByKey = String(
			req.query.saralashMaydoni ?? req.query.sortBy ?? 'yakunlanganVaqt',
		).trim()
		const sortBy = sortByMap[sortByKey] || 'yakunlanganVaqt'
		const sortOrder =
			String(
				req.query.yonalish ?? req.query.sortOrder ?? req.query.tartib ?? 'desc',
			)
				.trim()
				.toLowerCase() === 'asc'
				? 1
				: -1
		const filter = await buildArchiveFilter(req.query)
		const skip = (sahifa - 1) * limit

		const [jami, urinishlar] = await Promise.all([
			TestAttempt.countDocuments(filter),
			TestAttempt.find(filter)
				.populate('subject', 'name')
				.populate('topic', 'title')
				.populate('testSession', 'accessCode status createdByName startedAt')
				.sort({ [sortBy]: sortOrder, _id: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
		])

		const jamiSahifalar = Math.max(Math.ceil(jami / limit), 1)

		return yubor(res, 200, 'Test arxivi olindi', {
			qidiruv: {
				matn: String(
					req.query.matn ?? req.query.q ?? req.query.search ?? '',
				).trim(),
				holat: filter.holat,
				fanId: req.query.fanId || null,
				mavzuId: req.query.mavzuId || null,
				testSessiyaId:
					req.query.testSessiyaId || req.query.testSessionId || null,
				kod: req.query.kod ?? req.query.accessCode ?? null,
				yakunlashSababi: req.query.yakunlashSababi || null,
			},
			sahifalash: {
				jami,
				sahifa,
				harSahifadagiSoni: limit,
				jamiSahifalar,
				keyingiSahifaBor: sahifa < jamiSahifalar,
				oldingiSahifaBor: sahifa > 1,
			},
			tartiblash: {
				maydon: sortByKey in sortByMap ? sortByKey : 'yakunlanganVaqt',
				yonalish: sortOrder === 1 ? 'asc' : 'desc',
			},
			arxivlar: urinishlar.map(arxivFormatla),
		})
	},
)

router.get(
	['/testlar/arxiv/:urinishId', '/arxiv/testlar/:urinishId'],
	async (req, res) => {
		await getAuthorizedStaff(req, { required: true })
		ensureObjectId(req.params.urinishId, 'Urinish ID')

		const urinish = await TestAttempt.findById(req.params.urinishId)
			.populate('subject', 'name')
			.populate('topic', 'title')
			.populate('testSession', 'accessCode status createdByName startedAt')

		if (!urinish) {
			throw createHttpError(404, 'Arxiv yozuvi topilmadi')
		}

		const holat = await ensureAttemptIsCurrent(urinish)
		const javobMap = new Map(
			(urinish.javoblar || []).map(item => [String(item.savolId), item.javob]),
		)
		const natija =
			holat.natija || natijaHisobla(urinish.savollar || [], javobMap)
		const urinishObject = urinish.toObject()

		return yubor(res, 200, 'Arxiv yozuvi olindi', {
			arxiv: arxivFormatla(urinishObject),
			urinish: urinishFormatla(urinishObject, { savollarniQosh: true }),
			natijalar: natija.natijalar,
		})
	},
)

module.exports = router
