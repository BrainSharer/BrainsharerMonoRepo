/**
 * @license
 * Copyright 2016 Google Inc.
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

import debounce from 'lodash/debounce';
import { CredentialsManager } from 'neuroglancer/credentials_provider';
import { StatusMessage } from 'neuroglancer/status';
import { WatchableValue } from 'neuroglancer/trackable_value';
import { RefCounted } from 'neuroglancer/util/disposable';
import { verifyObject } from 'neuroglancer/util/json';
import { getCachedJson, Trackable } from 'neuroglancer/util/trackable';
import { urlParams, stateAPI, StateAPI } from 'neuroglancer/services/state_loader';
import { State } from 'neuroglancer/services/state';
import { database, dbRef } from 'neuroglancer/services/firebase';
import { child, get, onValue, ref, update } from "firebase/database";
import { User, getUser } from 'neuroglancer/services/user_loader';
import { updateGlobalCellSession, updateGlobalCellMode, updateGlobalComSession, updateGlobalComMode, updateGlobalVolumeMode, getInProgressAnnotation, getVolumeToolUsed, clearVolumeToolUsed } from 'neuroglancer/ui/annotations';

/**
 * @file Implements a binding between a Trackable value and the URL hash state.
 */

let restoring_volumetool: boolean = false;

export function updateRestoringVolumetool() {
  restoring_volumetool = true;
}

export interface UrlHashBindingOptions {
  defaultFragment?: string;
  updateDelayMilliseconds?: number;
}

/**
 * An instance of this class manages a binding between a Trackable value and the URL hash state.
 * The binding is initialized in the constructor, and is removed when dispose is called.
 */
export class UrlHashBinding extends RefCounted {
    /**
     * Most recently parsed or set state string.
     */
    private prevUrlString: string | undefined;

    /**
     * Most recent error parsing URL hash.
     */
    parseError = new WatchableValue<Error | undefined>(undefined);

    /**
     * ActiveBrainAtlas fork:
     * Create ActiveBrainAtlas state API endpoint.
     */
    private stateAPI: StateAPI;
    private stateData: State;
    private stateID: string | null;
    private user: User;
    private multiUserMode: boolean;
    private viewOnly: boolean;

    constructor(
        public root: Trackable, public credentialsManager: CredentialsManager,
        options: UrlHashBindingOptions = {}) {
        super();
        const {updateDelayMilliseconds = 200} = options;
        this.stateAPI = stateAPI;
        this.multiUserMode = urlParams.multiUserMode;
        this.viewOnly = urlParams.viewOnly;
        getUser().then(jsonUser => {
            this.user = jsonUser;
            this.stateID = urlParams.stateID;
            this.registerEventListener(window, 'hashchange', () => this.updateFromUrlHash());
            const throttledSetUrlHash = debounce(() => this.setUrlHash(), updateDelayMilliseconds);
            this.registerDisposer(root.changed.add(throttledSetUrlHash));
            this.registerDisposer(() => throttledSetUrlHash.cancel());
            this.updateFromUrlHash();
        });
    }

    /**
     * ActiveBrainAtlas fork:
     * Do not change URL when the current state changes.
     * Instead, when the current state change in the multi-user mode,
     * push the update to Firebase.
     * 2023-04-24 I put in a check to make sure this.stateData is not undefined.
     */
    private setUrlHash() {
        if (this.stateID && this.multiUserMode) {
            if (this.user.user_id == 0) {
                this.viewOnly = true;
            }
            const cacheState = getCachedJson(this.root);
            const urlString = JSON.stringify(cacheState.value)
            const urlData = JSON.parse(urlString);
            const { prevUrlString } = this;

            const sameUrl = prevUrlString === urlString || restoring_volumetool;
            restoring_volumetool = false;
            if ((!sameUrl) && (this.stateData) || getVolumeToolUsed()) {
                // updateUser(this.stateID, this.user.user_id, this.user.username);
                this.stateData.neuroglancer_state = urlData;
                this.updateStateData(this.stateData);
                this.prevUrlString = urlString;
                clearVolumeToolUsed();
            }
        }
    }

    /**
     * ActiveBrainAtlas fork:
     * Fetch the state from ActiveBrainAtlas server according to the GET parameter `id`.
     * The user mode is determined by the GET parameter `multi`:
     * 0 - single user mode; 1 - multi user mode.
     * If they are in multi user mode and there is no user id, automatically put them in viewOnly mode
     * This is called upon initial load of the page.
     * This is called from src/main_python.ts
     */
    public updateFromUrlHash() {
        if (this.stateID) {
            const { stateID } = this;
            if (this.multiUserMode) {
                if (this.user.user_id === 0) {
                    this.viewOnly = true;
                }
                get(child(dbRef, `neuroglancer/${stateID}`)).then((snapshot) => {
                    if (snapshot.exists()) { // get data from firebase
                        this.stateData = snapshot.val();
                        this.setStateRoot();
                    } else { // no firebase data, so get it from mysql
                        this.stateAPI.getState(stateID).then(jsonState => {
                            this.stateData = jsonState;
                            this.setStateRoot();
                        });
                    }
                }).catch((error) => {
                    console.error(error);
                });

            } else { // not in multi user mode
                this.stateAPI.getState(stateID).then(jsonState => {
                    this.stateData = jsonState;
                    const stateObject = this.stateData.neuroglancer_state;
                    this.prevUrlString = undefined;
                    this.root.reset();
                    verifyObject(stateObject);
                    this.root.restoreState(stateObject);
                    this.stateData.neuroglancer_state = stateObject;
                });
            }
        } 
    }

    /**
     * Helper function used only in updateFromUrlHash
     */
    private setStateRoot() {
        const jsonStateUrl = this.stateData.neuroglancer_state;
        this.root.reset();
        verifyObject(jsonStateUrl);
        this.root.restoreState(jsonStateUrl);
        this.prevUrlString = JSON.stringify(jsonStateUrl);
        this.updateStateData(this.stateData);
        // updateUser(this.stateID, this.user.user_id, this.user.username);
        this.checkAndSetStateFromFirebase();
        this.updateToolStateFromFirebase();
    }

    private updateToolStateFromFirebase() {
        const stateRefCellSession = ref(database, `/test_annotations_tool/test/${this.stateID}`);
        onValue(stateRefCellSession, (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            updateGlobalCellSession(snapshot.val());
        });

        const stateRefCellMode = ref(database, `/test_annotations_tool/mode/${this.stateID}`);
        onValue(stateRefCellMode , (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            updateGlobalCellMode(snapshot.val());
        });

        const stateRefComSession = ref(database, `/test_annotations_tool/com_session/${this.stateID}`);
        onValue(stateRefComSession, (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            updateGlobalComSession(snapshot.val());
        });

        const stateRefComMode = ref(database, `/test_annotations_tool/com_mode/${this.stateID}`);
        onValue(stateRefComMode, (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            updateGlobalComMode(snapshot.val());
        });

        const stateRefVolumeMode = ref(database, `/test_annotations_tool/volume_mode/${this.stateID}`);
        onValue(stateRefVolumeMode, (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            updateGlobalVolumeMode(snapshot.val());
        });


        /*
        const stateRefComSession = ref(database, `/test_annotations_tool/volume_session/${this.stateID}`);
        onValue(stateRefComSession, (snapshot) => {
            updateGlobalComSession(snapshot.val());
        });

        const stateRefComMode = ref(database, `/test_annotations_tool/com_mode/${this.stateID}`);
        onValue(stateRefComMode, (snapshot) => {
            updateGlobalComMode(snapshot.val());
        });
        */
    }

    /**
     * ActiveBrainAtlas fork:
     * Update the local state upon a firebase update.
     * This is called only in the multi user mode so we know
     * there is a stateID and multiUser=1
     */
    private checkAndSetStateFromFirebase() {
        const stateRef = ref(database, `neuroglancer/${this.stateID}`);
        onValue(stateRef, (snapshot) => {
            if (getInProgressAnnotation()) {
                return;
            }
            this.stateData = snapshot.val();
            const jsonStateUrl = this.stateData.neuroglancer_state;
            this.root.reset();
            verifyObject(jsonStateUrl);
            this.root.restoreState(jsonStateUrl);
            this.prevUrlString = JSON.stringify(jsonStateUrl);
        });
    }

    /**
     * Only update if they are in multi user mode and are logged in
     * @param stateData: json state
     * @returns nothing
     */
    private updateStateData(stateData: State) {
        if(this.viewOnly) {
            console.log('updateStateData viewOnly mode, not updating');
            return;
        }
        const updates: any = {};
        updates['/neuroglancer/' + this.stateID] = stateData;
        update(ref(database), updates)
            .then(() => {
                console.log('Updating state data was OK');
            })
            .catch((error) => {
                console.error(error);
            });
    }

    /**
    This method is also used in state_loader.ts
     */
    public resetDatabaseState() {
        if (!this.stateID) {
            StatusMessage.showTemporaryMessage("This is not saved to the database yet.");
        } else {
            this.stateAPI.getState(this.stateID).then(jsonState => {
                this.stateData = jsonState;
                const jsonStateUrl = this.stateData.neuroglancer_state;
                this.root.reset();
                verifyObject(jsonStateUrl);
                this.root.restoreState(jsonStateUrl);
                this.setUrlHash();
            });
        }
    }


}
