# The Words — Translation Bureau

Веб-приложение для бюро переводов «The Words» (Алматы).

## Конвейер
📥 Приём → 🔍 Классификация AI → 🤖 Перевод Gemini → ✏️ Ревью → ✅ Выдача

## Интеграции
- **Google Gemini** — классификация документов + перевод с глоссариями
- **Google Sheets** — реестр заказов с цветными статусами
- **Google Drive** — 4 папки: оригиналы, AI-перевод, ревью, финал

## Деплой на Vercel (3 минуты)

### 1. Создай репозиторий на GitHub
```bash
cd the-words-vercel
git init
git add .
git commit -m "The Words Bureau v1"
git remote add origin https://github.com/ТВОЙ-ЮЗЕР/the-words.git
git push -u origin main
```

### 2. Деплой на Vercel
1. Зайди на [vercel.com](https://vercel.com)
2. Sign up через GitHub
3. **Add New → Project → Import** → выбери `the-words`
4. Нажми **Deploy**
5. Через 1-2 минуты получишь URL: `the-words-xxx.vercel.app`

### 3. Настрой Google Apps Script
1. Открой [script.google.com](https://script.google.com)
2. Новый проект → вставь код из `google-apps-script.js`
3. Запусти `setupSystem()` → дай разрешения
4. Развернуть → Веб-приложение → Доступ: Все → Развернуть
5. Скопируй URL

### 4. Подключи в приложении
1. Открой `the-words-xxx.vercel.app`
2. ⚙️ Настройки → вставь GAS URL → Подключить
3. Вставь Gemini API ключ → Сохранить
4. Готово!

## Локальный запуск
```bash
npm install
npm start
```
