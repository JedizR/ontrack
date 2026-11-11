import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app')!;
// the component gallery is a development screen: its code is dropped from production builds
if (__GALLERY__ && location.pathname.startsWith('/gallery')) {
  void import('./gallery/Gallery.svelte').then((m) => mount(m.default, { target }));
} else {
  mount(App, { target });
}

// end to end tests drive data through the real actions until the screens that log data exist (M5)
if (import.meta.env.DEV) {
  void Promise.all([import('./lib/actions'), import('./lib/db/store.svelte'), import('./lib/sync/engine.svelte')]).then(([actions, { db }, { sync }]) =>
    Object.assign(window, { ontrack: { actions, db, sync } }),
  );
}
