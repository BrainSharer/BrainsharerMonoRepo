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
 * @file Support for loading annotation state information.
 */

import { TrackableBoolean } from "../trackable_boolean";
import { RefCounted } from "../util/disposable";
import './annotation_state_loader.css';

/**
 * This class takes care of the maintaining the state of whether the annotations are saved or not.
 */
 export class AnnotationStateLoader extends RefCounted {
    element = document.createElement('div');

    constructor(public annotationsSavedState: TrackableBoolean) {
        super();
        this.makeUIElement();
        if (annotationsSavedState.value) {
            this.element.classList.add('annotation-state-loader-hidden');
        } else {
            this.element.classList.add('annotation-state-loader');
        }
        this.registerDisposer(this.annotationsSavedState.changed.add(() => {
            if (this.annotationsSavedState.value) {
                this.element.classList.add('annotation-state-loader-hidden');
                this.element.classList.remove('annotation-state-loader');
            } else {
                this.element.classList.add('annotation-state-loader');
                this.element.classList.remove('annotation-state-loader-hidden');
            }
        }));
    }

    makeUIElement() {
        // TODO: add code for UI element
        this.element.innerText = "ANNOTATIONS NOT SAVED";
    }
};