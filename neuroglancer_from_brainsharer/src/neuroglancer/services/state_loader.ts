import './state_loader.css';

import Cookies from 'js-cookie'

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
import { User } from 'neuroglancer/services/user';
import { State } from 'neuroglancer/services/state';

/**
 * Fuzzy search algorithm from https://github.com/bevacqua/fuzzysearch in Typescript.
 * @param needle
 * @param haystack
 */
function fuzzySearch(needle: string, haystack: string) {
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

function getUrlParams() {
    const href = new URL(location.href);
    const id = href.searchParams.get('id');
    const locationVariables = {
        'stateID': id,
        'multiUserMode': id !== null && href.searchParams.get('multi') === '1',
    };
    return locationVariables;
}

/**
 * Define the state completion cell
 */
interface CompletionWithState extends Completion {
    date: string;
    json: string;
}

/**
 * Define how to display a state completion cell
 * @param completion
 */
function makeCompletionElementWithState(completion: CompletionWithState) {
    const element = document.createElement('div');
    element.textContent = completion.value || '';
    const dateElement = document.createElement('div');
    dateElement.textContent = completion.date || '';
    element.appendChild(dateElement);
    return element;
}

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
                })
            }, delay: 0});
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


export class StateAPI {
    private user: User;

    constructor(private stateUrl: string) { }

    public async getUser(): Promise<User> {
        this.user = {
            id: 0,
            username: ''
        };
        let username_cookie = Cookies.get('username');
        if (typeof Cookies.get('id') !== 'undefined') {
            this.user.id = Number(Cookies.get('id'));
        }
        if (typeof username_cookie !== 'undefined') {
            this.user.username = username_cookie;
        }
        return this.user;
    }
        
    public async getState(stateID: number | string): Promise<State> {
        const url = `${this.stateUrl}/${stateID}`;

        return fetchOk(url, {
            method: 'GET',
        }).then(response => {
            return response.json();
        }).then(json => {
            return {
                id: json['id'],
                owner: json['owner'],
                comments: json['comments'],
                user_date: json['user_date'],
                neuroglancer_state: json['neuroglancer_state'],
                readonly: json['readonly'],
                lab: json['lab']
            };
        }).catch(err => {
            StatusMessage.showTemporaryMessage('The URL is deleted from database. Please check again.');
            return {
                id: 0,
                owner: 0,
                comments: err,
                user_date: "0",
                neuroglancer_state: {},
                readonly: false,
                lab: "NA"
            };
        });
    }

    async newState(state: State): Promise<State> {
        const url = this.stateUrl;
        const access = Cookies.get('access'); 
        const body = {
            id: state['id'],
            owner: state['owner'],
            comments: state['comments'],
            user_date: state['user_date'],
            neuroglancer_state: state['neuroglancer_state'],
            readonly: state['readonly'],
            lab: state['lab']
        };

        return fetchOk(url, {
            method: 'POST',
            credentials: 'omit', // Required to pass CSRF Failed error
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`,
            },
            body: JSON.stringify(body, null, 0),
        }).then(response => {
            return response.json();
        }).then(json => {
            const href = new URL(location.href);
            href.searchParams.set('id', json['id']);
            window.history.pushState({}, '', href.toString());
            urlParams.stateID = json['id'];
            return {
                id: json['id'],
                owner: json['owner'],
                comments: json['comments'],
                user_date: json['user_date'],
                neuroglancer_state: json['neuroglancer_state'],
                readonly: json['readonly'],
                lab: json['lab']
            };
        });
    }

    async saveState(stateID: number | string, state: State): Promise<State> {
        const url = `${this.stateUrl}/${stateID}`;
        const access = Cookies.get('access'); 
        const body = {
            id: state['id'],
            owner: state['owner'],
            comments: state['comments'],
            user_date: state['user_date'],
            neuroglancer_state: state['neuroglancer_state'],
            readonly: state['readonly'],
            lab: state['lab']
        };

        return fetchOk(url, {
            method: 'PUT',
            credentials: 'omit', // Required to pass CSRF Failed error
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`,
            },
            body: JSON.stringify(body, null, 0),
        }).then(response => {
            return response.json();
        }).then(json => {
            return {
                id: json['id'],
                owner: json['owner'],
                comments: json['comments'],
                user_date: json['user_date'],
                neuroglancer_state: json['neuroglancer_state'],
                readonly: json['readonly'],
                lab: json['lab']
            };
        });
    }
}

export const stateAPI = new StateAPI(
    `${AppSettings.API_ENDPOINT}/neuroglancer`,
);

export const urlParams = getUrlParams();

export class StateLoader extends RefCounted {
    element = document.createElement('div');

    private stateAPI: StateAPI;
    private input: StateAutocomplete;
    private resetButton: HTMLElement;
    private saveButton: HTMLElement;
    private newButton: HTMLElement;
    private user: User;
    private stateID: number;

    constructor(public viewer: Viewer) {
        super();
        this.element.classList.add('state-loader');

        this.stateAPI = stateAPI;

        this.stateAPI.getUser().then(user => {
            this.user = user;

            if (this.user.id !== 0) {
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

                this.newButton = makeIcon({ text: 'New', title: 'Save to a new JSON state' });
                this.registerEventListener(this.newButton, 'click', () => {
                    this.newState();
                });
                this.element.appendChild(this.newButton);

                this.stateID = -1;
                this.input.value = 'Type URL name here';
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

    private validateState(state: State | null) {
        if (state !== null) {
            this.stateID = state['id'];
            this.input.value = state['comments'];
            this.saveButton.style.removeProperty('display');
            this.resetButton.style.removeProperty('display');
        }
    }

    private getState() {
        this.stateAPI.getState(this.stateID).then(state => {
            this.validateState(state);
            if (state.readonly) {
                this.saveButton.style.removeProperty('display');
                this.saveButton.style.display = 'none';
                }

        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    private saveState() {
        const comments = this.input.value;
        if (comments.length === 0) {
            StatusMessage.showTemporaryMessage(`There was an error: the comment cannot be empty.`);
            return;
        }

        const state = {
            id: this.stateID,
            owner: this.user.id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            lab: 'NA'
        };

        this.stateAPI.saveState(this.stateID, state).then(() => {
            StatusMessage.showTemporaryMessage(`The data was saved successfully.`);
        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    private newState() {
        const comments = this.input.value;
        if (comments.length === 0) {
            StatusMessage.showTemporaryMessage(`Error: the comment cannot be empty.`);
            return;
        }

        const state = {
            id: this.stateID,
            owner: this.user.id,
            comments: comments,
            user_date: String(Date.now()),
            neuroglancer_state: getCachedJson(this.viewer.state).value,
            readonly: false,
            lab: "NA"
        };

        this.stateAPI.newState(state).then((newState) => {
            this.validateState(newState);
            StatusMessage.showTemporaryMessage(`A new data state has been created.`);
        }).catch(err => {
            StatusMessage.showTemporaryMessage(`Internal error: please see debug message.`);
            console.log(err);
        });
    }

    private resetState() {
        this.viewer.urlHashBinding.resetDatabaseState();
    }
}

