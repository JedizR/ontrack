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
