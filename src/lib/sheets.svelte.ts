// Which app-wide sheet is open. Mounted once in App.svelte, opened from anywhere (the avatar, the expired card).
export const sheets = $state({ signin: false, account: false });
