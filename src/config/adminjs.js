const session = require('express-session')
const { default: MongoStore } = require('connect-mongo')
const mongoose = require('mongoose')
const Question = require('../models/Question')
const Subject = require('../models/Subject')
const TestAttempt = require('../models/TestAttempt')
const TestSession = require('../models/TestSession')
const Topic = require('../models/Topic')
const User = require('../models/User')

let adminInstance

function patchDocumentArrayPaths(model) {
	for (const path of Object.values(model.schema.paths)) {
		if (path?.instance === 'Array' && !path.caster && path.schema) {
			path.caster = {
				instance: null,
				schema: path.schema,
				options: path.options || {},
			}
		}
	}
}

function sanitizeUserPayload(request) {
	if (request?.method !== 'post' || !request.payload) {
		return request
	}

	if (!String(request.payload.password ?? '').trim()) {
		delete request.payload.password
	}

	return request
}

async function setupAdminPanel(app) {
	if (adminInstance) {
		return adminInstance
	}

	const [{ default: AdminJS }, AdminJSExpress, AdminJSMongoose] =
		await Promise.all([
			import('adminjs'),
			import('@adminjs/express'),
			import('@adminjs/mongoose'),
		])

	AdminJS.registerAdapter({
		Database: AdminJSMongoose.Database,
		Resource: AdminJSMongoose.Resource,
	})
	;[Subject, Topic, Question, TestSession, TestAttempt, User].forEach(
		patchDocumentArrayPaths,
	)

	const adminJs = new AdminJS({
		rootPath: '/admin',
		resources: [
			{
				resource: Subject,
				options: {
					navigation: { name: 'Test Tizimi', icon: 'Book' },
					properties: {
						name: { label: 'Fan nomi' },
						description: { label: 'Tavsif' },
						isActive: { label: 'Faol' },
						createdAt: { label: 'Yaratilgan vaqt' },
						updatedAt: { label: 'Yangilangan vaqt' },
					},
					listProperties: ['name', 'isActive', 'createdAt'],
					editProperties: ['name', 'description', 'isActive'],
					filterProperties: ['name', 'isActive', 'createdAt'],
				},
			},
			{
				resource: Topic,
				options: {
					navigation: { name: 'Test Tizimi', icon: 'Folder' },
					properties: {
						title: { label: 'Mavzu nomi' },
						subject: { label: 'Fan' },
						description: { label: 'Tavsif' },
						order: { label: 'Tartib' },
						isActive: { label: 'Faol' },
						createdAt: { label: 'Yaratilgan vaqt' },
					},
					listProperties: [
						'title',
						'subject',
						'order',
						'isActive',
						'createdAt',
					],
					editProperties: [
						'subject',
						'title',
						'description',
						'order',
						'isActive',
					],
					filterProperties: ['subject', 'title', 'isActive', 'createdAt'],
				},
			},
			{
				resource: Question,
				options: {
					navigation: { name: 'Test Tizimi', icon: 'Help' },
					properties: {
						prompt: { label: 'Savol matni' },
						topic: { label: 'Mavzu' },
						subject: { label: 'Fan' },
						correctAnswer: { label: 'To‘g‘ri javob' },
						explanation: { label: 'Izoh' },
						difficulty: { label: 'Qiyinlik' },
						order: { label: 'Tartib' },
						points: { label: 'Ball' },
						isActive: { label: 'Faol' },
					},
					listProperties: [
						'prompt',
						'topic',
						'correctAnswer',
						'difficulty',
						'isActive',
					],
					editProperties: [
						'subject',
						'topic',
						'prompt',
						'options.a',
						'options.b',
						'options.c',
						'options.d',
						'correctAnswer',
						'explanation',
						'difficulty',
						'order',
						'points',
						'isActive',
					],
					filterProperties: [
						'subject',
						'topic',
						'difficulty',
						'isActive',
						'createdAt',
					],
				},
			},
			{
				resource: TestSession,
				options: {
					navigation: { name: 'Test Tizimi', icon: 'Play' },
					properties: {
						accessCode: {
							label: '6 xonali kod',
							description: 'Kod avtomatik yaratiladi',
							isVisible: {
								list: true,
								show: true,
								filter: true,
								edit: false,
							},
						},
						durationMinutes: { label: 'Vaqt (minut)' },
						questionCount: { label: 'Savollar soni' },
						shuffleQuestions: { label: 'Aralashtirish' },
						createdByName: { label: 'Boshlagan xodim' },
						status: { label: 'Holat' },
						startedAt: { label: 'Boshlangan vaqt' },
						closedAt: { label: 'Yopilgan vaqt' },
					},
					listProperties: [
						'accessCode',
						'subject',
						'topic',
						'durationMinutes',
						'status',
						'startedAt',
					],
					showProperties: [
						'accessCode',
						'subject',
						'topic',
						'createdBy',
						'createdByName',
						'durationMinutes',
						'questionCount',
						'shuffleQuestions',
						'status',
						'startedAt',
						'closedAt',
					],
					editProperties: [
						'subject',
						'topic',
						'createdBy',
						'createdByName',
						'durationMinutes',
						'questionCount',
						'shuffleQuestions',
						'status',
					],
					filterProperties: ['subject', 'topic', 'status', 'startedAt'],
				},
			},
			{
				resource: TestAttempt,
				options: {
					navigation: { name: 'Test Tizimi', icon: 'Events' },
					properties: {
						ishtirokchi: { label: 'Ishtirokchi' },
						testSession: { label: 'Test sessiyasi' },
						topic: { label: 'Mavzu' },
						subject: { label: 'Fan' },
						holat: { label: 'Holat' },
						vaqtLimitMinut: { label: 'Vaqt limiti (minut)' },
						tugashVaqti: { label: 'Tugash vaqti' },
						yakunlashSababi: { label: 'Yakunlash sababi' },
						boshlanganVaqt: { label: 'Boshlangan vaqt' },
						yakunlanganVaqt: { label: 'Yakunlangan vaqt' },
					},
					listProperties: [
						'ishtirokchi',
						'testSession',
						'subject',
						'topic',
						'holat',
						'tugashVaqti',
					],
					showProperties: [
						'ishtirokchi',
						'ishtirokchiMalumoti.ism',
						'ishtirokchiMalumoti.familiya',
						'ishtirokchiMalumoti.telefonRaqami',
						'ishtirokchiMalumoti.tuzilmaNomi',
						'testSession',
						'kirishKodi',
						'subject',
						'topic',
						'holat',
						'vaqtLimitMinut',
						'tugashVaqti',
						'yakunlashSababi',
						'natija.jamiSavollar',
						'natija.togriJavoblarSoni',
						'natija.notogriJavoblarSoni',
						'natija.javobsizSavollarSoni',
						'natija.foiz',
						'boshlanganVaqt',
						'yakunlanganVaqt',
					],
					editProperties: [],
					filterProperties: [
						'testSession',
						'subject',
						'topic',
						'holat',
						'boshlanganVaqt',
					],
				},
			},
			{
				resource: User,
				options: {
					navigation: { name: 'Boshqaruv', icon: 'User' },
					properties: {
						firstName: { label: 'Ism' },
						lastName: { label: 'Familiya' },
						fullName: { label: 'F.I.O.' },
						phoneNumber: { label: 'Telefon raqami' },
						organizationName: { label: 'Tuzilma nomi' },
						password: {
							label: 'Parol',
							type: 'password',
							description: "Bo'sh qoldirilsa eski parol saqlanadi",
						},
						role: { label: 'Rol' },
						isActive: { label: 'Faol' },
					},
					listProperties: [
						'fullName',
						'phoneNumber',
						'organizationName',
						'role',
						'isActive',
						'createdAt',
					],
					editProperties: [
						'firstName',
						'lastName',
						'phoneNumber',
						'organizationName',
						'email',
						'password',
						'role',
						'isActive',
					],
					filterProperties: [
						'phoneNumber',
						'organizationName',
						'role',
						'isActive',
						'createdAt',
					],
					showProperties: [
						'_id',
						'firstName',
						'lastName',
						'fullName',
						'phoneNumber',
						'organizationName',
						'email',
						'role',
						'isActive',
						'createdAt',
						'updatedAt',
					],
					sort: {
						sortBy: 'createdAt',
						direction: 'desc',
					},
					actions: {
						new: { before: sanitizeUserPayload },
						edit: { before: sanitizeUserPayload },
					},
				},
			},
		],
		branding: {
			companyName: 'M-TEST-BACKEND Admin',
			withMadeWithLove: false,
			softwareBrothers: false,
		},
	})

	const adminUser = {
		email: process.env.ADMIN_EMAIL || 'admin@example.com',
		password: process.env.ADMIN_PASSWORD || 'admin12345',
	}

	const sessionOptions = {
		secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60 * 8,
		},
	}

	if (process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
		sessionOptions.store = MongoStore.create({
			mongoUrl: process.env.MONGODB_URI,
			collectionName: 'admin_sessions',
		})
	}

	const router = AdminJSExpress.buildAuthenticatedRouter(
		adminJs,
		{
			authenticate: async (email, password) => {
				if (email === adminUser.email && password === adminUser.password) {
					return { email }
				}

				return null
			},
			cookieName: 'adminjs',
			cookiePassword:
				process.env.ADMIN_COOKIE_SECRET ||
				process.env.SESSION_SECRET ||
				'dev-cookie-secret-change-me',
			maxRetries: {
				count: 3,
				duration: 10,
			},
		},
		null,
		sessionOptions,
	)

	app.use(adminJs.options.rootPath, router)
	adminInstance = adminJs

	return adminJs
}

module.exports = setupAdminPanel
