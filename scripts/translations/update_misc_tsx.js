const fs = require('fs');

function applyTo(file, replacements) {
    if(!fs.existsSync(file)) return;
    let txt = fs.readFileSync(file, 'utf8');
    if(txt.includes('useTranslation')) return;
    
    txt = txt.replace(/export default function .*?\) \{/, (m) => `import { useTranslation } from 'react-i18next'\n\n${m}\n  const { t } = useTranslation()`);
    
    for (const [k, v] of Object.entries(replacements)) {
      txt = txt.split(k).join(v);
    }
    fs.writeFileSync(file, txt, 'utf8');
}

applyTo('app/contact/page.tsx', {
    '>Contact<': ">{t('contact.title')}<",
    'РЎРІСЏР¶РёС‚РµСЃСЊ СЃ РєРѕРјР°РЅРґРѕР№ СЂР°Р·СЂР°Р±Р0±РѕС‚С‡РёРєРѕРІ MilkChain РЅР°РїСЂСЏРјСѓСЋ С‡РµСЂРµР· Telegram.': "{t('contact.desc')}",
    'Свяжитесь с командой разработчиков MilkChain напрямую через Telegram.': "{t('contact.desc')}"
});

applyTo('app/documentation/page.tsx', {
    '>Documentation<': ">{t('docs.title')}<",
    'Documentation is temporarily unavailable. We are preparing a full developer and user guide.': "{t('docs.desc')}"
});

applyTo('app/faq/page.tsx', {
    '>FAQ<': ">{t('faq.title')}<",
    'Answers to common questions about CowChain.': "{t('faq.desc')}",
    "'What is CowChain?'": "t('faq.q1')",
    "'CowChain is a platform where herd pools are tokenized so users can buy, hold, and trade herd shares with transparent portfolio tracking.'": "t('faq.a1')",
    "'How do I start using the platform?'": "t('faq.q2')",
    "'Create an account, verify your email, connect your wallet, and then open Marketplace or Herd pages to explore available pools.'": "t('faq.a2')",
    "'Can I use devnet wallets?'": "t('faq.q3')",
    "'Yes. If your Phantom wallet is on devnet, CowChain balance tools will try to detect and use that network for wallet balance checks.'": "t('faq.a3')",
    "'How are dividends handled?'": "t('faq.q4')",
    "'Dividends are reflected in your portfolio metrics, and you can claim available rewards from your profile when they are ready.'": "t('faq.a4')",
    "'Is this investment advice?'": "t('faq.q5')",
    "'No. CowChain provides tooling and analytics only and does not provide financial, legal, or tax advice.'": "t('faq.a5')",
    "{item.question}": "{t(`faq.q${faqItems.indexOf(item) + 1}`)}",
    "{item.answer}": "{t(`faq.a${faqItems.indexOf(item) + 1}`)}"
});

applyTo('app/privacy-policy/page.tsx', {
    '>Privacy Policy<': ">{t('privacy.title')}<",
    'We respect your privacy and are committed to protecting your personal data. We collect only information needed to provide core platform\n        functionality, such as account authentication, security monitoring, and product improvement. We do not sell your personal data.': "{t('privacy.p1')}",
    'Data may include account details, wallet identifiers you choose to connect, and technical logs required to prevent abuse and maintain\n        service reliability. We apply reasonable technical and organizational safeguards to protect your information.': "{t('privacy.p2')}",
    'By using the platform, you acknowledge this policy. If you have questions about your data, use the Contact page once support channels\n        are published.': "{t('privacy.p3')}"
});

applyTo('app/terms-of-service/page.tsx', {
    '>Terms of Service<': ">{t('terms.title')}<",
    'By accessing or using CowChain, you agree to use the service in compliance with applicable laws and these terms. You are responsible for\n        your account credentials, wallet actions, and all activity performed under your account.': "{t('terms.p1')}",
    'The platform is provided on an "as is" and "as available" basis without warranties of any kind. We may update, suspend, or discontinue\n        features at any time to maintain service quality, security, and legal compliance.': "{t('terms.p2')}",
    'Nothing on CowChain constitutes financial, investment, legal, or tax advice. You assume all risks related to digital assets and market\n        activity.': "{t('terms.p3')}"
});

console.log('Misc pages updated');
