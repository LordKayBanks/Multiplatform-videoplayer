import './context.js';
import './boost.js';
import './storage.js';
import './keyboard.js';

import drag from './drag.js';
import playlist from './playlist.js';

drag.onDrag((files) => playlist.loadVideo(files));
