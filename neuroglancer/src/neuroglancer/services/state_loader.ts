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
 * @file Support for loading state information.
 */

/**
 * This module loads the JSON state from the Django database portal
 * via the REST API. The original data was all stored in a very very long
 * URL which you could see in the location bar of the browser. Now, all this
 * JSON data is stored in the relational database and the CRUD (create, retrieve, update and delete)
 * operations are take care of by this module interfacing with the REST API.
 */
import './state_loader.css';
import { Completion } from 'neuroglancer/util/completion';
import { AutocompleteTextInput } from 'neuroglancer/widget/multiline_autocomplete';
import { CancellationToken } from 'neuroglancer/util/cancellation';
import { RefCounted } from 'neuroglancer/util/disposable';
import { fetchOk } from 'neuroglancer/util/http_request';
import { Viewer } from 'neuroglancer/viewer';
import { StatusMessage } from 'neuroglancer/status';
import { makeIcon } from 'neuroglancer/widget/icon';
import { getCachedJson } from 'neuroglancer/util/trackable';
import { AppSettings } from 'neuroglancer/services/service';
import { User, getUser } from 'neuroglancer/services/user_loader';
import { Segmentation, State } from 'neuroglancer/services/state';


/**
 * Fuzzy search algorithm from https://github.com/bevacqua/fuzzysearch in Typescript.
 * @param needle
 * @param haystack
 */
export function fuzzySearch(needle: string, haystack: string) {
    const hlen = haystack.length;
    const nlen = needle.length;
    if (nlen > hlen) {
        return false;
    }
    if (nlen === hlen) {
        return needle === haystack;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
        const nch = needle.charCodeAt(i);
        while (j < hlen) {
            if (haystack.charCodeAt(j++) === nch) {
                continue outer;
            }
        }
        return false;
    }
    return true;
}
/**
 * This function gets the two parameters from the URL
 * 1. The id which is the primary key in the neuroglancer state table
 * 2. multi which is a boolean saying if we are in multi user mode or not.
 * @returns a JSON dictionary of the two variables
 */
export function getUrlParams() {
    const href = new URL(location.href);
    const id = href.searchParams.get('id');
    const locationVariables = {
        'stateID': id,
        'multiUserMode': id !== null && href.searchParams.get('multi') === '1',
        'viewOnly': id !== null && href.searchParams.get('view_only') === '1',
    };
    return locationVariables;
}

export function getIsPublic() {
    let status: boolean = true;
    return status;
}

/**
 * Define the state completion cell
 */
export interface CompletionWithState extends Completion {
    date: string;
    json: string;
}

/**
 * Define how to display a state completion cell
 * @param completion
 */
export function makeCompletionElementWithState(completion: CompletionWithState) {
    const element = document.createElement('div');
    element.textContent = completion.value || '';
    const dateElement = document.createElement('div');
    dateElement.textContent = completion.date || '';
    element.appendChild(dateElement);
    return element;
}

/**
 * This class takes care of taking the JSON data
 * and put it into a state that Neuroglancer can use.
 */
export class StateAutocomplete extends AutocompleteTextInput {
    public _allCompletions: CompletionWithState[] = [];
    private curCompletions: CompletionWithState[] = [];

    constructor(private viewer: Viewer) {
        super({
            completer: (value: string, _cancellationToken: CancellationToken) => {
                this.curCompletions = [];
                for (const result of this.allCompletions) {
                    if (fuzzySearch(value, result['value'])) {
                        this.curCompletions.push(result);
                    }
                }

                return Promise.resolve({
                    completions: this.curCompletions,
                    offset: 0,
                    showSingleResult: true,
                    selectSingleResult: true,
                    makeElement: makeCompletionElementWithState,
                });
            }, delay: 0
        });

        this.placeholder = 'State comment';
    }

    selectCompletion(index: number) {
        try {
            const completion = this.curCompletions[index];
            const stateJson = JSON.parse(completion.json);
            this.viewer.state.restoreState(stateJson);
            StatusMessage.showTemporaryMessage(`JSON file loaded successfully: ${completion.value}`);
        }
        catch (e) {
            StatusMessage.showTemporaryMessage('Internal error: invalid JSON');
        }
    }

    disableCompletions() {
        this.allCompletions = [];
    }

    set allCompletions(results: CompletionWithState[]) {
        this._allCompletions = results;
    }

    get allCompletions() {
        return this._allCompletions;
    }
}

/**
 * This class works with the REST API and interfaces
 * with the Neuroglancer state.
 * Authentication is done via a cookie which is initially set by Django in the neuroglancer/apis.py and neuroglancer/services.py programs
 * The angular frontend also uses these cookies.
 */
export class StateAPI {

    constructor(private stateUrl: string) { }


    /**
     * No authentication/authorization is required to get data
     * @param stateID The integer from the REST API of the neuroglancer_state id column
     * @returns the JSON state
     */
    public async getState(stateID: number | string): Promise<State> {

        const url = `${this.stateUrl}/${stateID}`;

        try {
            const response = await fetchOk(url, {method: 'GET'});
            const json = await response.json();
            return {
                state_id: json['id'],
                owner: json['owner'],
                comments: json['comments'],
                user_date: json['user_date'],
                neuroglancer_state: json['neuroglancer_state'],
                readonly: json['readonly'],
                public: json['public'],
                lab: json['lab']
            };
        } catch (err) {
            StatusMessage.showTemporaryMessage('The URL is deleted from database. Please check again.');
            return {
                state_id: 0,
                owner: 0,
                comments: err,
                user_date: "0",
                neuroglancer_state: {},
                readonly: false,
                public: false,
                lab: 'NA'
            };
        }
    }

    /**
     * Creates a new neuroglancer_state in the database via a REST POST
     * Authorization is required
     * @param state the JSON state
     * @returns the JSON state
     */
    async newState(state: State): Promise<State> {
        const url = this.stateUrl;
        const json_body = {
            id: state['state_id'],
            owner: state['owner'],
            comments: state['comments'],
            user_date: state['user_date'],
            neuroglancer_state: state['neuroglancer_state'],
            readonly: state['readonly'],
            public: state['public'],
            lab: state['lab']
        };
        const response = await fetchOk(url, {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json_body, null, 0),
        });
        const json = await response.json();
        const href = new URL(location.href);
        href.searchParams.set('id', json['id']);
        window.history.pushState({}, '', href.toString());
        urlParams.stateID = json['id'];
        return {
            state_id: json['id'],
            owner: json['owner'],
            comments: json['comments'],
            user_date: json['user_date'],
            neuroglancer_state: json['neuroglancer_state'],
            readonly: json['readonly'],
            public: json['public'],
            lab: json['lab']
        };
    }

    /**
     * This saves the data in the DB via a REST PUT
     * @param stateID  The integer from the REST API of the neuroglancer_state id column
     * @param state the JSON state
     * @returns the JSON state
     */
    async saveState(stateID: number | string, state: State): Promise<State> {
        const url = `${this.stateUrl}/${stateID}`;
        const json_body = {
            id: state['state_id'],
            owner: state['owner'],
            comments: state['comments'],
            user_date: state['user_date'],
            neuroglancer_state: state['neuroglancer_state'],
            readonly: state['readonly'],
            public: state['public'],
            lab: state['lab']
        };

        const response = await fetchOk(url, {
            method: 'PUT',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(json_body, null, 0),
        });

        const json = await response.json();
        return {
            state_id: json['id'],
            owner: json['owner'],
            comments: json['comments'],
            user_date: json['user_date'],
            neuroglancer_state: json['neuroglancer_state'],
            readonly: json['readonly'],
            public: json['public'],
            lab: json['lab']
        };
    }

    /**
     * This is the method that calls the REST API to run the method that creates the segmenation volume.
     * Requires authorization
     * @param stateID The integer from the REST API of the neuroglancer_state id column
     * @param volumeId A UUID string defining the volume
     * @returns A JSON object of the Segmenation
     */
    public async segmentVolume(stateID: number | string, volumeId: string): Promise<Segmentation> {
        const url = `${this.stateUrl.substring(0, this.stateUrl.lastIndexOf('/'))}/contour_to_segmentation/${stateID}/${volumeId}`;
        const response = await fetchOk(url, {
            method: 'GET',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const json = await response.json();
        return {
            url: json['url'],
            name: json['name']
        };
    }

    public async saveAnnotations(stateId: number | string, layerName: string): Promise<any> {
        const url = `${this.stateUrl.substring(0, this.stateUrl.lastIndexOf('/'))}/save_annotations/${stateId}/${layerName}`;
        const response = await fetchOk(url, {
            method: 'GET',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return await response.json();
    }
}


export const stateAPI = new StateAPI(`${AppSettings.API_ENDPOINT}/neuroglancer`);
export const urlParams = getUrlParams();

/**
 * This class takes care of the buttons and inputs used by the user
 * to load a specific Neuroglancer state.
 * topnav bar
 */
export class StateLoader extends RefCounted {
    element = document.createElement('div');

    private stateAPI: StateAPI;
    private input: StateAutocomplete;
    private resetButton: HTMLElement;
    private saveButton: HTMLElement;
    private portalButton: HTMLElement;
    private newButton: HTMLElement;
    private user: User;
    private stateID: number;
    private default_comments: string = 'Type URL name here';

    constructor(public viewer: Viewer) {
        super();
        this.element.classList.add('state-loader');
        this.stateAPI = stateAPI;

        /**
         * Try getting the cookies from the Django backend
         * that were actually sent from Django when logging in.
         */
        getUser().then(user => {
            this.user = user;

            if (this.user.user_id !== 0) {
                this.input = new StateAutocomplete(viewer);
                this.input.disableCompletions();
                this.input.element.classList.add('state-loader-input');
                this.element.appendChild(this.input.element);

                this.resetButton = makeIcon({ text: 'Reset', title: 'Reset to the JSON state stored in the database' });
                this.registerEventListener(this.resetButton, 'click', () => {
                    this.resetState();
                });
                this.element.appendChild(this.resetButton);
                
                this.saveButton = makeIcon({ text: 'Save', title: 'Save to the current JSON state' });
                this.registerEventListener(this.saveButton, 'click', () => {
                    this.saveState();
                });
                this.element.appendChild(this.saveButton);

                this.portalButton = makeIcon({ text: 'Portal', title: 'Admin Portal' });
                this.registerEventListener(this.portalButton, 'click', () => {
                    this.redirectPortal();
                });
                this.element.appendChild(this.portalButton);

                this.newButton = makeIcon({ text: 'New', title: 'Save to a new JSON state' });
                this.registerEventListener(this.newButton, 'click', () => {
                    this.newState();
                });
                this.element.appendChild(this.newButton);

                this.stateID = -1;
                this.input.value = this.default_comments;
                this.saveButton.style.display = 'none';
                this.resetButton.style.display = 'none;'

                const stateID = urlParams.stateID;
                if (stateID) {
                    this.stateID = Number(stateID);
                    this.getState();
                }
            }
        });
    }

    /**
     * This method makes sure the Neuroglancer state is valid JSON
     * @param state the JSON data 
     */
    private validateState(state: State | null) {
        if (state !== null) {
            this.stateID = state['state_id'];
            this.input.value = state['comments'];
            this.saveButton.style.removeProperty('display');
            this.resetButton.style.removeProperty('display');
        }
    }

    /**
     * A method used to fetch the Neuroglancer state. This is the R in the CRUD operations.
     */
    private getState() {
        this.stateAPI.getState(this.stateID).then(state => {
            this.validateState(state);
            if ((state.readonly) || (state.lab !== this.user.lab)) {
                this.saveButton.style.removeProperty('display');
                this.saveButton.style.display = 'none';
            } 

        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error getting state: please see debug message.`);
            console.log(err);
        });
    }

    /**
     * This method is used when the user clicks the 'Save' button. 
     * This is the U in the CRUD operations.
     * @returns the state object
     */
    private saveState() {
        let comments = this.input.value;
        if ((comments.length === 0) || (comments == this.default_comments)) {
            StatusMessage.showTemporaryMessage(`There was an error: the comments field cannot be empty. Give this view a name in the comments field.`);
            return;
        }
        if (this.stateID == -1) {
            StatusMessage.showTemporaryMessage(`There was an error: There was no saved state for this view.`);
            return;
        }
        const state = {
            state_id: this.stateID,
            owner: this.user.user_id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            public: true,
            lab: this.user.lab
        };

        const annotationSavedState = this.viewer.annotationsSavedState;

        this.stateAPI.saveState(this.stateID, state).then(() => {
            StatusMessage.showTemporaryMessage(`The data was saved successfully.`);
            annotationSavedState.value = true;
        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error saving state: ` + err);
            console.log(err);
        });
    }

    private redirectPortal() {
        window.location.href = `${AppSettings.ADMIN_PORTAL}`;
    }
    /**
     * This is used when the user clicks the 'New' button. 
     * This is the C in the CRUD operations.
     * @returns returns a JSON object of state
     */
    private newState() {
        const comments = this.input.value;
        if (comments.length === 0) {
            StatusMessage.showTemporaryMessage(`Error: the comment cannot be empty.`);
            return;
        }

        const state = {
            state_id: this.stateID,
            owner: this.user.user_id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            public: true,
            lab: this.user.lab
        };

        this.stateAPI.newState(state).then((newState) => {
            this.validateState(newState);
            StatusMessage.showTemporaryMessage(`A new data state has been created.`);
        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    /**
     * This method is used for the segmentation volume. It calls the saveState method
     * after preparing the segment volume for saving.
     * @param volumeId ID of the volume
     * @param successCallback method to determine if the method was successful.
     * @returns Nothing if there is no comments.
     */
    public segmentVolume(volumeId: string, successCallback: (_ :Segmentation) => void): void {
        let comments = this.input.value;
        console.log('comments len=' + comments.length);
        console.log('comments len=' + comments);
        if ((comments.length === 0) || (comments == this.default_comments)) {
            StatusMessage.showTemporaryMessage(`There was an error: the comment cannot be empty.`);
            return;
        }
        if (this.stateID === -1) {
            StatusMessage.showTemporaryMessage(`There was an error: The state is empty. Enter a name in the comments field and click the New button first.`);
            return;
        }
        const state = {
            state_id: this.stateID,
            owner: this.user.user_id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            public: true,
            lab: this.user.lab
        };

        this.stateAPI.saveState(this.stateID, state).then(() => {
            //StatusMessage.showTemporaryMessage(`The data was saved successfully.`);
            StatusMessage.showTemporaryMessage(`Segmentation process started...please wait for a while to finish`, 10000);
            this.stateAPI.segmentVolume(this.stateID, volumeId).then((res) => {
                successCallback(res);
                StatusMessage.showTemporaryMessage(`Segmentation process completed successfully.`);
            }).catch(err => {
                StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
                console.log(err);
            });

        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    /**
     * This is used when the user clicks the 'Save Annotations' button.
     * It first saves the entire JSON state as each layer needs to be saved
     * so the on each annotation layer, the data is ready to be parsed by
     * the saveannotations method
     * @param layerName The name of the layer the user is saving.
     * @returns Nothing if there is an error.
     */
    public saveAnnotations(layerName: string): void {
        StatusMessage.showTemporaryMessage(`Annotations are being sent to the database ...`);

        const comments = this.input.value;
        if (comments.length === 0) {
            StatusMessage.showTemporaryMessage(`There was an error: the comment cannot be empty.`);
            return;
        }
        const state = {
            state_id: this.stateID,
            owner: this.user.user_id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            public: true,
            lab: this.user.lab
        };

        this.stateAPI.saveState(this.stateID, state).then(() => {
            this.stateAPI.saveAnnotations(this.stateID, layerName).then(() => {
                console.log('Annotations are being sent to the database.');
            }).catch(err => {
                const msg = new StatusMessage();
                msg.setErrorMessage('Internal error saving annotations. ' + err);
                console.log(err);
            });

        }).catch(err => {
            const msg = new StatusMessage();
            let message = "";
            if (err.status === 401) {
                message = "Your login credentials are incorrect. Try logging out and logging back in";
            } else {
                message = err;
            }
            msg.setErrorMessage('Internal error saving state and annotations. ' + message);
            console.log(err);
        });
    }

    /**
     * This is only saves the current annotation layer.
     * @param layerName The name of the layer the user is saving.
     * @returns Nothing if there is an error.
     */
    public saveCurrentAnnotationLayer(layerName: string): void {

        this.stateAPI.saveAnnotations(this.stateID, layerName).then(() => {
            StatusMessage.showTemporaryMessage(`Annotations were sent to the database.`);
        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    /**
     * A method to reset the state from what is stored in the database.
     */
    private resetState() {
        this.viewer.urlHashBinding.resetDatabaseState();
    }
}

