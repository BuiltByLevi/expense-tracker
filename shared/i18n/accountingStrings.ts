import type { AppLanguage } from './types';

/**
 * Labels and explanations for the accounting breakdown card. Shared by the
 * web app and Expo: each app picks the language it has. Keep the three
 * dictionaries in step — every key exists in every language.
 */
export type AccountingKey =
  | 'title' | 'monthly' | 'yearly'
  | 'earnings' | 'earningsHint'
  | 'expenses' | 'expensesHint'
  | 'netCashFlow' | 'netCashFlowHint'
  | 'refunds' | 'refundsHint'
  | 'transfersIn' | 'transfersInHint'
  | 'transfersOut' | 'transfersOutHint'
  | 'cashWithdrawals' | 'cashWithdrawalsHint'
  | 'investments' | 'investmentsHint'
  | 'sectionEarnings' | 'sectionSpending' | 'sectionExcluded'
  | 'bankMovement' | 'bankMovementHint'
  | 'manualDiffers' | 'yearNote' | 'transactionsCount';

export const ACCOUNTING_STRINGS: Record<AppLanguage, Record<AccountingKey, string>> = {
  en: {
    title: 'Accounting breakdown',
    monthly: 'Month',
    yearly: 'Year',
    earnings: 'Monthly Earnings',
    earningsHint: 'Salary, interest and other income you confirmed. Refunds and transfers in are not included.',
    expenses: 'Monthly Expenses',
    expensesHint: 'Purchases, bills, EMI and loan payments, and bank charges.',
    netCashFlow: 'Net Cash Flow',
    netCashFlowHint: 'Earnings plus refunds, minus Monthly Expenses. Excludes transfers, cash withdrawals and investments.',
    refunds: 'Refunds',
    refundsHint: 'Money returned for purchases. Offsets spending; never counted as income.',
    transfersIn: 'Transfers In',
    transfersInHint: 'Money moved from your own accounts. Not income, not in cash flow.',
    transfersOut: 'Transfers Out',
    transfersOutHint: 'Money moved to your own accounts. Not an expense, not in cash flow.',
    cashWithdrawals: 'Cash Withdrawals',
    cashWithdrawalsHint: 'ATM cash. Not an expense; cash you spend later is already in Monthly Expenses.',
    investments: 'Investments',
    investmentsHint: 'Savings and investments (SIPs, mutual funds, shares). Not consumption.',
    sectionEarnings: 'Money in',
    sectionSpending: 'Spending',
    sectionExcluded: 'Money out, not spending',
    bankMovement: 'Bank net movement',
    bankMovementHint: 'Every credit minus every debit. Reconciles to the transaction ledger.',
    manualDiffers: 'This month differs from the dashboard figure. The dashboard may use a manually entered amount, so check both.',
    yearNote: 'Yearly totals add up every month in the year from the transaction ledger.',
    transactionsCount: '{{count}} transactions',
  },
  hi: {
    title: 'लेखा विवरण',
    monthly: 'महीना',
    yearly: 'साल',
    earnings: 'मासिक आय',
    earningsHint: 'आपकी पुष्टि की गई वेतन, ब्याज और अन्य आय। रिफंड और अंदर आए ट्रांसफ़र शामिल नहीं हैं।',
    expenses: 'मासिक खर्च',
    expensesHint: 'खरीदारी, बिल, EMI और लोन भुगतान, तथा बैंक शुल्क।',
    netCashFlow: 'शुद्ध नकद प्रवाह',
    netCashFlowHint: 'आय और रिफंड जोड़कर, मासिक खर्च घटाएँ। ट्रांसफ़र, नकद निकासी और निवेश शामिल नहीं।',
    refunds: 'रिफंड',
    refundsHint: 'खरीदारी के लिए लौटाया गया पैसा। खर्च को घटाता है; कभी आय नहीं गिना जाता।',
    transfersIn: 'अंदर आए ट्रांसफ़र',
    transfersInHint: 'आपके अपने खातों से आया पैसा। आय नहीं, नकद प्रवाह में नहीं।',
    transfersOut: 'बाहर गए ट्रांसफ़र',
    transfersOutHint: 'आपके अपने खातों में गया पैसा। खर्च नहीं, नकद प्रवाह में नहीं।',
    cashWithdrawals: 'नकद निकासी',
    cashWithdrawalsHint: 'ATM से निकाला नकद। खर्च नहीं; बाद में नकद से किया खर्च पहले से मासिक खर्च में है।',
    investments: 'निवेश',
    investmentsHint: 'बचत और निवेश (SIP, म्यूचुअल फंड, शेयर)। उपभोग नहीं।',
    sectionEarnings: 'पैसा आया',
    sectionSpending: 'खर्च',
    sectionExcluded: 'पैसा गया, पर खर्च नहीं',
    bankMovement: 'बैंक में कुल बदलाव',
    bankMovementHint: 'हर जमा में से हर निकासी घटाएँ। लेन-देन सूची से मेल खाता है।',
    manualDiffers: 'इस महीने की रकम डैशबोर्ड के आंकड़े से अलग है। डैशबोर्ड में हाथ से डाली गई रकम हो सकती है, इसलिए दोनों जाँचें।',
    yearNote: 'सालाना कुल लेन-देन सूची के हर महीने को जोड़कर बनता है।',
    transactionsCount: '{{count}} लेन-देन',
  },
  mr: {
    title: 'हिशेब तपशील',
    monthly: 'महिना',
    yearly: 'वर्ष',
    earnings: 'मासिक उत्पन्न',
    earningsHint: 'तुम्ही निश्चित केलेला पगार, व्याज आणि इतर उत्पन्न. रिफंड आणि आत आलेले ट्रान्सफर यात नाहीत.',
    expenses: 'मासिक खर्च',
    expensesHint: 'खरेदी, बिले, EMI आणि कर्ज हप्ते, तसेच बँक शुल्क.',
    netCashFlow: 'निव्वळ रोख प्रवाह',
    netCashFlowHint: 'उत्पन्न आणि रिफंड मिळवून, मासिक खर्च वजा. ट्रान्सफर, रोख काढणी आणि गुंतवणूक यात नाहीत.',
    refunds: 'रिफंड',
    refundsHint: 'खरेदीसाठी परत मिळालेले पैसे. खर्च कमी करतात; कधीही उत्पन्न म्हणून मोजले जात नाहीत.',
    transfersIn: 'आत आलेले ट्रान्सफर',
    transfersInHint: 'तुमच्या स्वतःच्या खात्यांमधून आलेले पैसे. उत्पन्न नाही, रोख प्रवाहातही नाही.',
    transfersOut: 'बाहेर गेलेले ट्रान्सफर',
    transfersOutHint: 'तुमच्या स्वतःच्या खात्यांमध्ये गेलेले पैसे. खर्च नाही, रोख प्रवाहातही नाही.',
    cashWithdrawals: 'रोख काढणी',
    cashWithdrawalsHint: 'ATM मधून काढलेली रोख. खर्च नाही; नंतर रोखीने केलेला खर्च आधीच मासिक खर्चात आहे.',
    investments: 'गुंतवणूक',
    investmentsHint: 'बचत आणि गुंतवणूक (SIP, म्युच्युअल फंड, शेअर्स). उपभोग नाही.',
    sectionEarnings: 'पैसे आले',
    sectionSpending: 'खर्च',
    sectionExcluded: 'पैसे गेले, पण खर्च नाही',
    bankMovement: 'बँकेतील एकूण बदल',
    bankMovementHint: 'प्रत्येक जमेतून प्रत्येक काढणी वजा. व्यवहार यादीशी जुळतो.',
    manualDiffers: 'या महिन्याची रक्कम डॅशबोर्ड आकड्यापेक्षा वेगळी आहे. डॅशबोर्डमध्ये हाताने टाकलेली रक्कम असू शकते, त्यामुळे दोन्ही तपासा.',
    yearNote: 'वार्षिक एकूण हे व्यवहार यादीतील वर्षातील प्रत्येक महिना जोडून येते.',
    transactionsCount: '{{count}} व्यवहार',
  },
};

export function accountingStrings(lang: AppLanguage): Record<AccountingKey, string> {
  return ACCOUNTING_STRINGS[lang] ?? ACCOUNTING_STRINGS.en;
}
