![ShowCase](./public/ShowCase.png)

# CowChain

## Стек аутентификации

- NextAuth (JWT-сессия в httpOnly-куках)
- Prisma + SQLite для локальной разработки
- OAuth-провайдеры: Google и GitHub
- Верификация email через SMTP (Ethereal)
- Вход только по кошельку и эндпоинт привязки кошелька

## Локальная установка

1. Установить зависимости.
2. Создать файл переменных окружения из примера.
3. Запустить генерацию Prisma и миграцию.
4. Запустить сервер разработки.

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```



## OAuth-коллбэки

- URL коллбэка Google: `http://localhost:3000/api/auth/callback/google`
- URL коллбэка GitHub: `http://localhost:3000/api/auth/callback/github`

## Реализованные эндпоинты аутентификации

- `POST /api/auth/register`
- `POST /api/auth/verify/request`
- `POST /api/auth/verify/confirm`
- `POST /api/wallet/link`
- `GET|POST /api/auth/[...nextauth]`

## Защищённые маршруты

- `/profile/*`
- `/portfolio/*`
- `/herd/*`

## SPL Token Admin

Добавлена админ-панель по адресу `/admin/token` для ролей `farmer` и `admin`.

### Возможности

- создание полноценного SPL mint через `@solana/spl-token`
- выпуск начального и дополнительного supply
- заполнение полей токена (`name`, `symbol`, `uri`)
- просмотр текущего supply, authority и баланса держателя
- отключение `mint authority`, чтобы зафиксировать эмиссию

### Что нужно настроить

Перед использованием добавьте в окружение(если отсутствует env):

```bash
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
# опционально: список email, которым разрешён доступ к панели
SOLANA_ADMIN_EMAILS=admin@example.com
```


## Автоматизированные тесты

Установить браузеры для Playwright:

```bash
npx playwright install chromium
```

Запустить все юнит-, компонентные и интеграционные тесты API:

```bash
npm run test
```

Запустить отдельные наборы тестов:

```bash
npm run test:unit
npm run test:api
```

Запустить сквозные (e2e) тесты:

```bash
npm run test:e2e
```

Сгенерировать отчёт о покрытии:

```bash
npm run test:coverage
```

