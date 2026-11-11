// Every UI string. Sentence case, no em or en dashes, no middle dots, no exclamation marks.
export const en = {
  app: { name: 'Ontrack' },
  tabs: {
    label: 'Tabs',
    today: 'Today',
    train: 'Train',
    progress: 'Progress',
  },
  shell: {
    add: 'Add a meal',
    account: 'Account',
  },
  empty: {
    today: 'Your meals and targets for the day will show here.',
    train: 'Your weekly program will show here.',
    progress: 'Your weight trend and weekly check-ins will show here.',
  },
  update: {
    ready: 'A new version is ready',
    action: 'Update',
  },
} as const;

export type Messages = typeof en;
