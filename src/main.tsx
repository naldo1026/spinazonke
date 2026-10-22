import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/global.css';
import App from './App';
import { useStore } from './store/store';
import { audio } from './audio/audioManager';

// Pick up any photos added or removed since last visit.
useStore.getState().syncPhotoPools();

// Keep the audio engine in step with the mute/volume settings.
audio.applySettings(useStore.getState().settings);
useStore.subscribe((s, prev) => {
  if (s.settings !== prev.settings) audio.applySettings(s.settings);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
