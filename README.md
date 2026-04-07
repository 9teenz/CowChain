![ShowCase](./public/ShowCase.png)

# CowChain

CowChain — это `Next.js 16` приложение для работы с токенизированными фермами, авторизацией пользователей, привязкой кошелька и devnet-интеграцией с Solana / Phantom
ВАЖНО: при покупке/продаже токенов откройте кошелек Phantom(расширение) и затем обновите страницу 

---

## Что есть в проекте

- `Next.js 16` + `React 19`
- `NextAuth` с JWT-сессиями
- `Prisma + SQLite` для локальной разработки
- email-верификация через SMTP, с fallback на `Ethereal`
- логин по email/паролю и по кошельку
- SPL-token админка: `/admin/token`
- devnet buy/sell flow
- unit / API / component / e2e тесты

---

## Требования для локального запуска

Для запуска проекта желательно иметь:

- `Node.js 20+` (лучше `20 LTS` или `22 LTS`)
- `npm 10+`
- браузер с установленным кошельком `Phantom`
- `Playwright` браузеры - только если будете запускать e2e тесты

> Отдельно устанавливать SQLite не нужно — база создаётся Prisma локально

---

## Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Проверить готовый `.env.local`

В репозитории уже используется готовый `.env.local`, чтобы проект можно было быстрее проверить

При необходимости просто убедитесь, что в нём актуальны основные значения:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
AUTH_SECRET="your-secret"
```


### 4. Сгенерировать Prisma client и применить миграции

```bash
npm run prisma:generate
npm run prisma:migrate
```

Если `Prisma` сообщает, что не найден `DATABASE_URL`, выполните миграцию:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm run prisma:migrate
```

### 5. Запустить dev-сервер

```bash
npm run dev
```

После запуска откройте:

- `http://localhost:3000`

---

## Переменные окружения

### Обязательные для локальной разработки

| Переменная | Назначение | Пример |
|---|---|---|
| `DATABASE_URL` | SQLite база для Prisma | `file:./dev.db` |
| `NEXTAUTH_URL` | базовый URL приложения | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | секрет NextAuth | `long-random-string` |
| `AUTH_SECRET` | совместимость с auth-конфигом | `long-random-string` |

### Опциональные для OAuth

| Переменная |
|---|
| `GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` |
| `GITHUB_ID` |
| `GITHUB_SECRET` |

Если не настроить OAuth, базовый локальный запуск всё равно возможен, но вход через Google/GitHub работать не будет

### Опциональные для email

| Переменная | Примечание |
|---|---|
| `ETHEREAL_SMTP_HOST` | по умолчанию `smtp.ethereal.email` |
| `ETHEREAL_SMTP_PORT` | по умолчанию `587` |
| `ETHEREAL_SMTP_USER` | можно не задавать |
| `ETHEREAL_SMTP_PASS` | можно не задавать |
| `EMAIL_FROM` | адрес отправителя |

> Если SMTP-переменные не заданы, приложение автоматически создаёт тестовый `Ethereal` и выводит preview URL в терминал.

### Опциональные для Solana / Phantom / админки

| Переменная | Для чего нужна |
|---|---|
| `SOLANA_CLUSTER` | кластер (`devnet`) |
| `SOLANA_RPC_URL` | RPC для серверных операций |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC для клиентских запросов |
| `NEXT_PUBLIC_COWCHAIN_PROGRAM_ID` | адрес deployed Solana program |
| `NEXT_PUBLIC_COWCHAIN_TOKEN_MINT` | mint адрес токена |
| `NEXT_PUBLIC_COWCHAIN_SOL_TREASURY` | treasury для SOL settlement |
| `NEXT_PUBLIC_SOL_USD_RATE` | курс SOL/USD для quote |
| `SOLANA_ADMIN_PRIVATE_KEY` | admin keypair в JSON-array формате |
| `SOLANA_ADMIN_EMAILS` | кто может пользоваться `/admin/token` |

> Без этих переменных интерфейс приложения в целом может открываться, но on-chain покупка/продажа и SPL-admin возможности будут ограничены

---

## Полезные команды

| Команда | Что делает |
|---|---|
| `npm run dev` | локальный dev-сервер |
| `npm run build` | production build |
| `npm run start` | запуск production build |
| `npm run lint` | ESLint проверка |
| `npm run test` | все Vitest тесты |
| `npm run test:unit` | unit + hooks + component тесты |
| `npm run test:api` | API тесты |
| `npm run test:e2e` | Playwright e2e |
| `npm run test:coverage` | покрытие тестами |
| `npm run prisma:generate` | генерация Prisma client |
| `npm run prisma:migrate` | применение локальных миграций |
| `npm run prisma:studio` | открыть Prisma Studio |
| `npm run solana:init:devnet` | инициализация devnet-настроек |
| `npm run solana:test-buy` | devnet-проверка покупки |

---

## OAuth callback URL-ы

Используйте их при настройке провайдеров:

- Google: `http://localhost:3000/api/auth/callback/google`
- GitHub: `http://localhost:3000/api/auth/callback/github`

---

## Аутентификация и защищённые маршруты

### Реализованные auth endpoints

- `POST /api/auth/register`
- `POST /api/auth/verify/request`
- `POST /api/auth/verify/confirm`
- `POST /api/wallet/link`
- `GET|POST /api/auth/[...nextauth]`

### Защищённые разделы

- `/profile/*`
- `/portfolio/*`
- `/herd/*`

---

## SPL Token Admin

Админ-панель доступна по адресу `/admin/token` для ролей `farmer` и `admin`.

### Возможности

- создание полноценного SPL mint через `@solana/spl-token`
- выпуск начального и дополнительного supply
- заполнение token metadata (`name`, `symbol`, `url`)
- просмотр текущего supply, authority и баланса держателя
- отключение `mint authority`, чтобы зафиксировать эмиссию

Минимальный пример env для этого режима:

```env
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_ADMIN_EMAILS=admin@example.com
```

Если нужно инициализировать devnet mint / platform config:

```bash
npm run solana:init:devnet
```

---

## Тестирование

Перед e2e-тестами установите браузеры Playwright:

```bash
npx playwright install chromium
```

Запуск:

```bash
npm run test
npm run test:unit
npm run test:api
npm run test:e2e
npm run test:coverage
```

---


## Troubleshooting

### Prisma не видит `DATABASE_URL`


```powershell
$env:DATABASE_URL="file:./dev.db"
npm run prisma:migrate
```

### Не запускаются e2e тесты

Установите браузер:

```bash
npx playwright install chromium
```

### Покупка через Phantom недоступна

Проверьте:

- `NEXT_PUBLIC_COWCHAIN_SOL_TREASURY`
- `NEXT_PUBLIC_COWCHAIN_PROGRAM_ID`
- `NEXT_PUBLIC_COWCHAIN_TOKEN_MINT`
- `NEXT_PUBLIC_SOLANA_RPC_URL`

### В build есть warning про `middleware`



