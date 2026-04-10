# M-TEST-BACKEND

Node.js, MongoDB, `AdminJS` va `Swagger` bilan tayyorlangan professional backend starter loyiha.

## Qilingan ishlar

- `Express` server professional middleware'lar bilan sozlandi (`helmet`, `cors`, `morgan`).
- `MongoDB` uchun `mongoose` ulanish konfiguratsiyasi tayyorlandi.
- `AdminJS` admin panel ulandi, autentifikatsiya qo'shildi va login muammosi middleware tartibi bilan tuzatildi.
- `Swagger UI` va `docs.json` orqali API hujjatlari tayyorlandi.
- `Subject`, `Topic`, `Question` modellari bilan test platforma uchun CRUD API yozildi.
- Testni boshlash, urinish yaratish, javoblarni saqlash va yakuniy natijani hisoblash uchun to'liq test ishlash oqimi qo'shildi.
- `Admin` va `Tuzilma rahbari` uchun telefon raqami + parol orqali kirish, `Test yechuvchi` uchun esa 6 xonali kod bilan kirish oqimi qo'shildi.
- Namuna sifatida `User` modeli ham saqlandi.
- `.env.example` kengaytirildi.
- `README.md` yangilanib, ishga tushirish va boshqaruv ko'rsatmalari yozildi.

## Ishlatilgan texnologiyalar

- Node.js
- Express
- MongoDB
- Mongoose
- AdminJS
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)
- Helmet
- CORS
- Morgan
- Dotenv
- Nodemon

## Muhim endpointlar

> Public API yo'llari endi **o'zbekcha** ko'rinishda ishlatiladi.

- `GET /api/sogliq` — server va MongoDB holatini tekshiradi.
- `GET /api/fanlar` — fanlar ro'yxati.
- `POST /api/fanlar` — yangi fan yaratish.
- `GET /api/fanlar/:fanId/mavzular` — fan ichidagi mavzular.
- `POST /api/fanlar/:fanId/mavzular` — fan ichiga mavzu qo'shish.
- `GET /api/mavzular/:mavzuId/savollar` — mavzu savollari.
- `POST /api/mavzular/:mavzuId/savollar` — mavzu ichiga savol qo'shish.
- `POST /api/auth/hodimlar` — admin yoki tuzilma rahbarini oldindan ro'yxatga olish.
- `POST /api/auth/kirish` — admin va tuzilma rahbari uchun umumiy login.
- `POST /api/test-sessiyalar/boshlash` — admin tanlangan fan/mavzu va vaqt bilan testni ishga tushiradi, 6 xonali kod oladi.
- `GET /api/test-sessiyalar/faol` — faol test sessiyalarini ko'rish.
- `POST /api/test-sessiyalar/kod-bilan-kirish` — test yechuvchi ism/familiya/tuzilma/raqam va 6 xonali kod bilan testga kiradi.
- `GET /api/testlar/fanlar` — test ishlash uchun fanlarni olish.
- `GET /api/testlar/fanlar/:fanId/mavzular` — tanlangan fan mavzularini olish.
- `GET /api/testlar/mavzular/:mavzuId` — testga kirishdan oldingi mavzu ma'lumoti.
- `POST /api/testlar/mavzular/:mavzuId/boshlash` — to'g'ridan-to'g'ri test urinishini boshlash.
- `POST /api/testlar/urinishlar/:urinishId/javob` — ishlab borayotganda javobni saqlash.
- `GET /api/testlar/urinishlar/:urinishId` — test holatini qayta olish.
- `POST /api/testlar/urinishlar/:urinishId/yakunlash` — testni yakunlash.
- `POST /api/testlar/mavzular/:mavzuId/yakunlash` — test natijasini tezkor hisoblash.
- `GET /docs` — Swagger UI hujjatlari.
- `GET /docs.json` — OpenAPI JSON hujjati.
- `GET /admin` — AdminJS boshqaruv paneli.

## Papka strukturasi

```bash
src/
  config/
    adminjs.js
    db.js
    swagger.js
  models/
    User.js
  routes/
    index.js
  app.js
  server.js
```

## Ishga tushirish

1. Dependency o'rnating:
   ```bash
   npm install
   ```
2. Environment fayl yarating:
   ```bash
   Copy-Item .env.example .env
   ```
3. `.env` faylida kamida quyidagilarni tekshiring:
   - `MONGODB_URI`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `ADMIN_COOKIE_SECRET`
4. Development rejimida serverni ishga tushiring:
   ```bash
   npm run dev
   ```

## AdminJS kirish ma'lumotlari

Admin panel manzili:

```text
http://localhost:5000/admin
```

Login uchun `.env` dagi qiymatlar ishlatiladi:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Swagger hujjatlari

Swagger manzili:

```text
http://localhost:5000/docs
```

Agar JSON format kerak bo'lsa:

```text
http://localhost:5000/docs.json
```

## Test tizimi uchun namunaviy payloadlar

### 1) Fan yaratish

```json
{
	"nomi": "Matematika",
	"tavsif": "Abituriyentlar uchun matematika fanlari"
}
```

### 2) Mavzu yaratish

```json
{
	"nomi": "Kasrlar",
	"tavsif": "Oddiy va o'nli kasrlar",
	"tartib": 1
}
```

### 3) Savol qo'shish

```json
{
	"savolMatni": "2 + 2 nechiga teng?",
	"variantlar": {
		"a": "3",
		"b": "4",
		"c": "5",
		"d": "6"
	},
	"togriJavob": "b",
	"qiyinlik": "oson",
	"ball": 1,
	"izoh": "2 ga 2 qo'shilsa 4 bo'ladi"
}
```

### 4) Testni boshlash

```json
{
	"ishtirokchi": "Ali Valiyev",
	"savollarSoni": 10,
	"aralashtir": true
}
```

### 5) Ishlash jarayonida javobni saqlash

```json
{
	"savolId": "SAVOL_ID",
	"javob": "b"
}
```

### 6) Testni yakunlash

```json
{
	"javoblar": [
		{
			"savolId": "SAVOL_ID",
			"javob": "b"
		}
	]
}
```

## Test ishlash ketma-ketligi

1. Admin yoki tuzilma rahbari avval `POST /api/auth/kirish` orqali telefon raqami va parol bilan tizimga kiradi.
2. Admin `POST /api/test-sessiyalar/boshlash` ga `fanId`, `mavzuId`, `vaqtMinut` yuboradi va tizim 6 xonali `kod` qaytaradi.
3. Test yechuvchi `POST /api/test-sessiyalar/kod-bilan-kirish` orqali `ism`, `familiya`, `telefonRaqami`, `tuzilmaNomi`, `kod` yuborib testga kiradi.
4. Shu zahoti taymer orqaga sanaydi va `qolganVaqtSekund` qaytadi.
5. Har bir belgilangan javob `POST /api/testlar/urinishlar/:urinishId/javob` bilan saqlanadi.
6. Yakunda foydalanuvchi `POST /api/testlar/urinishlar/:urinishId/yakunlash` ni bosadi yoki vaqt tugasa tizim testni avtomatik yakunlaydi.
7. Javobda nechta to'g'ri, nechta noto'g'ri, nechta javobsiz qolganligi va tanlangan variantlar qaytadi.

## Environment o'zgaruvchilari

| Nomi                  | Tavsifi                                    |
| --------------------- | ------------------------------------------ |
| `PORT`                | Server porti                               |
| `NODE_ENV`            | Muhit holati (`development`, `production`) |
| `MONGODB_URI`         | MongoDB ulanish manzili                    |
| `CORS_ORIGIN`         | Ruxsat berilgan frontend origin            |
| `ADMIN_EMAIL`         | AdminJS login email                        |
| `ADMIN_PASSWORD`      | AdminJS login paroli                       |
| `SESSION_SECRET`      | Session xavfsizlik kaliti                  |
| `ADMIN_COOKIE_SECRET` | Admin cookie xavfsizlik kaliti             |

## README yuritish qoidasi

Har safar loyiha bo'yicha muhim o'zgarish qilinsa, quyidagilar `README.md` ga yozilishi shart:

- nima qo'shildi;
- nima o'zgardi;
- qanday ishga tushirish kerak;
- qanday tekshirildi;
- keyingi qadamlar.

## Keyingi tavsiyalar

- `auth`, `users`, `products` modullarini service/controller arxitekturasiga o'tkazish.
- JWT va refresh token asosida autentifikatsiya qo'shish.
- Validation uchun `zod` yoki `joi` ishlatish.
- Testlar uchun `supertest` va `node:test` yoki `vitest` qo'shish.
- Production uchun Docker va CI/CD pipeline ulash.
