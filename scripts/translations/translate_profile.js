const fs = require('fs');

const EN_PATH = require('path').join(__dirname, '../../locales/en/translation.json');
const RU_PATH = require('path').join(__dirname, '../../locales/ru/translation.json');
const KK_PATH = require('path').join(__dirname, '../../locales/kk/translation.json');

const getJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const saveJson = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

const keys = {
  unnamedUser: { en: "Unnamed user", ru: "Неизвестный пользователь", kk: "Атаусыз пайдаланушы" },
  noEmail: { en: "No email", ru: "Нет email", kk: "Электрондық пошта жоқ" },
  walletNotConnected: { en: "Wallet not connected", ru: "Кошелек не подключен", kk: "Әмиян қосылмаған" },
  connectWalletToLoad: { en: "Connect wallet to load balance", ru: "Подключите кошелек, чтобы загрузить баланс", kk: "Балансты жүктеу үшін әмиянды қосыңыз" },
  refreshingBalance: { en: "Refreshing balance...", ru: "Обновление баланса...", kk: "Балансты жаңарту..." },
  failedToRefresh: { en: "Failed to refresh balance", ru: "Не удалось обновить баланс", kk: "Балансты жаңарту мүмкін болмады" },
  liveBalance: { en: "Live balance", ru: "Текущий баланс", kk: "Ағымдағы баланс" },
  connected: { en: "connected", ru: "подключен", kk: "қосылған" },
  disconnected: { en: "Disconnected", ru: "Отключен", kk: "Ажыратылған" },
  farmerRole: { en: "Farmer", ru: "Фермер", kk: "Фермер" },
  registered: { en: "Registered", ru: "Зарегистрирован", kk: "Тіркелген" },
  recently: { en: "recently", ru: "недавно", kk: "жақында" },
  herdsInvested: { en: "herds invested", ru: "стад инвестировано", kk: "инвестицияланған стадалар" },
  tokensOwned: { en: "tokens owned", ru: "токенов в наличии", kk: "меншікті токендер" },
  claimEarnings: { en: "Claim Earnings", ru: "Забрать прибыль", kk: "Табысты алу" },
  tokenAdmin: { en: "Token Admin", ru: "Админ токена", kk: "Токен әкімшісі" },
  unlinking: { en: "Unlinking...", ru: "Отвязывание...", kk: "Ажырату..." },
  unlinkWallet: { en: "Unlink Wallet", ru: "Отвязать кошелек", kk: "Әмиянды ажырату" },
  logout: { en: "Logout", ru: "Выйти", kk: "Шығу" },
  solBalanceTitle: { en: "SOL Balance", ru: "Баланс SOL", kk: "SOL балансы" },
  unavailable: { en: "Unavailable", ru: "Недоступно", kk: "Қолжетімсіз" },
  refreshBtn: { en: "Refresh", ru: "Обновить", kk: "Жаңарту" },
  totalDivsEarned: { en: "Total Dividends Earned", ru: "Всего заработано дивидендов", kk: "Жалпы табылған дивидендтер" },
  claimedPending: { en: "Claimed + pending", ru: "Полученные + ожидающие", kk: "Алынған + күтілетін" },
  pendingDivs: { en: "Pending Dividends", ru: "Ожидающие дивиденды", kk: "Күтілетін дивидендтер" },
  readyToClaim: { en: "Ready to claim", ru: "Доступно для получения", kk: "Алуға дайын" },
  recentTransactions: { en: "Recent Transactions", ru: "Недавние транзакции", kk: "Соңғы транзакциялар" },
  filterAllTypes: { en: "All types", ru: "Все типы", kk: "Барлық түрлері" },
  filterNavBuy: { en: "NAV Buy", ru: "Покупка по СЧА", kk: "NAV Сатып алу" },
  filterMarketBuy: { en: "Market Buy", ru: "Рыночная покупка", kk: "Нарықтық сатып алу" },
  filterListing: { en: "Listing", ru: "Листинг", kk: "Листинг" },
  filterClaim: { en: "Claim", ru: "Получение", kk: "Алу" },
  filterCowSale: { en: "Cow Sale", ru: "Продажа коровы", kk: "Сиыр сату" },
  filterAllCurrencies: { en: "All currencies", ru: "Все валюты", kk: "Барлық валюталар" },
  resetFilters: { en: "Reset filters", ru: "Сбросить фильтры", kk: "Фильтрлерді қалпына келтіру" },
  thAction: { en: "Action", ru: "Действие", kk: "Әрекет" },
  thAmount: { en: "Amount", ru: "Сумма", kk: "Сома" },
  thCurrency: { en: "Currency", ru: "Валюта", kk: "Валюта" },
  thTransaction: { en: "Transaction", ru: "Транзакция", kk: "Транзакция" },
  thTime: { en: "Time", ru: "Время", kk: "Уақыт" },
  noTxMatch: { en: "No transactions match selected filters.", ru: "Нет транзакций, соответствующих выбранным фильтрам.", kk: "Таңдалған фильтрлерге сәйкес транзакциялар жоқ." }
};

[ { path: EN_PATH, lang: 'en' }, { path: RU_PATH, lang: 'ru' }, { path: KK_PATH, lang: 'kk' } ].forEach(({ path, lang }) => {
  const json = getJson(path);
  if (!json.profile) json.profile = {};
  for (const [key, langMap] of Object.entries(keys)) {
    json.profile[key] = langMap[lang];
  }
  saveJson(path, json);
});

console.log('Dictionaries updated!');