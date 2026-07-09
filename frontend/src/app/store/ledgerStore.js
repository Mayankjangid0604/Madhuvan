let ledgerEntries = [
  {
    id: 1,
    date: "2025-01-01",
    student: "Rahul Sharma (101-A)",
    description: "January Fee Received",
    type: "AUTO",
    debit: 0,
    credit: 3000,
    balance: 3000,
  },
];

const subscribers = [];

const notify = () => {
  subscribers.forEach((fn) => fn([...ledgerEntries]));
};

export const ledgerStore = {
  subscribe(fn) {
    subscribers.push(fn);
    fn([...ledgerEntries]);
  },

  addAutoEntry(entry) {
    const lastBalance =
      ledgerEntries.length > 0
        ? ledgerEntries[ledgerEntries.length - 1].balance
        : 0;

    ledgerEntries.push({
      ...entry,
      id: Date.now(),
      balance: lastBalance + entry.credit - entry.debit,
    });

    notify();
  },
};
