/**
 * @license
 * Copyright 2021 Google Inc.
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
 */

import './state_create.css';

import {SidePanel, SidePanelManager} from 'neuroglancer/ui/side_panel';
import {DEFAULT_SIDE_PANEL_LOCATION, SidePanelLocation, TrackableSidePanelLocation} from 'neuroglancer/ui/side_panel_location';
import {emptyToUndefined} from 'neuroglancer/util/json';
import {Viewer} from 'neuroglancer/viewer';
import {TextInputWidget} from 'neuroglancer/widget/text_input';

const DEFAULT_SETTINGS_PANEL_LOCATION: SidePanelLocation = {
  ...DEFAULT_SIDE_PANEL_LOCATION,
  side: 'left',
  row: 2,
};

export class StateCreatePanelState {
  location = new TrackableSidePanelLocation(DEFAULT_SETTINGS_PANEL_LOCATION);
  get changed() {
    return this.location.changed;
  }
  toJSON() {
    return emptyToUndefined(this.location.toJSON());
  }
  reset() {
    this.location.reset();
  }
  restoreState(obj: unknown) {
    this.location.restoreState(obj);
  }
}

export class StateCreatePanel extends SidePanel {
  constructor(sidePanelManager: SidePanelManager, state: StateCreatePanelState, viewer: Viewer) {
    super(sidePanelManager, state.location);
    this.addTitleBar({title: 'Create state'});

    const body = document.createElement('div');
    body.classList.add('neuroglancer-create-body');

    const scroll = document.createElement('div');
    scroll.classList.add('neuroglancer-create-scroll-container');
    body.appendChild(scroll);
    this.addBody(body);

    {
      const titleWidget = this.registerDisposer(new TextInputWidget(viewer.title));
      titleWidget.element.placeholder = 'Enter name for new state';
      titleWidget.element.classList.add('neuroglancer-create-title');
      scroll.appendChild(titleWidget.element);
    }



  }
}
