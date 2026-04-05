const fs = require('fs');

// Read JSONs
const enPath = './locales/en/translation.json';
const ruPath = './locales/ru/translation.json';
const kkPath = './locales/kk/translation.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const kk = JSON.parse(fs.readFileSync(kkPath, 'utf8'));

en.portfolio = {
  'title': 'My Portfolio',
  'desc': 'Track your investments, herd performance, and claim dividends.',
  'val': 'Portfolio Value',
  'totalInvestments': 'Total Investments',
  'roi': 'Return on Investment',
  'claimableDivs': 'Claimable Dividends',
  'claimAll': 'Claim All',
  'valHistory': 'Portfolio Value History',
  'divHistory': 'Dividend History',
  'yourHerds': 'Your Herds',
  'viewHerd': 'View Herd',
  'noInvestments': 'No investments yet',
  'startInvesting': 'Start Investing',
  'recentTxs': 'Recent Transactions',
  'herd': 'Herd',
  'type': 'Type',
  'amount': 'Amount',
  'price': 'Price',
  'status': 'Status',
  'noTxs': 'No recent transactions',
  'types': {
    'buy': 'Buy',
    'sell': 'Sell',
    'dividend': 'Dividend'
  }
};

ru.portfolio = {
  'title': 'Моё Портфолио',
  'desc': 'Отслеживайте свои инвестиции, эффективность ферм и получайте дивиденды.',
  'val': 'Стоимость Портфолио',
  'totalInvestments': 'Всего Инвестиций',
  'roi': 'Окупаемость Инвестиций (ROI)',
  'claimableDivs': 'Доступные Дивиденды',
  'claimAll': 'Получить Все',
  'valHistory': 'История Стоимости Портфолио',
  'divHistory': 'История Дивидендов',
  'yourHerds': 'Ваши Фермы',
  'viewHerd': 'Просмотр Фермы',
  'noInvestments': 'Пока нет инвестиций',
  'startInvesting': 'Начать инвестировать',
  'recentTxs': 'Недавние Транзакции',
  'herd': 'Ферма',
  'type': 'Тип',
  'amount': 'Количество',
  'price': 'Цена',
  'status': 'Статус',
  'noTxs': 'Нет недавних транзакций',
  'types': {
    'buy': 'Покупка',
    'sell': 'Продажа',
    'dividend': 'Дивиденды'
  }
};

kk.portfolio = {
  'title': 'Менің Портфелім',
  'desc': 'Инвестицияларыңызды, фермалардың тиімділігін қадағалап, дивидендтер алыңыз.',
  'val': 'Портфель Құны',
  'totalInvestments': 'Барлық Инвестициялар',
  'roi': 'Инвестиция Қайтарымы (ROI)',
  'claimableDivs': 'Қолжетімді Дивидендтер',
  'claimAll': 'Барлығын Алу',
  'valHistory': 'Портфель Құнының Тарихы',
  'divHistory': 'Дивиденд Тарихы',
  'yourHerds': 'Сіздің Фермаларыңыз',
  'viewHerd': 'Ферманы Қарау',
  'noInvestments': 'Әзірге инвестициялар жоқ',
  'startInvesting': 'Инвестициялауды бастау',
  'recentTxs': 'Соңғы Транзакциялар',
  'herd': 'Ферма',
  'type': 'Түрі',
  'amount': 'Мөлшері',
  'price': 'Бағасы',
  'status': 'Күйі',
  'noTxs': 'Соңғы транзакциялар жоқ',
  'types': {
    'buy': 'Сатып алу',
    'sell': 'Сату',
    'dividend': 'Дивиденд'
  }
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), 'utf8');
fs.writeFileSync(kkPath, JSON.stringify(kk, null, 2), 'utf8');

// Update Page
let page = fs.readFileSync(require('path').join(__dirname, '../../app/portfolio/page.tsx'), 'utf8');

if (!page.includes('useTranslation')) {
  page = page.replace(
    'import { formatCurrency, formatNumber } from \'@/lib/utils\'', 
    'import { formatCurrency, formatNumber } from \'@/lib/utils\'\nimport { useTranslation } from \'react-i18next\''
  );
}

if (!page.includes('const { t } = useTranslation()')) {
  page = page.replace(
    'const { requireAuth } = useAuthGuard()', 
    'const { requireAuth } = useAuthGuard()\n  const { t } = useTranslation()'
  );
}

const replacements = [
  ['<h1 className="text-3xl font-bold">My Portfolio</h1>', '<h1 className="text-3xl font-bold">{t("portfolio.title")}</h1>'],
  ['<p className="text-muted-foreground">Track your investments, herd performance, and claim dividends.</p>', '<p className="text-muted-foreground">{t("portfolio.desc")}</p>'],
  ['title="Portfolio Value"', 'title={t("portfolio.val")}'],
  ['title="Total Investments"', 'title={t("portfolio.totalInvestments")}'],
  ['title="Return on Investment"', 'title={t("portfolio.roi")}'],
  ['title="Claimable Dividends"', 'title={t("portfolio.claimableDivs")}'],
  ['Claim All', '{t("portfolio.claimAll")}'],
  ['<CardTitle>Portfolio Value History</CardTitle>', '<CardTitle>{t("portfolio.valHistory")}</CardTitle>'],
  ['<CardTitle>Dividend History</CardTitle>', '<CardTitle>{t("portfolio.divHistory")}</CardTitle>'],
  ['<CardTitle>Your Herds</CardTitle>', '<CardTitle>{t("portfolio.yourHerds")}</CardTitle>'],
  ['<CardTitle>Recent Transactions</CardTitle>', '<CardTitle>{t("portfolio.recentTxs")}</CardTitle>'],
  ['<th className="px-4 py-3 text-left font-medium text-muted-foreground">Herd</th>', '<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("portfolio.herd")}</th>'],
  ['<th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>', '<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("portfolio.type")}</th>'],
  ['<th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>', '<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("portfolio.amount")}</th>'],
  ['<th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>', '<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("portfolio.price")}</th>'],
  ['<th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>', '<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("portfolio.status")}</th>'],
  ['<p className="text-muted-foreground">No investments yet</p>', '<p className="text-muted-foreground">{t("portfolio.noInvestments")}</p>'],
  ['<p className="font-medium text-muted-foreground">No recent transactions</p>', '<p className="font-medium text-muted-foreground">{t("portfolio.noTxs")}</p>'],
  ['Start Investing', '{t("portfolio.startInvesting")}'],
  ['<h3 className="font-semibold">{herd?.name}</h3>', '<h3 className="font-semibold">{t(`herds.${herd?.id}.name`, herd?.name)}</h3>'],
  ['<p className="text-sm text-muted-foreground">{herd?.location}</p>', '<p className="text-sm text-muted-foreground">{t(`herds.${herd?.id}.location`, herd?.location)}</p>'],
  ['View Herd', '{t("portfolio.viewHerd")}'],
  ['<td>{herd?.name}</td>', '<td>{t(`herds.${herd?.id}.name`, herd?.name)}</td>'],
  ['>{txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}<', '>{t(`portfolio.types.${txn.type}`)}<'],
  ['<td className="py-3 px-4 capitalize">{txn.status}</td>', '<td className="py-3 px-4 capitalize">{t(`portfolio.types.${txn.status}`, txn.status)}</td>']
];

for (const [search, replace] of replacements) {
  page = page.split(search).join(replace);
}

fs.writeFileSync(require('path').join(__dirname, '../../app/portfolio/page.tsx'), page, 'utf8');
console.log('done portfolio translations');
