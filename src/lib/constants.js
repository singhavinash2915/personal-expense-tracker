export const DEFAULT_CATEGORIES = [
  { id: 'c1',  name: 'Housing',       icon: '🏠', color: '#7c3aed', type: 'expense' },
  { id: 'c2',  name: 'Food & Dining', icon: '🍔', color: '#f59e0b', type: 'expense' },
  { id: 'c3',  name: 'Transport',     icon: '🚗', color: '#06b6d4', type: 'expense' },
  { id: 'c4',  name: 'Shopping',      icon: '🛍️', color: '#e11d48', type: 'expense' },
  { id: 'c5',  name: 'Entertainment', icon: '🎬', color: '#8b5cf6', type: 'expense' },
  { id: 'c6',  name: 'Utilities',     icon: '⚡', color: '#0ea5e9', type: 'expense' },
  { id: 'c7',  name: 'Healthcare',    icon: '🏥', color: '#10b981', type: 'expense' },
  { id: 'c8',  name: 'Education',     icon: '📚', color: '#f97316', type: 'expense' },
  { id: 'c9',  name: 'Travel',        icon: '✈️', color: '#14b8a6', type: 'expense' },
  { id: 'c10', name: 'Others',        icon: '📦', color: '#64748b', type: 'expense' },
  { id: 'i1',  name: 'Salary',        icon: '💰', color: '#22c55e', type: 'income'  },
  { id: 'i2',  name: 'Freelance',     icon: '💻', color: '#34d399', type: 'income'  },
  { id: 'i3',  name: 'Investment',    icon: '📈', color: '#a3e635', type: 'income'  },
  { id: 'i4',  name: 'Gift',          icon: '🎁', color: '#fb7185', type: 'income'  },
  { id: 'i5',  name: 'Other Income',  icon: '🏦', color: '#818cf8', type: 'income'  },
  // Investments
  { id: 'tr1',  name: 'SIP / Mutual Fund',    icon: '📊', color: '#06b6d4', type: 'transfer' },
  { id: 'tr2',  name: 'Stock Purchase',        icon: '📈', color: '#06b6d4', type: 'transfer' },
  { id: 'tr3',  name: 'PPF',                   icon: '🏛️', color: '#06b6d4', type: 'transfer' },
  { id: 'tr4',  name: 'FD / RD',              icon: '🔒', color: '#06b6d4', type: 'transfer' },
  { id: 'tr5',  name: 'NPS',                   icon: '🎯', color: '#06b6d4', type: 'transfer' },
  { id: 'tr6',  name: 'Gold / SGBs',           icon: '🪙', color: '#06b6d4', type: 'transfer' },
  { id: 'tr7',  name: 'ELSS',                  icon: '💹', color: '#06b6d4', type: 'transfer' },
  // Loan EMIs
  { id: 'tr8',  name: 'Home Loan EMI',         icon: '🏠', color: '#818cf8', type: 'transfer' },
  { id: 'tr9',  name: 'Car Loan EMI',          icon: '🚗', color: '#818cf8', type: 'transfer' },
  { id: 'tr10', name: 'Personal Loan EMI',     icon: '🧾', color: '#818cf8', type: 'transfer' },
  { id: 'tr11', name: 'Education Loan EMI',    icon: '📚', color: '#818cf8', type: 'transfer' },
  { id: 'tr12', name: 'Two-Wheeler Loan EMI',  icon: '🛵', color: '#818cf8', type: 'transfer' },
  { id: 'tr13', name: 'Business Loan EMI',     icon: '🏢', color: '#818cf8', type: 'transfer' },
  // Savings & Transfers
  { id: 'tr14', name: 'Savings Transfer',      icon: '🏦', color: '#34d399', type: 'transfer' },
  { id: 'tr15', name: 'Transfer to Account',   icon: '↔️', color: '#34d399', type: 'transfer' },
  { id: 'tr16', name: 'Emergency Fund',        icon: '🛡️', color: '#34d399', type: 'transfer' },
  { id: 'tr17', name: 'Credit Card Payment',  icon: '💳', color: '#818cf8', type: 'transfer' },
]

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const SUBSCRIPTION_CATEGORIES = [
  'Entertainment', 'Productivity', 'Cloud Storage', 'Health & Fitness',
  'News & Media', 'Cloud/Dev', 'Web', 'Finance', 'Other'
]

export const SAMPLE_TRANSACTIONS = [
  { id: 't1',  type: 'income',  amount: 95000,  categoryId: 'i1', accountId: 'a2', description: 'Salary - March',         date: '2026-03-28', notes: '' },
  { id: 't2',  type: 'expense', amount: 11858,  categoryId: 'c2', accountId: 'a2', description: 'Big Basket Grocery',     date: '2026-03-27', notes: '' },
  { id: 't3',  type: 'expense', amount: 1333,   categoryId: 'c5', accountId: 'a1', description: 'Netflix Subscription',   date: '2026-03-25', notes: '' },
  { id: 't4',  type: 'expense', amount: 7458,   categoryId: 'c6', accountId: 'a1', description: 'Electricity Bill',       date: '2026-03-23', notes: '' },
  { id: 't5',  type: 'income',  amount: 47500,  categoryId: 'i2', accountId: 'a3', description: 'Freelance Payment',      date: '2026-03-20', notes: '' },
  { id: 't6',  type: 'expense', amount: 32000,  categoryId: 'c1', accountId: 'a1', description: 'Rent - March',           date: '2026-03-01', notes: 'Monthly rent' },
  { id: 't7',  type: 'expense', amount: 4500,   categoryId: 'c3', accountId: 'a4', description: 'Petrol',                 date: '2026-03-18', notes: '' },
  { id: 't8',  type: 'expense', amount: 2499,   categoryId: 'c5', accountId: 'a2', description: 'Spotify Premium',        date: '2026-03-15', notes: '' },
  { id: 't9',  type: 'expense', amount: 8900,   categoryId: 'c4', accountId: 'a2', description: 'Myntra Shopping',        date: '2026-03-12', notes: '' },
  { id: 't10', type: 'expense', amount: 3200,   categoryId: 'c7', accountId: 'a5', description: 'Doctor Consultation',    date: '2026-03-10', notes: '' },
  { id: 't11', type: 'income',  amount: 12000,  categoryId: 'i3', accountId: 'a1', description: 'Dividend Income',        date: '2026-03-08', notes: '' },
  { id: 't12', type: 'expense', amount: 5500,   categoryId: 'c3', accountId: 'a4', description: 'Ola/Uber Rides',         date: '2026-03-07', notes: '' },
  { id: 't13', type: 'expense', amount: 4200,   categoryId: 'c2', accountId: 'a4', description: 'Swiggy Orders',          date: '2026-03-05', notes: '' },
]

export const SAMPLE_BUDGETS = [
  { id: 'b1', categoryId: 'c1', monthlyLimit: 35000 },
  { id: 'b2', categoryId: 'c2', monthlyLimit: 20000 },
  { id: 'b3', categoryId: 'c3', monthlyLimit: 12000 },
  { id: 'b4', categoryId: 'c4', monthlyLimit: 15000 },
  { id: 'b5', categoryId: 'c5', monthlyLimit: 5000  },
  { id: 'b6', categoryId: 'c6', monthlyLimit: 8000  },
]

export const SAMPLE_CREDIT_CARDS = [
  { id: 'cc1', name: 'HDFC Regalia',   bank: 'HDFC Bank',   type: 'VISA Platinum',    last4: '4829', limit: 500000, outstanding: 45200, color: 'from-violet-800 to-blue-900',   expires: '09/28', dueDate: 15, minDue: 2500 },
  { id: 'cc2', name: 'SBI Elite',      bank: 'SBI Card',    type: 'Mastercard Gold',  last4: '7163', limit: 300000, outstanding: 28500, color: 'from-amber-800 to-yellow-900',  expires: '03/27', dueDate: 15, minDue: 2500 },
  { id: 'cc3', name: 'ICICI Amazon',   bank: 'ICICI Bank',  type: 'VISA Signature',   last4: '3341', limit: 200000, outstanding: 0,     color: 'from-slate-800 to-slate-700',   expires: '07/29', dueDate: 15, minDue: 2500 },
]

export const SAMPLE_SUBSCRIPTIONS = [
  { id: 's1', name: 'Netflix',        category: 'Entertainment',  amount: 649,  billingDay: 25, status: 'active',   icon: 'N',  iconBg: '#e11d48' },
  { id: 's2', name: 'Spotify',        category: 'Entertainment',  amount: 119,  billingDay: 1,  status: 'active',   icon: 'S',  iconBg: '#22c55e' },
  { id: 's3', name: 'iCloud+',        category: 'Cloud Storage',  amount: 75,   billingDay: 12, status: 'active',   icon: '☁',  iconBg: '#0ea5e9' },
  { id: 's4', name: 'ChatGPT Plus',   category: 'Productivity',   amount: 1670, billingDay: 18, status: 'active',   icon: 'AI', iconBg: '#0d9488' },
  { id: 's5', name: 'Planet Fitness', category: 'Health & Fitness',amount: 699,  billingDay: 5,  status: 'active',   icon: '🏋',  iconBg: '#ea580c' },
  { id: 's6', name: 'AWS',            category: 'Cloud/Dev',      amount: 2100, billingDay: 3,  status: 'variable', icon: 'AWS',iconBg: '#ca8a04' },
  { id: 's7', name: 'YouTube Premium',category: 'Entertainment',  amount: 189,  billingDay: 20, status: 'active',   icon: '▶',  iconBg: '#dc2626' },
  { id: 's8', name: 'GoDaddy Domain', category: 'Web',            amount: 1200, billingDay: 8,  status: 'active',   icon: 'GD', iconBg: '#4f46e5', billingCycle: 'yearly' },
]

export const SAMPLE_ACCOUNTS = [
  { id: 'a1', name: 'SBI Savings',    bank: 'State Bank of India', type: 'savings',  balance: 125400, accountNumber: '2847', ifsc: 'SBIN0001234', color: 'from-blue-800 to-indigo-900'    },
  { id: 'a2', name: 'HDFC Salary',    bank: 'HDFC Bank',           type: 'savings',  balance: 87520,  accountNumber: '6341', ifsc: 'HDFC0002341', color: 'from-red-800 to-rose-900'       },
  { id: 'a3', name: 'ICICI Current',  bank: 'ICICI Bank',          type: 'current',  balance: 45200,  accountNumber: '9182', ifsc: 'ICIC0003412', color: 'from-orange-800 to-amber-900'   },
  { id: 'a4', name: 'Paytm Wallet',   bank: 'Paytm Payments Bank', type: 'wallet',   balance: 3240,   accountNumber: null,   ifsc: null,          color: 'from-sky-700 to-blue-800'      },
  { id: 'a5', name: 'Cash in Hand',   bank: 'Cash',                type: 'cash',     balance: 8500,   accountNumber: null,   ifsc: null,          color: 'from-emerald-800 to-teal-900'  },
]

export const SAMPLE_MUTUAL_FUNDS = [
  { id: 'mf1', name: 'Mirae Asset Large Cap Fund', category: 'Large Cap', units: 2845.32, avgNav: 87.65, currentNav: 102.34 },
  { id: 'mf2', name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap', units: 3125.00, avgNav: 56.00, currentNav: 68.42 },
  { id: 'mf3', name: 'SBI Small Cap Fund', category: 'Small Cap', units: 1050.75, avgNav: 142.80, currentNav: 138.25 },
  { id: 'mf4', name: 'HDFC Mid-Cap Opportunities', category: 'Mid Cap', units: 1520.40, avgNav: 98.50, currentNav: 126.80 },
]

export const SAMPLE_STOCKS = [
  { id: 'st1', symbol: 'GOLDBEES',    name: 'Nippon India ETF Gold BeES',  exchange: 'NSE', shares: 1385, avgCost: 108.24, currentPrice: 125.65 },
  { id: 'st2', symbol: 'HDFCBANK',    name: 'HDFC Bank Ltd.',              exchange: 'NSE', shares: 50,   avgCost: 752.00, currentPrice: 795.45 },
  { id: 'st3', symbol: 'HSCL',        name: 'Himadri Speciality Chemical', exchange: 'NSE', shares: 100,  avgCost: 432.50, currentPrice: 489.15 },
  { id: 'st4', symbol: 'KPITTECH',    name: 'KPIT Technologies Ltd.',      exchange: 'NSE', shares: 100,  avgCost: 657.00, currentPrice: 746.30 },
  { id: 'st5', symbol: 'NIFTYBEES',   name: 'Nippon India ETF Nifty BeES', exchange: 'NSE', shares: 273,  avgCost: 255.47, currentPrice: 274.04 },
  { id: 'st6', symbol: 'PERSISTENT',  name: 'Persistent Systems Ltd.',     exchange: 'NSE', shares: 15,   avgCost: 4710.50,currentPrice: 5499.25 },
  { id: 'st7', symbol: 'POLYCAB',     name: 'Polycab India Ltd.',          exchange: 'NSE', shares: 10,   avgCost: 6820.00,currentPrice: 7903.50 },
  { id: 'st8', symbol: 'ULTRACEMCO',  name: 'UltraTech Cement Ltd.',       exchange: 'NSE', shares: 4,    avgCost: 10506.00,currentPrice: 11826.00 },
]
