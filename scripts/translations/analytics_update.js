const fs = require('fs');

const enPath = './locales/en/translation.json';
const ruPath = './locales/ru/translation.json';
const kkPath = './locales/kk/translation.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const kk = JSON.parse(fs.readFileSync(kkPath, 'utf8'));

en.analytics = {
  title: "Platform Analytics",
  desc: "Monitor CowChain token price spreads, dividend throughput, and the ledger mechanics backing the Solana herd token demo.",
  totalCows: "Total Cows",
  acrossPools: "Across on-chain pools",
  tvl: "Total Value Locked",
  assetBackedValue: "Asset-backed herd value",
  avgYield: "Average Yield",
  acrossAllTokenPools: "Across all token pools",
  totalInvestors: "Total Investors",
  walletsOpenPos: "Wallets with open positions",
  cowchainVsMarket: "CowChain vs Market Price",
  priceTooltip: "Price",
  cowchainName: "CowChain",
  marketName: "Market",
  divsDistributed: "Dividends Distributed By Herd",
  distributedTooltip: "Distributed",
  onchainMechanics: "On-chain Mechanics Overview",
  splMinting: "SPL Minting",
  splMintingDesc: "Direct buys mint CowChain tokens at the current price while reducing platform inventory. Portfolio balances update immediately for the connected wallet.",
  dividendLedger: "Dividend Ledger",
  dividendLedgerDesc: "Each cow sale appends a dividend event and allocates pending payouts by the formula tokens_owned / total_tokens * sale_price.",
  matchingEngine: "Matching Engine",
  matchingEngineDesc: "Marketplace fills consume listings, settle SOL from buyer to seller, and transfer herd shares to the buyer in one logical trade flow.",
  orderBookDepth: "Order Book Depth",
  tokensAvailableActive: "tokens available across active listings",
  dividendEvents: "Dividend Events",
  soldCowDistributions: "sold-cow distributions recorded",
  recentTransactions: "Recent Transactions",
  actionsRetained: "wallet and matching actions retained in activity log"
};

ru.analytics = {
  title: "Платформенная Аналитика",
  desc: "Мониторинг спреда цен на токены CowChain, пропускной способности дивидендов и механик реестра, лежащих в основе демо-версии токена стада на Solana.",
  totalCows: "Всего коров",
  acrossPools: "По ончейн пулам",
  tvl: "Заблокированная стоимость (TVL)",
  assetBackedValue: "Стоимость стада, обеспеченная активами",
  avgYield: "Средняя доходность",
  acrossAllTokenPools: "По всем пулам токенов",
  totalInvestors: "Всего Инвесторов",
  walletsOpenPos: "Кошельки с открытыми позициями",
  cowchainVsMarket: "CowChain против Рыночной Цены",
  priceTooltip: "Цена",
  cowchainName: "CowChain",
  marketName: "Рынок",
  divsDistributed: "Распределенные дивиденды по стадам",
  distributedTooltip: "Распределено",
  onchainMechanics: "Обзор Ончейн Механик",
  splMinting: "SPL Минтинг (выпуск)",
  splMintingDesc: "Прямые покупки чеканят токены CowChain по текущей цене, уменьшая запасы платформы. Баланс в портфолио обновляется мгновенно для подключенного кошелька.",
  dividendLedger: "Дивидендный Реестр",
  dividendLedgerDesc: "Каждая продажа коровы создает дивидендное событие и распределяет ожидаемые выплаты по формуле: (токены_пользователя) / (всего_токенов) * цена_продажи.",
  matchingEngine: "Механизм Сведения Ордеров",
  matchingEngineDesc: "Исполнение заявок на маркетплейсе поглощает листинги, рассчитывается в SOL от покупателя к продавцу и передает доли стада покупателю в едином логическом торговом потоке.",
  orderBookDepth: "Глубина Книги Ордеров",
  tokensAvailableActive: "токенов доступно в активных листингах",
  dividendEvents: "Дивидендные События",
  soldCowDistributions: "событий распределения от проданных коров записано",
  recentTransactions: "Недавние Транзакции",
  actionsRetained: "действий кошельков и сведений ордеров сохранено в логе активности"
};

kk.analytics = {
  title: "Платформа Аналитикасы",
  desc: "CowChain токен бағасының спредін, дивидендтер өткізу қабілетін және Solana ферма токенінің демо-нұсқасын қамтамасыз ететін тізілім механикасын бақылаңыз.",
  totalCows: "Барлық сиырлар",
  acrossPools: "Ончейн пулдар бойынша",
  tvl: "Бұғатталған құн (TVL)",
  assetBackedValue: "Активпен қамтамасыз етілген ферма құны",
  avgYield: "Орташа кірістілік",
  acrossAllTokenPools: "Барлық токен пулдары бойынша",
  totalInvestors: "Барлық Инвесторлар",
  walletsOpenPos: "Ашық позициялары бар әмияндар",
  cowchainVsMarket: "CowChain және Нарық бағасы",
  priceTooltip: "Бағасы",
  cowchainName: "CowChain",
  marketName: "Нарық",
  divsDistributed: "Фермалар бойынша үлестірілген дивидендтер",
  distributedTooltip: "Үлестірілді",
  onchainMechanics: "Ончейн Механикаға шолу",
  splMinting: "Токен шығару (SPL Minting)",
  splMintingDesc: "Тікелей сатып алулар платформа қорын азайта отырып, ағымдағы бағамен CowChain токендерін шығарады. Қосылған әмиян үшін портфель теңгерімі бірден жаңартылады.",
  dividendLedger: "Дивиденд Тізілімі",
  dividendLedgerDesc: "Әр сиырдың сатылымы дивидендтік оқиға жасайды және күтілетін төлемдерді мына формула бойынша бөледі: (пайдаланушы_токендері) / (барлық_токендер) * сату_бағасы.",
  matchingEngine: "Сауда-саттықты сәйкестендіру механимі",
  matchingEngineDesc: "Маркетплейстегі тапсырыстар листингтерді игереді, сатып алушы мен сатушы арасында SOL-де есеп айырысады және сиыр үлестерін бір логикалық сауда ағынында сатып алушыға береді.",
  orderBookDepth: "Тапсырыстар Кітабының Тереңдігі",
  tokensAvailableActive: "белсенді листингтердегі қолжетімді токендер",
  dividendEvents: "Дивидендтік Оқиғалар",
  soldCowDistributions: "сатылған сиырлардан үлестіру оқиғалары жазылды",
  recentTransactions: "Соңғы Транзакциялар",
  actionsRetained: "әмиян әрекеттері мен мәліметтері белсенділік журналында сақталды"
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), 'utf8');
fs.writeFileSync(kkPath, JSON.stringify(kk, null, 2), 'utf8');

// Update Page
let page = fs.readFileSync(require('path').join(__dirname, '../../app/analytics/page.tsx'), 'utf8');

if (!page.includes('useTranslation')) {
  page = page.replace(
    `import { useDemoState } from '@/components/demo-state-provider'`, 
    `import { useDemoState } from '@/components/demo-state-provider'\nimport { useTranslation } from 'react-i18next'`
  );
  
  page = page.replace(
    `  const {\n    state: { platform, herds, listings, sales, positions, transactions },       \n  } = useDemoState()`,
    `  const {\n    state: { platform, herds, listings, sales, positions, transactions },       \n  } = useDemoState()\n  const { t } = useTranslation()`
  );
}

const replacements = [
  ['<h1 className="text-3xl font-bold">Platform Analytics</h1>', '<h1 className="text-3xl font-bold">{t("analytics.title")}</h1>'],
  ['Monitor CowChain token price spreads, dividend throughput, and the ledger mechanics backing the Solana herd token demo.', '{t("analytics.desc")}'],
  ['title="Total Cows"', 'title={t("analytics.totalCows")}'],
  ['change="Across on-chain pools"', 'change={t("analytics.acrossPools")}'],
  ['title="Total Value Locked"', 'title={t("analytics.tvl")}'],
  ['change="Asset-backed herd value"', 'change={t("analytics.assetBackedValue")}'],
  ['title="Average Yield"', 'title={t("analytics.avgYield")}'],
  ['change="Across all token pools"', 'change={t("analytics.acrossAllTokenPools")}'],
  ['title="Total Investors"', 'title={t("analytics.totalInvestors")}'],
  ['change="Wallets with open positions"', 'change={t("analytics.walletsOpenPos")}'],
  ['<CardTitle>CowChain vs Market Price</CardTitle>', '<CardTitle>{t("analytics.cowchainVsMarket")}</CardTitle>'],
  ['[(formatCurrency(value)), \'Price\']', '[(formatCurrency(value)), t("analytics.priceTooltip")]'],
  ['[(formatCurrency(value)), \'Distributed\']', '[(formatCurrency(value)), t("analytics.distributedTooltip")]'],
  ['name="CowChain"', 'name={t("analytics.cowchainName")}'],
  ['name="Market"', 'name={t("analytics.marketName")}'],
  ['<CardTitle>Dividends Distributed By Herd</CardTitle>', '<CardTitle>{t("analytics.divsDistributed")}</CardTitle>'],
  ['<CardTitle>On-chain Mechanics Overview</CardTitle>', '<CardTitle>{t("analytics.onchainMechanics")}</CardTitle>'],
  ['SPL Minting\n              </div>', '{t("analytics.splMinting")}\n              </div>'],
  ['Direct buys mint CowChain tokens at the current price while reducing platform inventory. Portfolio balances update immediately for the connected wallet.', '{t("analytics.splMintingDesc")}'],
  ['Dividend Ledger\n              </div>', '{t("analytics.dividendLedger")}\n              </div>'],
  ['Each cow sale appends a dividend event and allocates pending payouts by the formula tokens_owned / total_tokens * sale_price.', '{t("analytics.dividendLedgerDesc")}'],
  ['Marketplace fills consume listings, settle SOL from buyer to seller, and transfer herd shares to the buyer in one logical trade flow.', '{t("analytics.matchingEngineDesc")}'],
  ['Matching Engine\n              </div>', '{t("analytics.matchingEngine")}\n              </div>'],
  ['<CardTitle className="text-base">Order Book Depth</CardTitle>', '<CardTitle className="text-base">{t("analytics.orderBookDepth")}</CardTitle>'],
  ['tokens available across active listings', '{t("analytics.tokensAvailableActive")}'],
  ['<CardTitle className="text-base">Dividend Events</CardTitle>', '<CardTitle className="text-base">{t("analytics.dividendEvents")}</CardTitle>'],
  ['sold-cow distributions recorded', '{t("analytics.soldCowDistributions")}'],
  ['<CardTitle className="text-base">Recent Transactions</CardTitle>', '<CardTitle className="text-base">{t("analytics.recentTransactions")}</CardTitle>'],
  ['wallet and matching actions retained in activity log', '{t("analytics.actionsRetained")}']
];

for (const [search, replace] of replacements) {
  if (page.includes(search)) {
    page = page.split(search).join(replace);
  } else {
    // some spacing might be off, fallback logic:
    const regex = new RegExp(search.replace(/\n\s*/g, '\\s*'), 'g');
    if (regex.test(page)) {
      page = page.replace(regex, replace);
    } else {
      console.warn("Could not find string to replace: " + search);
    }
  }
}

// Ensure tooltip formatting issues are handled explicitly
page = page.replace(
  /formatter=\{\(value: number\) => \[formatCurrency\(value\), 'Price'\]\}/g,
  `formatter={(value: number) => [formatCurrency(value), t("analytics.priceTooltip")]}`
);

page = page.replace(
  /formatter=\{\(value: number\) => \[formatCurrency\(value\), 'Distributed'\]\}/g,
  `formatter={(value: number) => [formatCurrency(value), t("analytics.distributedTooltip")]}`
);

fs.writeFileSync(require('path').join(__dirname, '../../app/analytics/page.tsx'), page, 'utf8');
console.log('done analytics translations');
