const fs = require('fs');

const path = 'app/herd/[id]/page.tsx';
let txt = fs.readFileSync(path, 'utf8');

if (!txt.includes("import { useTranslation }")) {
  txt = txt.replace("import { formatCurrency, formatNumber } from '@/lib/utils'", "import { formatCurrency, formatNumber } from '@/lib/utils'\nimport { useTranslation } from 'react-i18next'");
}

if (!txt.includes("const { t } = useTranslation()")) {
  txt = txt.replace("export default function HerdDetailsPage({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = use(params)", "export default function HerdDetailsPage({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = use(params)\n  const { t } = useTranslation()");
}

// simple replacements
const reps = {
    '>Herd not found<': ">{t('herdDetails.notFound')}<",
    "The herd you&apos;re looking for doesn&apos;t exist.": "{t('herdDetails.notFoundDesc')}",
    "Back to dashboard": "{t('herdDetails.backDashboard')}",
    "Herd size": "{t('herdDetails.herdSize')}",
    "CowChain token price": "{t('herdDetails.ccTokenPrice')}",
    "Market price": "{t('herdDetails.marketPrice')}",
    "vs CowChain": "{t('herdDetails.vsCowChain')}",
    "Total herd size": "{t('herdDetails.totalHerdSize')}",
    "Platform token supply": "{t('herdDetails.platformTokenSupply')}",
    "Available at CowChain price": "{t('herdDetails.availableTokens')}",
    "Your balance": "{t('herdDetails.yourBalance')}",
    ">Herd Fundamentals<": ">{t('herdDetails.herdFundamentals')}<",
    "Herd age": "{t('herdDetails.herdAge')}",
    "Milk production": "{t('herdDetails.milkProduction')}",
    "Expected revenue": "{t('herdDetails.expectedRevenue')}",
    "Dividends paid": "{t('herdDetails.dividendsPaid')}",
    " mo</p>": " {t('herdDetails.mo')}</p>",
    ">CowChain Price Trend<": ">{t('herdDetails.priceTrend')}<",
    ">Dividend Events<": ">{t('herdDetails.dividendEvents')}<",
    ">Sold Cows and Dividend History<": ">{t('herdDetails.soldCows')}<",
    '<th className="pb-3 font-medium">Cow</th>': "<th className=\"pb-3 font-medium\">{t('herdDetails.cow')}</th>",
    '<th className="pb-3 font-medium">Sale price</th>': "<th className=\"pb-3 font-medium\">{t('herdDetails.salePrice')}</th>",
    '<th className="pb-3 font-medium">Dividend / token</th>': "<th className=\"pb-3 font-medium\">{t('herdDetails.dividendToken')}</th>",
    '<th className="pb-3 font-medium">CowChain price move</th>': "<th className=\"pb-3 font-medium\">{t('herdDetails.priceMove')}</th>",
    '<th className="pb-3 font-medium">Settlement</th>': "<th className=\"pb-3 font-medium\">{t('herdDetails.settlement')}</th>",
    " to {formatCurrency(sale.navAfterUsd)}": " {t('herdDetails.to')} {formatCurrency(sale.navAfterUsd)}",
    ">Buy From Platform<": ">{t('herdDetails.buyPlatform')}<",
    ">Token amount<": ">{t('herdDetails.tokenAmount')}<",
    ">Settlement currency<": ">{t('herdDetails.settlementCurrency')}<",
    ">Estimated annual dividend stream<": ">{t('herdDetails.estDividend')}<",
    "Cost at CowChain price:": "{t('herdDetails.costAtPrice')}",
    ">Buy CowChain Token<": ">{t('herdDetails.buyCowChainBtn')}<",
    ">Marketplace Order Book<": ">{t('herdDetails.marketOrderBook')}<",
    " tokens</p>": " {t('herdDetails.tokens')}</p>",
    "Seller {shortenWallet": "{t('herdDetails.seller')} {shortenWallet",
    "per token": "{t('herdDetails.perToken')}",
    ">Buy from market<": ">{t('herdDetails.buyFromMarketBtn')}<",
    ">Simulate Cow Sale<": ">{t('herdDetails.simulateSale')}<",
    ">Cow sale price<": ">{t('herdDetails.cowSalePrice')}<",
    "Variant 2 payout: sale revenue is distributed proportionally to token holders, while NAV decreases only slightly.": "{t('herdDetails.variantPayout')}",
    ">Distribute dividends on-chain<": ">{t('herdDetails.distributeBtn')}<",
    "['CowChain']": "[t('herdDetails.ccTokenPrice').split(' ')[0]]",
    "['Distributed']": "[t('herdDetails.dividendsPaid')]"
};

for (const [k, v] of Object.entries(reps)) {
    txt = txt.split(k).join(v);
}
fs.writeFileSync(path, txt, 'utf8');

console.log('Herd page updated.');
