/**
 * @license
 * Copyright 2018 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * Modified for Brainsharer UCSD/Princeton
 */

/**
 * @file Support for displaying version info in the title.
 */

import {WatchableValueInterface} from 'neuroglancer/trackable_value';
import {animationFrameDebounce} from 'neuroglancer/util/animation_frame_debounce';

declare let NEUROGLANCER_BUILD_INFO:
| { tag: string; url?: string; timestamp?: string };


export function bindTitle(title: WatchableValueInterface<string|undefined>) {
  const debouncedSetTitle = animationFrameDebounce(() => {
    // const value = title.value?.trim();
    let tag_title = NEUROGLANCER_BUILD_INFO.tag;
    let date_title = NEUROGLANCER_BUILD_INFO.timestamp;
    document.title = 'Neuroglancer';
    if ((tag_title) && (date_title)) {
      document.title = tag_title + ' built at ' + date_title;
    }
  });
  const unregisterSignalHandler = title.changed.add(debouncedSetTitle);
  debouncedSetTitle();
  debouncedSetTitle.flush();
  return () => {
    unregisterSignalHandler();
    debouncedSetTitle.cancel();
  };
}
