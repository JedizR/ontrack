// Every UI string. Sentence case, no em or en dashes, no middle dots, no exclamation marks.
// Numbers arrive already formatted (grouping, decimals), so the functions only place them.
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
  /** Captions that continue the number above or before them ("620" then "to go"), so they start in lower case. */
  after: {
    ofKcal: (n: string) => `of ${n} kcal`,
    ofGrams: (n: string) => `of ${n} g`,
    toGo: 'to go',
    left: 'left',
    over: 'over',
  },
  today: {
    calories: 'Calories',
    training: 'Training',
    onTrack: 'On track',
    onTrackFrom: (n: string) => `On track from ${n}`,
    trainingDay: 'Training day',
    restDay: 'Rest day',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    meals: 'Meals',
    logged: (n: string) => `${n} logged`,
    session: (kind: string, min: string, kcal: string) => `${kind}, ${min} min. Adds ${kcal} kcal`,
    done: 'Done',
  },
  week: {
    label: 'This week',
    /** Monday first */
    letters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    onTrackDay: (date: string) => `${date}, on track`,
  },
  source: {
    database: 'Database',
    estimate: 'Estimate',
  },
  sync: {
    syncing: 'Backing up your changes',
    offline: 'Offline. Changes stay on this phone until you reconnect',
    attention: 'Not backed up yet. Your data is safe on this phone',
  },
  sheet: { close: 'Close' },
  toast: { undo: 'Undo' },
  keypad: {
    keys: 'Keypad',
    back: 'Delete last digit',
    clear: 'Clear',
    clearShort: 'C',
    plus: 'Add another amount',
    save: 'Save',
  },
  stepper: {
    less: (what: string) => `Less ${what}`,
    more: (what: string) => `More ${what}`,
  },
  loading: 'Loading',
  prefs: {
    theme: 'Theme',
    textSize: 'Text size',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    m: 'Default',
    l: 'Large',
    xl: 'Larger',
  },
} as const;

export type Messages = typeof en;
