export interface Quote {
  text: string;
  author: string;
}

/** Shown on the Auth screen and the Dashboard greeting — stable for the
 *  whole calendar day (see getDailyQuote) so it doesn't flicker between
 *  re-renders or feel random on every visit. */
export const FINANCIAL_QUOTES: Quote[] = [
  { text: 'Beware of little expenses; a small leak will sink a great ship.', author: 'Benjamin Franklin' },
  { text: 'Do not save what is left after spending, but spend what is left after saving.', author: 'Warren Buffett' },
  { text: 'A budget is telling your money where to go instead of wondering where it went.', author: 'Dave Ramsey' },
  { text: 'The habit of saving is itself an education; it fosters every virtue.', author: 'T.T. Munger' },
  { text: "It's not your salary that makes you rich, it's your spending habits.", author: 'Charles A. Jaffe' },
  { text: 'Never spend your money before you have earned it.', author: 'Thomas Jefferson' },
  { text: 'The real measure of your wealth is how much you would be worth if you lost all your money.', author: 'Anonymous' },
  { text: 'Financial freedom is available to those who learn about it and work for it.', author: 'Robert Kiyosaki' },
  { text: 'Every time you borrow money, you are robbing your future self.', author: 'Nathan W. Morris' },
  { text: 'Money is a terrible master but an excellent servant.', author: 'P.T. Barnum' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Small amounts saved daily add up to big results.', author: 'Robert Kiyosaki' },
  { text: 'Formal education will make you a living; self-education will make you a fortune.', author: 'Jim Rohn' },
  { text: 'The stock market is a device for transferring money from the impatient to the patient.', author: 'Warren Buffett' },
  { text: 'Wealth consists not in having great possessions, but in having few wants.', author: 'Epictetus' },
  { text: 'You must gain control over your money or the lack of it will forever control you.', author: 'Dave Ramsey' },
];

/** A lighter, shorter set used in empty states — nudges the user to add
 *  their first transaction rather than dispensing general wisdom. */
export const EMPTY_STATE_QUOTES: Quote[] = [
  { text: 'Every rupee tracked is a step toward clarity.', author: 'PRATIQ' },
  { text: 'A clean ledger is the start of a good habit.', author: 'PRATIQ' },
  { text: 'Small entries today, clear insights tomorrow.', author: 'PRATIQ' },
  { text: 'The best time to start tracking was yesterday. The next best time is now.', author: 'PRATIQ' },
];

/** Deterministic pick that stays the same all day — days since the Unix
 *  epoch, so it rotates once every 24h without needing a timer or stored state. */
export function getDailyQuote(pool: Quote[] = FINANCIAL_QUOTES): Quote {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return pool[dayIndex % pool.length];
}

export function getRandomQuote(pool: Quote[] = FINANCIAL_QUOTES): Quote {
  return pool[Math.floor(Math.random() * pool.length)];
}
