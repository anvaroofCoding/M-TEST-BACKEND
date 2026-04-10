const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

function setupSwagger(app) {
	const port = Number(process.env.PORT) || 5000

	const specs = swaggerJsdoc({
		definition: {
			openapi: '3.0.3',
			info: {
				title: 'M-TEST-BACKEND API Hujjatlari',
				version: '1.3.0',
				description:
					"Test yechish platformasi uchun to'liq, ishlaydigan va o'zbekcha Swagger hujjatlari.",
			},
			servers: [
				{
					url: `http://localhost:${port}`,
					description: 'Mahalliy server',
				},
			],
			tags: [
				{ name: 'Tizim', description: 'Loyiha holati va umumiy endpointlar' },
				{
					name: 'Sog‘liq',
					description: 'Server va MongoDB holatini tekshirish endpointlari',
				},
				{
					name: 'Autentifikatsiya',
					description: 'Admin va tuzilma rahbari uchun kirish endpointlari',
				},
				{
					name: 'Test sessiyalari',
					description: '6 xonali kod bilan testni boshqarish endpointlari',
				},
				{ name: 'Fanlar', description: 'Fanlar uchun CRUD endpointlari' },
				{ name: 'Mavzular', description: 'Mavzular uchun CRUD endpointlari' },
				{ name: 'Savollar', description: 'Savollar uchun CRUD endpointlari' },
				{
					name: 'Testlar',
					description: 'Testni boshlash va natijani hisoblash endpointlari',
				},
				{
					name: 'Arxiv',
					description:
						'Yakunlangan testlar arxivi, qidiruv va pagination endpointlari',
				},
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT',
						description:
							"`/api/auth/kirish` orqali token oling va Swagger'dagi Authorize tugmasi orqali kiriting.",
					},
				},
				parameters: {
					FanId: {
						name: 'fanId',
						in: 'path',
						required: true,
						schema: { type: 'string' },
						description: 'Fan identifikatori',
					},
					MavzuId: {
						name: 'mavzuId',
						in: 'path',
						required: true,
						schema: { type: 'string' },
						description: 'Mavzu identifikatori',
					},
					SavolId: {
						name: 'savolId',
						in: 'path',
						required: true,
						schema: { type: 'string' },
						description: 'Savol identifikatori',
					},
					UrinishId: {
						name: 'urinishId',
						in: 'path',
						required: true,
						schema: { type: 'string' },
						description: 'Test urinish identifikatori',
					},
				},
				schemas: {
					FanSorovi: {
						type: 'object',
						required: ['nomi'],
						properties: {
							nomi: { type: 'string', example: 'Matematika' },
							tavsif: {
								type: 'string',
								example: 'Abituriyentlar uchun matematika fani',
							},
							faol: { type: 'boolean', example: true },
						},
					},
					MavzuSorovi: {
						type: 'object',
						required: ['nomi'],
						properties: {
							nomi: { type: 'string', example: 'Kasrlar' },
							tavsif: { type: 'string', example: "Oddiy va o'nli kasrlar" },
							tartib: { type: 'number', example: 1 },
							faol: { type: 'boolean', example: true },
						},
					},
					SavolSorovi: {
						type: 'object',
						required: ['savolMatni', 'variantlar', 'togriJavob'],
						properties: {
							savolMatni: { type: 'string', example: '2 + 2 nechiga teng?' },
							variantlar: {
								type: 'object',
								required: ['a', 'b', 'c', 'd'],
								properties: {
									a: { type: 'string', example: '3' },
									b: { type: 'string', example: '4' },
									c: { type: 'string', example: '5' },
									d: { type: 'string', example: '6' },
								},
							},
							togriJavob: { type: 'string', example: 'b' },
							qiyinlik: { type: 'string', example: 'oson' },
							ball: { type: 'number', example: 1 },
							izoh: { type: 'string', example: "2 ga 2 qo'shilsa 4 bo'ladi" },
							faol: { type: 'boolean', example: true },
						},
					},
					TestBoshlashSorovi: {
						type: 'object',
						properties: {
							ishtirokchi: { type: 'string', example: 'Ali Valiyev' },
							savollarSoni: { type: 'number', example: 10 },
							aralashtir: { type: 'boolean', example: true },
						},
					},
					JavobSaqlashSorovi: {
						type: 'object',
						properties: {
							savolId: { type: 'string', example: 'SAVOL_ID' },
							javob: { type: 'string', example: 'b' },
							javoblar: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										savolId: { type: 'string', example: 'SAVOL_ID' },
										javob: { type: 'string', example: 'b' },
									},
								},
							},
						},
					},
					TestYakunlashSorovi: {
						type: 'object',
						required: ['javoblar'],
						properties: {
							savolIdlar: {
								type: 'array',
								items: { type: 'string' },
								example: ['SAVOL_ID'],
							},
							javoblar: {
								type: 'array',
								items: {
									type: 'object',
									required: ['savolId', 'javob'],
									properties: {
										savolId: { type: 'string', example: 'SAVOL_ID' },
										javob: { type: 'string', example: 'b' },
									},
								},
							},
						},
					},
					HodimRoyxatdanOtishSorovi: {
						type: 'object',
						required: [
							'ism',
							'familiya',
							'telefonRaqami',
							'tuzilmaNomi',
							'parol',
							'rol',
						],
						properties: {
							ism: { type: 'string', example: 'Ali' },
							familiya: { type: 'string', example: 'Valiyev' },
							telefonRaqami: { type: 'string', example: '+998901234567' },
							tuzilmaNomi: { type: 'string', example: '1-maktab' },
							parol: { type: 'string', example: '12345' },
							rol: {
								type: 'string',
								enum: ['admin', 'tuzilma_raxbari'],
								example: 'admin',
							},
							faol: { type: 'boolean', example: true },
						},
					},
					HodimKirishSorovi: {
						type: 'object',
						required: ['telefonRaqami', 'parol'],
						properties: {
							telefonRaqami: { type: 'string', example: '+998901234567' },
							parol: { type: 'string', example: '12345' },
						},
					},
					TestSessiyaBoshlashSorovi: {
						type: 'object',
						required: ['mavzuId', 'vaqtMinut'],
						properties: {
							yaratuvchiId: { type: 'string', example: 'ADMIN_ID' },
							fanId: { type: 'string', example: 'FAN_ID' },
							mavzuId: { type: 'string', example: 'MAVZU_ID' },
							vaqtMinut: { type: 'number', example: 30 },
							savollarSoni: { type: 'number', example: 20 },
							aralashtir: { type: 'boolean', example: true },
						},
					},
					KodBilanKirishSorovi: {
						type: 'object',
						required: [
							'ism',
							'familiya',
							'telefonRaqami',
							'tuzilmaNomi',
							'kod',
						],
						properties: {
							ism: { type: 'string', example: 'Bekzod' },
							familiya: { type: 'string', example: 'Karimov' },
							telefonRaqami: { type: 'string', example: '+998991112233' },
							tuzilmaNomi: { type: 'string', example: '1-maktab' },
							kod: { type: 'string', example: '482193' },
						},
					},
				},
			},
			paths: {
				'/api/sogliq': {
					get: {
						tags: ['Sog‘liq'],
						summary: 'Server va MongoDB holatini tekshirish',
						responses: {
							200: { description: 'Sog‘liq ma’lumoti qaytdi' },
						},
					},
				},
				'/api/auth/hodimlar': {
					post: {
						tags: ['Autentifikatsiya'],
						summary: 'Admin yoki tuzilma rahbarini oldindan ro‘yxatga olish',
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: {
										$ref: '#/components/schemas/HodimRoyxatdanOtishSorovi',
									},
								},
							},
						},
						responses: {
							201: { description: 'Xodim muvaffaqiyatli ro‘yxatdan o‘tdi' },
						},
					},
				},
				'/api/auth/kirish': {
					post: {
						tags: ['Autentifikatsiya'],
						summary:
							'Admin va tuzilma rahbari uchun telefon raqami va parol bilan kirish',
						description:
							"Bu endpoint `accessToken` qaytaradi. Uni Swagger'dagi **Authorize** tugmasiga kiriting.",
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/HodimKirishSorovi' },
								},
							},
						},
						responses: {
							200: {
								description: 'Kirish muvaffaqiyatli bajarildi va token qaytdi',
							},
						},
					},
				},
				'/api/auth/me': {
					get: {
						tags: ['Autentifikatsiya'],
						summary: 'Tokenni tekshirish va joriy xodim ma’lumotini olish',
						security: [{ bearerAuth: [] }],
						responses: {
							200: { description: 'Token tasdiqlandi' },
							401: { description: 'Token noto‘g‘ri yoki muddati tugagan' },
						},
					},
				},
				'/api/test-sessiyalar/boshlash': {
					post: {
						tags: ['Test sessiyalari'],
						summary: 'Admin testni boshlaydi va tizim 6 xonali kod qaytaradi',
						description:
							"Login orqali olingan token bilan ishlatish tavsiya qilinadi. Swagger'dagi Authorize tugmasidan foydalaning.",
						security: [{ bearerAuth: [] }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: {
										$ref: '#/components/schemas/TestSessiyaBoshlashSorovi',
									},
								},
							},
						},
						responses: {
							201: { description: 'Test sessiyasi yaratildi va kod berildi' },
						},
					},
				},
				'/api/test-sessiyalar/faol': {
					get: {
						tags: ['Test sessiyalari'],
						summary: 'Faol test sessiyalarini olish',
						parameters: [
							{
								name: 'fanId',
								in: 'query',
								schema: { type: 'string' },
								description: 'Ixtiyoriy fan bo‘yicha filter',
							},
							{
								name: 'mavzuId',
								in: 'query',
								schema: { type: 'string' },
								description: 'Ixtiyoriy mavzu bo‘yicha filter',
							},
						],
						responses: {
							200: { description: 'Faol test sessiyalari qaytdi' },
						},
					},
				},
				'/api/test-sessiyalar/kod-bilan-kirish': {
					post: {
						tags: ['Test sessiyalari'],
						summary: 'Test yechuvchi 6 xonali kod bilan kirib testni boshlaydi',
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/KodBilanKirishSorovi' },
								},
							},
						},
						responses: {
							201: { description: 'Kod tasdiqlandi va test boshlandi' },
						},
					},
				},
				'/api/fanlar': {
					get: {
						tags: ['Fanlar'],
						summary: 'Barcha fanlarni olish',
						responses: {
							200: { description: 'Fanlar ro‘yxati qaytdi' },
						},
					},
					post: {
						tags: ['Fanlar'],
						summary: 'Yangi fan yaratish',
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/FanSorovi' },
								},
							},
						},
						responses: {
							201: { description: 'Fan yaratildi' },
						},
					},
				},
				'/api/fanlar/{fanId}': {
					get: {
						tags: ['Fanlar'],
						summary: 'Bitta fan ma’lumotini olish',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						responses: { 200: { description: 'Fan ma’lumoti qaytdi' } },
					},
					patch: {
						tags: ['Fanlar'],
						summary: 'Fan ma’lumotini yangilash',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/FanSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Fan yangilandi' } },
					},
					delete: {
						tags: ['Fanlar'],
						summary: 'Fanni o‘chirish',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						responses: { 200: { description: 'Fan o‘chirildi' } },
					},
				},
				'/api/fanlar/{fanId}/mavzular': {
					get: {
						tags: ['Mavzular'],
						summary: 'Fan ichidagi mavzularni olish',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						responses: { 200: { description: 'Mavzular ro‘yxati qaytdi' } },
					},
					post: {
						tags: ['Mavzular'],
						summary: 'Fan ichiga yangi mavzu qo‘shish',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/MavzuSorovi' },
								},
							},
						},
						responses: { 201: { description: 'Mavzu yaratildi' } },
					},
				},
				'/api/mavzular/{mavzuId}': {
					get: {
						tags: ['Mavzular'],
						summary: 'Bitta mavzu ma’lumotini olish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						responses: { 200: { description: 'Mavzu ma’lumoti qaytdi' } },
					},
					patch: {
						tags: ['Mavzular'],
						summary: 'Mavzuni yangilash',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/MavzuSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Mavzu yangilandi' } },
					},
					delete: {
						tags: ['Mavzular'],
						summary: 'Mavzuni o‘chirish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						responses: { 200: { description: 'Mavzu o‘chirildi' } },
					},
				},
				'/api/mavzular/{mavzuId}/savollar': {
					get: {
						tags: ['Savollar'],
						summary: 'Mavzu ichidagi savollarni olish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						responses: { 200: { description: 'Savollar ro‘yxati qaytdi' } },
					},
					post: {
						tags: ['Savollar'],
						summary: 'Mavzu ichiga savol qo‘shish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SavolSorovi' },
								},
							},
						},
						responses: { 201: { description: 'Savol yaratildi' } },
					},
				},
				'/api/savollar/{savolId}': {
					get: {
						tags: ['Savollar'],
						summary: 'Bitta savol ma’lumotini olish',
						parameters: [{ $ref: '#/components/parameters/SavolId' }],
						responses: { 200: { description: 'Savol ma’lumoti qaytdi' } },
					},
					patch: {
						tags: ['Savollar'],
						summary: 'Savolni yangilash',
						parameters: [{ $ref: '#/components/parameters/SavolId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SavolSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Savol yangilandi' } },
					},
					delete: {
						tags: ['Savollar'],
						summary: 'Savolni o‘chirish',
						parameters: [{ $ref: '#/components/parameters/SavolId' }],
						responses: { 200: { description: 'Savol o‘chirildi' } },
					},
				},
				'/api/testlar/arxiv': {
					get: {
						tags: ['Arxiv'],
						summary:
							'Yakunlangan testlar arxivini qidiruv va pagination bilan olish',
						security: [{ bearerAuth: [] }],
						parameters: [
							{
								name: 'page',
								in: 'query',
								schema: { type: 'number', example: 1 },
								description: 'Sahifa raqami',
							},
							{
								name: 'limit',
								in: 'query',
								schema: { type: 'number', example: 10 },
								description: 'Har sahifadagi yozuvlar soni',
							},
							{
								name: 'q',
								in: 'query',
								schema: { type: 'string', example: 'Bekzod' },
								description:
									'Ishtirokchi, telefon, tuzilma, kod, fan yoki mavzu bo‘yicha qidiruv',
							},
							{
								name: 'fanId',
								in: 'query',
								schema: { type: 'string' },
								description: 'Fan bo‘yicha filter',
							},
							{
								name: 'mavzuId',
								in: 'query',
								schema: { type: 'string' },
								description: 'Mavzu bo‘yicha filter',
							},
							{
								name: 'testSessiyaId',
								in: 'query',
								schema: { type: 'string' },
								description: 'Test sessiyasi bo‘yicha filter',
							},
							{
								name: 'kod',
								in: 'query',
								schema: { type: 'string', example: '482193' },
								description: '6 xonali kod bo‘yicha filter',
							},
							{
								name: 'sortBy',
								in: 'query',
								schema: {
									type: 'string',
									enum: [
										'yakunlanganVaqt',
										'yaratilganVaqt',
										'boshlanganVaqt',
										'foiz',
										'toplanganBall',
									],
									example: 'yakunlanganVaqt',
								},
								description: 'Tartiblash maydoni',
							},
							{
								name: 'sortOrder',
								in: 'query',
								schema: {
									type: 'string',
									enum: ['asc', 'desc'],
									example: 'desc',
								},
								description: 'Tartiblash yo‘nalishi',
							},
						],
						responses: {
							200: { description: 'Arxiv ro‘yxati qaytdi' },
							401: { description: 'Token talab qilinadi' },
						},
					},
				},
				'/api/testlar/arxiv/{urinishId}': {
					get: {
						tags: ['Arxiv'],
						summary: 'Bitta arxiv yozuvining batafsil ma’lumotini olish',
						security: [{ bearerAuth: [] }],
						parameters: [{ $ref: '#/components/parameters/UrinishId' }],
						responses: {
							200: { description: 'Arxiv yozuvi qaytdi' },
							404: { description: 'Arxiv yozuvi topilmadi' },
						},
					},
				},
				'/api/testlar/fanlar': {
					get: {
						tags: ['Testlar'],
						summary: 'Test ishlash uchun faol fanlar ro‘yxatini olish',
						responses: { 200: { description: 'Faol fanlar ro‘yxati qaytdi' } },
					},
				},
				'/api/testlar/fanlar/{fanId}/mavzular': {
					get: {
						tags: ['Testlar'],
						summary: 'Tanlangan fan ichidagi test mavzularini olish',
						parameters: [{ $ref: '#/components/parameters/FanId' }],
						responses: { 200: { description: 'Mavzular ro‘yxati qaytdi' } },
					},
				},
				'/api/testlar/mavzular/{mavzuId}': {
					get: {
						tags: ['Testlar'],
						summary: 'Test ishlashdan oldin mavzu haqida qisqa ma’lumot olish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						responses: { 200: { description: 'Mavzu ma’lumoti qaytdi' } },
					},
				},
				'/api/testlar/mavzular/{mavzuId}/boshlash': {
					get: {
						tags: ['Testlar'],
						summary:
							'Testni preview ko‘rinishda boshlash uchun savollarni olish',
						parameters: [
							{ $ref: '#/components/parameters/MavzuId' },
							{
								name: 'limit',
								in: 'query',
								schema: { type: 'number', example: 20 },
							},
							{
								name: 'aralashtir',
								in: 'query',
								schema: { type: 'boolean', example: true },
							},
						],
						responses: { 200: { description: 'Test savollari tayyorlandi' } },
					},
					post: {
						tags: ['Testlar'],
						summary: 'Yangi test urinishini yaratish va testni boshlash',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						requestBody: {
							required: false,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/TestBoshlashSorovi' },
								},
							},
						},
						responses: { 201: { description: 'Test urinish yaratildi' } },
					},
				},
				'/api/testlar/urinishlar/{urinishId}': {
					get: {
						tags: ['Testlar'],
						summary: 'Boshlangan yoki yakunlangan test urinish holatini olish',
						parameters: [{ $ref: '#/components/parameters/UrinishId' }],
						responses: { 200: { description: 'Urinish ma’lumoti qaytdi' } },
					},
				},
				'/api/testlar/urinishlar/{urinishId}/javob': {
					post: {
						tags: ['Testlar'],
						summary: 'Test ishlayotganda javobni saqlash yoki yangilash',
						parameters: [{ $ref: '#/components/parameters/UrinishId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/JavobSaqlashSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Javoblar saqlandi' } },
					},
				},
				'/api/testlar/urinishlar/{urinishId}/yakunlash': {
					post: {
						tags: ['Testlar'],
						summary: 'Test urinishini yakunlash va natijani hisoblash',
						parameters: [{ $ref: '#/components/parameters/UrinishId' }],
						requestBody: {
							required: false,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/TestYakunlashSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Test urinish yakunlandi' } },
					},
				},
				'/api/testlar/mavzular/{mavzuId}/yakunlash': {
					post: {
						tags: ['Testlar'],
						summary: 'Yechilgan test natijasini tezkor tekshirish',
						parameters: [{ $ref: '#/components/parameters/MavzuId' }],
						requestBody: {
							required: true,
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/TestYakunlashSorovi' },
								},
							},
						},
						responses: { 200: { description: 'Test natijasi hisoblandi' } },
					},
				},
			},
		},
		apis: [],
	})

	app.get('/docs.json', (req, res) => {
		res.status(200).json(specs)
	})

	app.use(
		'/docs',
		swaggerUi.serve,
		swaggerUi.setup(specs, {
			explorer: true,
			customSiteTitle: 'M-TEST-BACKEND API Hujjatlari',
			swaggerOptions: {
				displayRequestDuration: true,
				docExpansion: 'list',
				persistAuthorization: true,
			},
			customCss: '.swagger-ui .topbar { display: none }',
		}),
	)
}

module.exports = setupSwagger
