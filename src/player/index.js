import './context.js';
import './boost.js';
import './storage.js';
import './keyboard.js';

import drag from './drag.js';
import playlist from './playlist.js';
import { keepTrackOfReviews } from '../utility/startup.js';

keepTrackOfReviews();
drag.onDrag((files) => playlist.loadVideo(files));
