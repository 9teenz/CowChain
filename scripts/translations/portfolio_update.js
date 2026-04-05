const fs = require('fs');

const enPath = './locales/en/translation.json';
const ruPath = './locales/ru/translation.json';
const kkPath = './locales/kk/translation.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const kk = JSON.parse(fs.readFileSync(kkPath, 'utf8'));

en.portfolio = {
  title: "Portfolio Dashboard",
  desc: "Track token balances, herd-share exposure, and dividends earned across all herd pools.",
  platformTokenBalance: "PlatformToken Balance",
  acrossAllPools: "Across all herd pools",
  totalHerdShares: "Total Herd Shares",
  cows: "{{count}} cows",
  fractionalExposure: "Fractional cattle exposure",
  cowchainValue: "CowChain Value",
  cowchainValuation: "CowChain token valuation",
  marketValue: "Market Value",
  totalReturn: "{{roi}}% total return",
  valHistory: "Portfolio Value Over Time",
  divHistory: "Dividends Earned Over Time",
  portfolioTooltip: "Portfolio",
  dividendsTooltip: "Dividends",
  yourHoldings: "Your Herd Holdings",
  thHerd: "Herd",
  thTokens: "Tokens",
  thListed: "Listed",
  thShare: "Share",
  thPendingDivs: "Pending dividends",
  thMarketVal: "Market value",
  thAction: "Action",
  viewBtn: "View",
  claimQueue: "Dividend Claim Queue",
  pendingDivsVal: "Pending dividends",
  defaultPayout: "Default payout currency:",
  claimDivsBtn: "Claim dividends"
};

ru.portfolio = {
  title: "Панель Портфолио",
  desc: "Отслеживайте балансы токенов, долю в стадах и заработанные дивиденды во всех фермах.",
  platformTokenBalance: "Баланс PlatformToken",
  acrossAllPools: "По всем фермам",
  totalHerdShares: "Всего долей в фермах",
  cows: "{{count}} коров",
  fractionalExposure: "Фракционная доля владения коровами",
  cowchainValue: "Стоимость CowChain",
  cowchainValuation: "Оценка токена CowChain",
  marketValue: "Рыночная стоимость",
  totalReturn: "общая доходность {{roi}}%",
  valHistory: "Стоимость портфолио со временем",
  divHistory: "Заработанные дивиденды со временем",
  portfolioTooltip: "Портфель",
  dividendsTooltip: "Дивиденды",
  yourHoldings: "Ваши доли ферм",
  thHerd: "Ферма",
  thTokens: "Токены",
  thListed: "В продаже",
  thShare: "Доля",
  thPendingDivs: "Ожидаемые дивиденды",
  thMarketVal: "Рыночная цена",
  thAction: "Действие",
  viewBtn: "Смотреть",
  claimQueue: "Очередь выплат дивидендов",
  pendingDivsVal: "Ожидаемые дивиденды",
  defaultPayout: "Валюта выплаты по умолчанию:",
  claimDivsBtn: "Получить дивиденды"
};

kk.portfolio = {
  title: "Портфель тақтасы",
  desc: "Токен баланстарын, фермалардағы үлесіңізді және барлық фермалардан тапқан дивидендтерді қадағалаңыз.",
  platformTokenBalance: "PlatformToken балансы",
  acrossAllPools: "Барлық фермалар бойынша",
  totalHerdShares: "Барлық ферма үлестері",
  cows: "{{count}} сиыр",
  fractionalExposure: "Сиырларға фракциялық иелік ету",
  cowchainValue: "CowChain құны",
  cowchainValuation: "CowChain токенының бағасы",
  marketValue: "Нарықтық құны",
  totalReturn: "жалпы табыс {{roi}}%",
  valHistory: "Уақыт өте келе портфель құны",
  divHistory: "Уақыт өте келе жиналған дивидендтер",
  portfolioTooltip: "Портфель",
  dividendsTooltip: "Дивидендтер",
  yourHoldings: "Сіздің ферма үлестеріңіз",
  thHerd: "Ферма",
  thTokens: "Токендер",
  thListed: "Сатылымда",
  thShare: "Үлес",
  thPendingDivs: "Күтілетін дивидендтер",
  thMarketVal: "Нарықтық баға",
  thAction: "Әрекет",
  viewBtn: "Қарау",
  claimQueue: "Дивидендтерді алу кезегі",
  pendingDivsVal: "Күтілетін дивидендтер",
  defaultPayout: "Негізгі төлем валютасы:",
  claimDivsBtn: "Дивидендтерді алу"
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), 'utf8');
fs.writeFileSync(kkPath, JSON.stringify(kk, null, 2), 'utf8');

// Update Page
let page = fs.readFileSync(require('path').join(__dirname, '../../app/portfolio/page.tsx'), 'utf8');

const replacements = [
  ['<h1 className="text-4xl font-bold tracking-tight">Portfolio Dashboard</h1>', '<h1 className="text-4xl font-bold tracking-tight">{t("portfolio.title")}</h1>'],
  ['Track token balances, herd-share exposure, and dividends earned across all herd pools.', '{t("portfolio.desc")}'],
  ['title="PlatformToken Balance"', 'title={t("portfolio.platformTokenBalance")}'],
  ['change="Across all herd pools"', 'change={t("portfolio.acrossAllPools")}'],
  ['title="Total Herd Shares"', 'title={t("portfolio.totalHerdShares")}'],
  ['value={`${portfolioSummary.totalHerdShares.toFixed(2)} cows`}', 'value={t("portfolio.cows", { count: portfolioSummary.totalHerdShares.toFixed(2) })}'],
  ['change="Fractional cattle exposure"', 'change={t("portfolio.fractionalExposure")}'],
  ['title="CowChain Value"', 'title={t("portfolio.cowchainValue")}'],
  ['change="CowChain token valuation"', 'change={t("portfolio.cowchainValuation")}'],
  ['title="Market Value"', 'title={t("portfolio.marketValue")}'],
  ['change={`${roi > 0 ? \\\'+\\\' : \\\'\\\'}${roi.toFixed(2)}% total return`}', 'change={`${roi > 0 ? \\\'+\\\' : \\\'\\\'}${t("portfolio.totalReturn", { roi: roi.toFixed(2) })}`}'],
  ['<CardTitle>Portfolio Value Over Time</CardTitle>', '<CardTitle>{t("portfolio.valHistory")}</CardTitle>'],
  ['<CardTitle>Dividends Earned Over Time</CardTitle>', '<CardTitle>{t("portfolio.divHistory")}</CardTitle>'],
  ['[formatCurrency(value), \\\'Portfolio\\\']', '[formatCurrency(value), t("portfolio.portfolioTooltip")]'],
  ['[formatCurrency(value), \\\'Dividends\\\']', '[formatCurrency(value), t("portfolio.dividendsTooltip")]'],
  ['<CardTitle>Your Herd Holdings</CardTitle>', '<CardTitle>{t("portfolio.yourHoldings")}</CardTitle>'],
  ['<th className="pb-3 font-medium">Herd</th>', '<th className="pb-3 font-medium">{t("portfolio.thHerd")}</th>'],
  ['<th className="pb-3 font-medium">Tokens</th>', '<th className="pb-3 font-medium">{t("portfolio.thTokens")}</th>'],
  ['<th className="pb-3 font-medium">Listed</th>', '<th className="pb-3 font-medium">{t("portfolio.thListed")}</th>'],
  ['<th className="pb-3 font-medium">Share</th>', '<th className="pb-3 font-medium">{t("portfolio.thShare")}</th>'],
  ['<th className="pb-3 font-medium">Pending dividends</th>', '<th className="pb-3 font-medium">{t("portfolio.thPendingDivs")}</th>'],
  ['<th className="pb-3 font-medium">Market value</th>', '<th className="pb-3 font-medium">{t("portfolio.thMarketVal")}</th>'],
  ['<th className="pb-3 font-medium">Action</th>', '<th className="pb-3 font-medium">{t("portfolio.thAction")}</th>'],
  ['View <ExternalLink', '{t("portfolio.viewBtn")} <ExternalLink'],
  ['<CardTitle>Dividend Claim Queue</CardTitle>', '<CardTitle>{t("portfolio.claimQueue")}</CardTitle>'],
  ['<p className="text-sm text-muted-foreground">Pending dividends</p>', '<p className="text-sm text-muted-foreground">{t("portfolio.pendingDivsVal")}</p>'],
  ['Default payout currency:', '{t("portfolio.defaultPayout")}'],
  ['>Claim dividends<', '>{t("portfolio.claimDivsBtn")}<'],
  ['<td className="py-4 font-medium">{position.herdName}</td>', '<td className="py-4 font-medium">{t(`herds.${position.herdId}.name`, position.herdName)}</td>']
];

for (const [search, replace] of replacements) {
  if (page.includes(search)) {
    page = page.split(search).join(replace);
  } else {
    console.warn("Could not find string to replace: " + search);
  }
}

fs.writeFileSync(require('path').join(__dirname, '../../app/portfolio/page.tsx'), page, 'utf8');
console.log('done portfolio translations');
