const fs = require('fs');

const EN_PATH = require('path').join(__dirname, '../../locales/en/translation.json');
const RU_PATH = require('path').join(__dirname, '../../locales/ru/translation.json');
const KK_PATH = require('path').join(__dirname, '../../locales/kk/translation.json');

const getJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const saveJson = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

const keys = {
  farmerRole: { en: "Farmer", ru: "Фермер", kk: "Фермер" },
  farmsPlural: { en: "farms", ru: "ферм", kk: "фермалар" },
  farmSingular: { en: "farm", ru: "ферма", kk: "ферма" },
  investorsPlural: { en: "investors", ru: "инвесторов", kk: "инвесторлар" },
  transactionsPlural: { en: "transactions", ru: "транзакций", kk: "транзакциялар" },
  transactionsFeed: { en: "Transaction Feed", ru: "Лента транзакций", kk: "Транзакциялар тізбесі" },
  allOnChainEvents: { en: "All on-chain events", ru: "Все ончейн-события", kk: "Барлық ончейн-оқиғалар" },
  noTransactionsYet: { en: "No transactions yet.", ru: "Пока нет транзакций.", kk: "Әзірге транзакциялар жоқ." },
  createFarm: { en: "Create Farm", ru: "Создать ферму", kk: "Ферма құру" },
  totalCows: { en: "Total Cows", ru: "Всего коров", kk: "Барлық сиырлар" },
  totalCowchainValue: { en: "Total CowChain Value", ru: "Общая стоимость CowChain", kk: "CowChain жалпы құны" },
  valueOfAllAssets: { en: "Value of all assets", ru: "Стоимость всех активов", kk: "Барлық активтердің құны" },
  milkRevenueMo: { en: "Milk Revenue / mo", ru: "Доход от молока / мес", kk: "Сүт табысы / айына" },
  currentMonthForecast: { en: "Current month forecast", ru: "Прогноз на текущий месяц", kk: "Ағымдағы айға болжам" },
  tabFarms: { en: "Farms", ru: "Фермы", kk: "Фермалар" },
  tabFinance: { en: "Finance", ru: "Финансы", kk: "Қаржы" },
  tabActivity: { en: "Activity", ru: "Активность", kk: "Белсенділік" },
  cowsLabel: { en: "Cows", ru: "Коровы", kk: "Сиырлар" },
  cowchainLabel: { en: "CowChain", ru: "CowChain", kk: "CowChain" },
  milkYearLabel: { en: "Milk / year", ru: "Молоко / год", kk: "Сүт / жыл" },
  tokensSoldLabel: { en: "Tokens sold", ru: "Токенов продано", kk: "Сатылған токендер" },
  soldLabel: { en: "sold", ru: "продано", kk: "сатылды" },
  addCowsBtn: { en: "Add Cows", ru: "Добавить коров", kk: "Сиырлар қосу" },
  sellCowBtn: { en: "Sell Cow", ru: "Продать корову", kk: "Сиыр сату" },
  updateRevenueBtn: { en: "Update Revenue", ru: "Обновить доход", kk: "Табысты жаңарту" },
  annualMilkRevenue: { en: "Annual Milk Revenue", ru: "Годовой доход от молока", kk: "Сүттен түсетін жылдық табыс" },
  allFarmsForecast: { en: "All farms — forecast", ru: "Все фермы — прогноз", kk: "Барлық фермалар — болжам" },
  milkRevenueByMonth: { en: "Milk Revenue by Month", ru: "Доход от молока по месяцам", kk: "Айлар бойынша сүт табысы" },
  breakdownByFarm: { en: "Breakdown by farm · last 7 months", ru: "Разбивка по фермам · последние 7 месяцев", kk: "Фермалар бойынша бөлу · соңғы 7 ай" },
  farmFinancials: { en: "Farm Financials", ru: "Финансовые показатели ферм", kk: "Фермалардың қаржылық көрсеткіштері" },
  tableFarm: { en: "Farm", ru: "Ферма", kk: "Ферма" },
  tableRevYr: { en: "Revenue (yr)", ru: "Доход (год)", kk: "Табыс (жыл)" },
  tableCowchain: { en: "CowChain", ru: "CowChain", kk: "CowChain" },
  tableRevMo: { en: "Revenue / mo", ru: "Доход / мес", kk: "Табыс / айына" },
  tableTotal: { en: "Total", ru: "Итого", kk: "Барлығы" },
  cowSaleHistory: { en: "Cow Sale History", ru: "История продаж коров", kk: "Сиыр сату тарихы" },
  tableTag: { en: "Tag", ru: "Бирка", kk: "Белгі" },
  tableSalePrice: { en: "Sale Price", ru: "Цена продажи", kk: "Сату бағасы" },
  tableDivToken: { en: "Dividend / token", ru: "Дивиденд / токен", kk: "Дивиденд / токен" },
  tableDate: { en: "Date", ru: "Дата", kk: "Күні" },
  modalAddCows: { en: "Add Cows", ru: "Добавление коров", kk: "Сиырларды қосу" },
  modalNumCows: { en: "Number of cows", ru: "Количество коров", kk: "Сиырлар саны" },
  modalCostPerCow: { en: "Cost per cow (USD)", ru: "Стоимость за корову (USD)", kk: "Құны бір сиырға (USD)" },
  modalCancel: { en: "Cancel", ru: "Отмена", kk: "Болдырмау" },
  modalAdd: { en: "Add", ru: "Добавить", kk: "Қосу" },
  modalSellCow: { en: "Sell Cow", ru: "Продажа коровы", kk: "Сиыр сату" },
  modalSellCowDesc: { en: "CowChain price will be recalculated and dividends distributed to investors", ru: "Цена CowChain будет пересчитана, и инвесторам будут выплачены дивиденды", kk: "CowChain бағасы қайта есептеледі, инвесторларға дивидендтер таратылады" },
  modalSalePriceUsd: { en: "Sale price (USD)", ru: "Цена продажи (USD)", kk: "Сату бағасы (USD)" },
  modalSellBtn: { en: "Sell", ru: "Продать", kk: "Сату" },
  modalUpdateMilkRev: { en: "Update Milk Revenue", ru: "Обновление дохода от молока", kk: "Сүт табысын жаңарту" },
  modalAnnualRevUsd: { en: "Annual revenue (USD)", ru: "Годовой доход (USD)", kk: "Жылдық табыс (USD)" },
  modalUpdateBtn: { en: "Update", ru: "Обновить", kk: "Жаңарту" },
  modalPayDivs: { en: "Pay Dividends", ru: "Выплата дивидендов", kk: "Дивидендтерді төлеу" },
  modalPayoutIn: { en: "payout in", ru: "выплата в", kk: "төлем" },
  modalTotalPayout: { en: "Total payout", ru: "Общая сумма выплаты", kk: "Жалпы төлем сомасы" },
  modalTableTokens: { en: "Tokens", ru: "Токены", kk: "Токендер" },
  modalTableShare: { en: "Share", ru: "Доля", kk: "Үлес" },
  modalTablePayout: { en: "Payout", ru: "Выплата", kk: "Төлем" },
  modalCloseBtn: { en: "Close", ru: "Закрыть", kk: "Жабу" }
};

[ { path: EN_PATH, lang: 'en' }, { path: RU_PATH, lang: 'ru' }, { path: KK_PATH, lang: 'kk' } ].forEach(({ path, lang }) => {
  const json = getJson(path);
  json.farmer = {};
  for (const [key, langMap] of Object.entries(keys)) {
    json.farmer[key] = langMap[lang];
  }
  saveJson(path, json);
});

console.log('Dictionaries updated!');
