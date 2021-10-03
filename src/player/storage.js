import notify from './notify.js';

const video = document.querySelector('video');

// persist
let prefs = {};
prefs.repeat = localStorage.getItem('repeat') ?? 'repeat-all';
prefs.volume = localStorage.getItem('volume') ?? 1;
prefs.speed = localStorage.getItem('speed') ?? 2.5;

document.getElementById('repeat').dataset.mode = prefs.repeat;
document.getElementById('speed').dataset.mode = prefs.speed + 'x';
video.volume = prefs.volume;
video.playbackRate = prefs.speed;

document
  .getElementById('repeat')
  .addEventListener('click', (e) => localStorage.setItem('repeat', e.target.dataset.mode));
document.getElementById('speed').addEventListener('click', (e) => {
  localStorage.setItem('speed', parseFloat(e.target.dataset.mode));
  notify.display('Speed: ' + e.target.dataset.mode.toUpperCase());
});

video.addEventListener('volumechange', (e) => {
  localStorage.setItem('volume', e.target.volume);
});
video.addEventListener('boostchange', () => {
  notify.display('Boost: ' + video.boost + 'B');
});
