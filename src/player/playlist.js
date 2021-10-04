import {
  setupForStandardTrackingMode,
  studyStatisticsTracker,
  trackingMode,
  updateSpeedIcon,
} from './keyboard.js';

/* global MediaMetadata */
import notify from './notify.js';
import * as utility from '../utility/index.js';
// import '../utility/seedData.js';

const root = document.getElementById('playlist');
const video = document.querySelector('video');
const next = document.getElementById('next');
const previous = document.getElementById('previous');
const reviewModeElement = document.getElementById('reviewMode');
const trackingModeElement = document.getElementById('trackingMode');
const inputText = document.getElementById('external-link');
const sortOptions = document.getElementById('review-sort-options');
const sortOptionsContainer = document.getElementById('review-sort-options-container');
const repeat = document.getElementById('repeat');
const speed = document.getElementById('speed');
const boost = document.getElementById('boost');

// video.addEventListener('blur', () => video.focus());
video.addEventListener('canplay', () => {
  document.body.dataset.type = video
    .captureStream()
    .getTracks()
    .some((t) => t.kind === 'video')
    ? 'video'
    : 'audio';
});

const scrollIntoView = (e) => {
  const rect = e.getBoundingClientRect();

  if (rect.top < 0 || rect.bottom > root.clientHeight) {
    e.scrollIntoView();
  }
};

export const categorySeparator = { name: ' ', path: '', type: 'separator' };
let isReviewing = false;
let unsubscribeToReview = null;
let unsubscribeSkipOnPlayError = null;
const stats = new WeakMap();
let delayId;
let state = -1; // current playing state
export const playlist = {
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  },
  configs: {
    delay: 1500,
  },
  entries: [],
  index: -1, // current playlist index
  get state() {
    return state;
  },
  set state(s) {
    state = s;
    document.body.dataset.state = s;
    for (const c of playlist.onStateChange.cs) {
      c(s);
    }
  },
  open() {
    document.body.dataset.mode = 'expand';
    const active = document.querySelector('li.active');
    if (active) {
      scrollIntoView(active);
    }
  },
  close() {
    document.body.dataset.mode = 'collapse';
  },
  play(index = playlist.index, delay = 0) {
    clearTimeout(delayId);
    if (delay) {
      delayId = setTimeout(() => playlist.play(index, 0), delay);
      return;
    }
    playlist.index = index === -1 ? 0 : index % playlist.entries.length;
    if (playlist.index + 1 === playlist.entries.length) {
      next.classList.add('disabled');
      navigator.mediaSession.setActionHandler('nexttrack', null);
    } else {
      next.classList.remove('disabled');
      navigator.mediaSession.setActionHandler('nexttrack', () => next.click());
    }
    if (playlist.index === 0) {
      previous.classList.add('disabled');
      navigator.mediaSession.setActionHandler('previoustrack', null);
    } else {
      previous.classList.remove('disabled');
      navigator.mediaSession.setActionHandler('previoustrack', () => previous.click());
    }
    if (playlist.entries.length) {
      document.getElementById('p-button-view').classList.remove('disabled');
      document.getElementById('shuffle').classList.remove('disabled');
    } else {
      document.getElementById('shuffle').classList.add('disabled');
    }
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      video.currentTime -= 10;
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      video.currentTime += 10;
    });

    const s = playlist.entries[playlist.index];
    //  console.log('🚀 ~ file: playlist.js ~ line 108 ~ play ~ s ', s);
    if (s.name) {
      video.src = s.path;
    } else {
      video.src = s.src;
    }
    video.playbackRate = parseFloat(speed.dataset.mode);
    document.title = s.name || s.src;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: document.title,
    });

    // active entry
    for (const e of [...document.querySelectorAll('li.active')]) {
      e.classList.remove('active');
    }
    s.e.classList.add('active');
    scrollIntoView(s.e);
    //  const currentTime = stats.get(s);
    //  if (currentTime !== undefined) {
    //    video.currentTime = currentTime;
    //  }
    video.origin = s;
    clearTimeout(unsubscribeSkipOnPlayError);
    video.play().catch((e) => {
      //skip separator LI's
      if (e.message.includes('Failed to load because no supported source was found')) {
        return playlist.play(playlist.index + 1);
      }
      notify.display(e.message, 2000);
      unsubscribeSkipOnPlayError = setTimeout(
        () => playlist.play(playlist.index + 1, playlist.configs.delay),
        5000
      );
    });
    //  window.setTimeout(() => video.focus(), 100);
  },
  stopVideo() {
    video.pause();
    video.currentTime = 0;
  },
  loadReviews() {
    let reviews = JSON.parse(localStorage.getItem('reviews'));
    reviews = utility.sortReviews(reviews, sortOptions.value);
    //  console.log('🚀 reviews', reviews);
    if (!reviews || !reviews.length) {
      notify.display('no reviews available!');
      return false;
    }

    playlist.entries = [];
    root.innerHTML = '';
    // playlist.cueVideo(reviews);
    playlist.cueVideo(reviews, false);
    playlist.play(0);
    setTimeout(() => notify.display(`${reviews.length} Reviews Loaded!`), 5000);

    // setupReviewMode();
    return true;
  },
  loadPlaylistFromStorage() {
    playlist.entries = [];
    root.innerHTML = '';
    const files = JSON.parse(localStorage.getItem('playlist'));
    if (!!files) {
      playlist.cueVideo(files, false);
      playlist.play(0);
    } else notify.display('no playlist saved!');
  },
  loadVideo(files) {
    const index = playlist.entries.length;
    playlist.cueVideo(files);
    this.play(index);
  },
  cueVideo(files, isNewFiles = true) {
    playlist.entries.push(...files);
    if (isNewFiles) {
      const temp = [...files].map(({ name, path, type, e }) => ({ name, path, type }));
      temp.push(categorySeparator);

      const oldPlaylist = JSON.parse(localStorage.getItem('playlist')) || [];
      const newPlaylist = [...oldPlaylist, ...temp];
      localStorage.setItem('playlist', JSON.stringify(newPlaylist));

      // redraws playlist to show separators
      // setTimeout(() => playlist.loadPlaylistFromStorage(), 1000);
    }

    const f = document.createDocumentFragment();
    for (const file of files) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.dataset.id = 'name';
      name.textContent = `${file.name}` || `${file.src}`;
      const duration = document.createElement('span');
      duration.dataset.id = 'duration';
      duration.textContent = '--:--';
      li.appendChild(name);
      li.appendChild(duration);
      li.title = file.split;
      if (file.type === 'separator') {
        duration.textContent = ' ';
        li.classList.add('file-separator');
        li.title = file.name;
        li.disabled = true;
      }
      file.e = li;
      li.file = file;
      f.appendChild(li);
    }
    root.appendChild(f);
  },
  onStateChange(c) {
    playlist.onStateChange.cs.push(c);
  },
};
playlist.onStateChange.cs = [];

export function setupReviewMode({ activate = true, loopCurrentSplit = false }) {
  const deactivate = !activate;
  if (deactivate) {
    clearInterval(unsubscribeToReview);
    return notify.display('Review: Stopped!');
  }

  if (trackingModeElement.dataset.mode === 'active') {
    trackingModeElement.dataset.mode = 'inactive';
    trackingMode(null, false);
  }

  if (video.origin.startTime) video.currentTime = video.origin.startTime;
  clearInterval(unsubscribeToReview);

  loopCurrentSplit && notify.display(`Reviews: Looping`);
  watcherForReviewMode(loopCurrentSplit);
}

function watcherForReviewMode(loopCurrentSplit = false) {
  unsubscribeToReview = setInterval(() => {
    if (video.currentTime < video.origin.startTime) {
      video.currentTime = video.origin.startTime;
    }

    if (loopCurrentSplit) {
      if (video.currentTime >= video.origin.endTime - 5) {
        video.currentTime = video.origin.startTime;
        studyStatisticsTracker(0.5);
      }
    } else {
      if (video.currentTime >= video.origin.endTime - 5) {
        studyStatisticsTracker(0.25);
        playlist.play(playlist.index + 1);
        video.currentTime = video.origin.startTime;
        clearInterval(unsubscribeToReview);
        watcherForReviewMode();
        // ===================
        //  video.currentTime = video.origin.startTime;
        //  setSpeed(speedTOptions[speedTracker]);
        //  studyStatisticsTracker();
        //   notifyReplayStatus();
      }
    }
  }, 1000);
}

// =====================================================
// =====================================================
video.addEventListener('timeupdate', () => {
  stats.set(video.origin, video.currentTime);
});
video.addEventListener('abort', () => (playlist.state = 0));
video.addEventListener('error', () => (playlist.state = 0));
video.addEventListener('emptied', () => (playlist.state = 0));
video.addEventListener('ended', () => {
  stats.set(video.origin, 0);
  playlist.state = 0;
  navigator.mediaSession.setActionHandler('seekbackward', null);
  navigator.mediaSession.setActionHandler('seekforward', null);

  if (playlist.index + 1 !== playlist.entries.length) {
    playlist.play(playlist.index + 1, playlist.configs.delay);
  } else {
    if (repeat.dataset.mode === 'repeat-all') {
      playlist.play(0, playlist.configs.delay);
    } else if (repeat.dataset.mode === 'repeat-one') {
      playlist.play(playlist.index, playlist.configs.delay);
    }
  }
});
video.addEventListener('play', () => (playlist.state = 1));
video.addEventListener('playing', () => (playlist.state = 1));
video.addEventListener('pause', () => (playlist.state = 2));
video.addEventListener('waiting', () => (playlist.state = 3));
video.addEventListener('loadstart', () => (playlist.state = 3));
video.addEventListener('loadedmetadata', () => {
  const d = video.duration;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);
  video.origin.e.querySelector('span[data-id=duration]').textContent =
    ('0' + h).substr(-2) + ':' + ('0' + m).substr(-2) + ':' + ('0' + s).substr(-2);
});

document.getElementById('p-button').addEventListener('change', (e) => {
  if (e.target.checked) {
    inputText.classList.remove('input-text');
    sortOptionsContainer.classList.remove('hide');

    return playlist['open']();
  } else {
    inputText.classList.add('input-text');
    sortOptionsContainer.classList.add('hide');

    return playlist['close']();
  }
});

root.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (li) {
    const index = playlist.entries.indexOf(li.file);
    if (index !== playlist.index) {
      playlist.play(index);
      if (isReviewing) {
        setupReviewMode({});
      }
    }
  }
});

previous.addEventListener('click', () => {
  playlist.play(playlist.index - 1);
  if (isReviewing) {
    setTimeout(() => {
      setupReviewMode({});
    }, 1000);
  }
});

next.addEventListener('click', () => {
  playlist.play(playlist.index + 1);
  if (isReviewing) {
    setTimeout(() => {
      setupReviewMode({});
    }, 1000);
  }
});

sortOptions.addEventListener('change', (e) => {
  //   setupReviewMode({ activate: true });
  if (isReviewing) {
    reviewModeElement.dataset.mode = 'inactive';
    reviewModeElement.click();
  }
});

reviewModeElement.addEventListener('click', (e) => {
  const modes = ['active', 'loop', 'inactive'];
  let index = (modes.indexOf(e.target.dataset.mode) + 1) % modes.length;
  const value = modes[index];
  if (value === 'active') {
    const reviews = playlist.loadReviews();
    if (!reviews) return;
    setupReviewMode({ activate: true });
    isReviewing = true;
  } else if (value === 'loop') {
    //  playlist.loadReviews();
    setupReviewMode({ loopCurrentSplit: true });
    isReviewing = true;
  } else if (value === 'inactive') {
    playlist.loadPlaylistFromStorage();
    setupReviewMode({ activate: false });
    isReviewing = false;
  }
  reviewModeElement.dataset.mode = modes[index];
});

trackingModeElement.addEventListener('click', (e) => {
  const value = e.target.dataset.mode;
  if (value === 'active') {
    e.target.dataset.mode = 'inactive';
    trackingMode(null, false);
  } else {
    e.target.dataset.mode = 'active';
    setupForStandardTrackingMode();
    trackingMode(null, false);
  }
});

repeat.addEventListener('click', (e) => {
  const modes = ['no-repeat', 'repeat-all', 'repeat-one'];
  const index = (modes.indexOf(e.target.dataset.mode) + 1) % 3;
  repeat.dataset.mode = modes[index];
});

speed.addEventListener('click', (e) => {
  const modes = ['2X', '3X', '3.5X', '4X', '4.25X', '4.5X', '4.75X', '5X'];
  const index = (modes.indexOf(e.target.dataset.mode) + 1) % modes.length;
  speed.dataset.mode = modes[index];
  updateSpeedIcon(modes[index]);
  speed.title = (() => {
    return `CURRENT: ${modes[index]}:\n
    Adjust player's speed (2X [DEFAULT], 3X, 3.5X, 4X, 4.5X and 5X)\n (Ctrl + X or Command + X)`;
  })();
  video.playbackRate = parseFloat(modes[index]);
});

boost.addEventListener('click', (e) => {
  const modes = ['2b', '3b', '4b'];
  //   const modes = ['1b', '2b', '3b', '4b'];
  const index = (modes.indexOf(e.target.dataset.mode) + 1) % 3;
  boost.dataset.mode = modes[index];
  setTimeout(() => {
    video.boost = parseInt(modes[index]);
  }, 100);
});

document.addEventListener('DOMContentLoaded', playlist.loadPlaylistFromStorage);
export default playlist;
