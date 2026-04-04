export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Privacy Policy</h1>
        <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
          Last updated: April 2026
        </p>
      </div>

      {[
        {
          title: '1. Overview',
          body: `ExpenseFlow is a personal finance tracking app. We are committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.`,
        },
        {
          title: '2. Data We Collect',
          body: `ExpenseFlow stores all your financial data — transactions, accounts, budgets, investments, and subscriptions — exclusively on your device using your browser's localStorage or the device's local storage. We do not collect, transmit, or store any of your personal or financial data on any server.`,
        },
        {
          title: '3. Camera & Photo Access',
          body: `The Receipt Scanner feature may request access to your device's camera or photo library. Images captured or selected are processed entirely on your device using on-device OCR (Tesseract.js). No images or text are sent to any server.`,
        },
        {
          title: '4. Internet Usage',
          body: `ExpenseFlow may use the internet to fetch live NSE/BSE stock prices via Yahoo Finance for the Investments section. This request contains only the stock symbol you added — no personal information is transmitted. The app works fully offline without this feature.`,
        },
        {
          title: '5. Third-Party Services',
          body: `We do not use any third-party analytics, advertising, or tracking services. We do not integrate with Facebook, Google Analytics, or any similar platforms.`,
        },
        {
          title: '6. Data Security',
          body: `Since all data is stored locally on your device, it is protected by your device's own security (PIN, Face ID, fingerprint). We recommend using device lock to protect your financial data.`,
        },
        {
          title: '7. Data Deletion',
          body: `You can delete all your data at any time from Settings → Data & Export → Clear All Data. Uninstalling the app also permanently removes all locally stored data.`,
        },
        {
          title: '8. Children\'s Privacy',
          body: `ExpenseFlow is not directed at children under the age of 13. We do not knowingly collect any information from children.`,
        },
        {
          title: '9. Changes to This Policy',
          body: `We may update this Privacy Policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the app constitutes acceptance of the updated policy.`,
        },
        {
          title: '10. Contact Us',
          body: `If you have any questions about this Privacy Policy, please contact us at: expenseflow.app@gmail.com`,
        },
      ].map(({ title, body }) => (
        <div key={title} className="card p-5">
          <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(196,181,253,0.7)' }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
