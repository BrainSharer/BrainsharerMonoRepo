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
 */

/**
 * @file Support for editing Neuroglancer state as JSON directly within browser.
 */
 import { Overlay } from 'neuroglancer/overlay';
import { AnnotationType } from '../annotation';
import { AnnotationLayerState } from '../annotation/annotation_layer_state';
import { makeLayer, PersistentViewerSelectionState } from '../layer';
import { Segmentation } from '../services/state';
import { StateLoader } from '../services/state_loader';
import { StatusMessage } from '../status';
import { updateVolumeRef, AnnotationLayerView, getLandmarkList, PlaceVolumeTool, UserLayerWithAnnotations, VolumeSession, ToolMode, updateHasVolumeTool, updateGlobalVolumeMode } from './annotations';
import { PolygonOptionsDialog } from './polygon_options';
import { LegacyTool } from './tool';
import { ref, update } from "firebase/database";
import { database } from 'neuroglancer/services/firebase';
import { urlParams } from 'neuroglancer/services/state_loader';
 
 import './volume_session.css';
  /**
   * A Class to create HTML Element for annotation volumes.
   */
  export class VolumeSessionDialog extends Overlay {
    /** Landmark dropdown containing landmarks of volumes */
    landmarkDropdown : HTMLSelectElement|undefined = undefined;
    /** Color element for selecting color for annotations */
    colorInput: HTMLInputElement|undefined = undefined;
    constructor(public annotationLayerView: AnnotationLayerView) {
      super();
      
      const configTable = document.createElement('table');
      configTable.caption = configTable.createCaption();
      configTable.caption.innerHTML = "<h2>Volume session</h2>";

      const volumeInfoRows = this.getVolumeInfoRows();
      const newVolumeRow = this.getNewVolumeRow();
      const editVolumeRow = this.getEditVolumeRow();
      const closeSessionRow = this.closeSessionRow();
      const segmentationRow = this.getSegmentationRow();
      const polygonConfigRow = this.polygonConfigRow();

      volumeInfoRows.forEach(volumeInfoRow => {
        configTable.appendChild(volumeInfoRow);
      });
      configTable.appendChild(newVolumeRow);
      configTable.appendChild(editVolumeRow);
      configTable.appendChild(closeSessionRow);
      configTable.appendChild(polygonConfigRow);
      configTable.appendChild(segmentationRow);
      configTable.classList.add('volume-session-table');

      const closeButton = document.createElement('button');
      closeButton.innerText = 'X';
      closeButton.classList.add('close-btn');
      closeButton.addEventListener('click', () => {
        this.dispose();
      });

      this.content.appendChild(configTable);
      this.content.appendChild(closeButton);
    }
    /**
     * 
     * @returns A HTML table row containing information to start a new volume session.
     */
    getNewVolumeRow() : HTMLTableRowElement {
      const row = document.createElement('tr');
      const col = document.createElement('td');
      col.style.textAlign = 'center';
      col.colSpan = 2;
      const button = document.createElement('button');

      button.setAttribute('type', 'button');
      button.textContent = 'Start new volume';
      button.addEventListener('click', () => {
        this.annotationLayerView.layer.tool.value = new PlaceVolumeTool(this.annotationLayerView.layer, {}, 
          undefined, ToolMode.DRAW, this.annotationLayerView.volumeSession, this.annotationLayerView.volumeButton, false);
        const volumeTool = <PlaceVolumeTool>this.annotationLayerView.layer.tool.value;
        let color = (this.colorInput)? this.colorInput.value : undefined;
        let description = (this.landmarkDropdown)? this.landmarkDropdown.options[this.landmarkDropdown.selectedIndex].value : undefined;
        if (description === '') {
          StatusMessage.showTemporaryMessage("Please select a description from the landmark");
          return;
        }
  
        //@ts-ignore
        if(!volumeTool.annotationLayer || !volumeTool.annotationLayer.source || !volumeTool.annotationLayer.source.annotationMap) {
          return
        }
        const reference = volumeTool.createNewVolumeAnn(description, color);
        //@ts-ignore
        if(!volumeTool.annotationLayer || !volumeTool.annotationLayer.source || !volumeTool.annotationLayer.source.annotationMap) {
          return
        }
        updateHasVolumeTool();

        updateGlobalVolumeMode(ToolMode.DRAW);

        if (reference === undefined || !reference.value) {
          StatusMessage.showTemporaryMessage("Failed to create new volume");
          this.annotationLayerView.layer.tool.value = undefined;
          if (reference) reference.dispose();
        } else {
          volumeTool.session.value = <VolumeSession>{reference: reference};
          //@ts-ignore
          if(!volumeTool.annotationLayer || !volumeTool.annotationLayer.source || !volumeTool.annotationLayer.source.annotationMap) {
            return
          }
          updateVolumeRef(reference.id);
        }

        if(urlParams.multiUserMode) {
          const updates: any = {};
          updates[`/test_annotations_tool/volume_mode/${urlParams.stateID}`] = ToolMode.DRAW;
          update(ref(database), updates)
              .then(() => {
                  console.log('Successfully Published Volume Mode State to Firebase');
              })
              .catch((error) => {
                  console.error(error);
              });
        }

        this.dispose();
      });
      button.classList.add('volume-session-btn');

      col.appendChild(button);
      row.appendChild(col);
      return row;
    }
    /**
     * 
     * @returns A html row element containing information about landmark and color for the volumes.
     */
    getVolumeInfoRows() : HTMLTableRowElement[] {
      const labelRow = document.createElement('tr');
      const labelDesc = document.createElement('td');
      labelDesc.textContent = "Description: ";
      const landmarkCol = document.createElement('td');
      const landmarkDropdown = this.getLandMarkDropDown();
      landmarkCol.appendChild(landmarkDropdown);
      labelRow.appendChild(labelDesc);
      labelRow.appendChild(landmarkCol);

      const colorRow = document.createElement('tr');
      const colorDesc = document.createElement('td');
      colorDesc.textContent = "Color: ";
      const colorInput = document.createElement('input');
      colorInput.setAttribute('type', 'color');
      colorInput.style.backgroundColor = 'black';
      colorInput.value = 'yellow';
      if (this.annotationLayerView.layer.annotationColorPicker) {
        colorInput.value = this.annotationLayerView.layer.annotationColorPicker.getColor();
      }
      colorRow.appendChild(colorDesc);
      colorRow.appendChild(colorInput);

      this.landmarkDropdown = landmarkDropdown;
      this.colorInput = colorInput;

      return [labelRow, colorRow];
    }
    /**
     * 
     * @returns A html row element containing information about starting a edit session for volume.
     */
    getEditVolumeRow() : HTMLTableRowElement {
      const row = document.createElement('tr');
      const col = document.createElement('td');
      col.style.textAlign = 'center';
      col.colSpan = 2;
      const button = document.createElement('button');

      button.setAttribute('type', 'button');
      button.textContent = 'Edit volume';
      button.addEventListener('click', () => {
        const selectionState : PersistentViewerSelectionState|undefined = 
        this.annotationLayerView.layer.manager.root.selectionState.value;

        if (!this.annotationLayerView.layer.manager.root.selectionState.pin.value || selectionState === undefined) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to start editing");
          return;
        }
        let selectedAnnotationId = undefined;
        let selectedAnnotationLayer = undefined;

        for (let layer of selectionState.layers) {
          if (layer.state.annotationId === undefined) continue;
          const userLayerWithAnnotations = <UserLayerWithAnnotations>layer.layer;
          const annotationLayer = userLayerWithAnnotations.annotationStates.states.find(
            x => x.sourceIndex === layer.state.annotationSourceIndex &&
                (layer.state.annotationSubsource === undefined ||
                x.subsourceId === layer.state.annotationSubsource) && !x.source.readonly);
          if (annotationLayer === undefined) continue;
          selectedAnnotationLayer = this.annotationLayerView.layer.annotationStates.states.find(
            x => x === annotationLayer 
          );
          if (selectedAnnotationLayer === undefined) continue;
          
          selectedAnnotationId = layer.state.annotationId;
          selectedAnnotationLayer = annotationLayer;
          break;
        }
        if (selectedAnnotationId === undefined || selectedAnnotationLayer === undefined) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to start editing");
          return;
        }

        const reference = selectedAnnotationLayer.source.getReference(selectedAnnotationId);
        if (!reference.value || reference.value.type !== AnnotationType.VOLUME) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to start editing");
          if (reference) reference.dispose();
          return;
        }

        this.annotationLayerView.layer.tool.value = new PlaceVolumeTool(this.annotationLayerView.layer, {}, 
          undefined, ToolMode.EDIT, this.annotationLayerView.volumeSession, this.annotationLayerView.volumeButton);
        updateGlobalVolumeMode(ToolMode.EDIT);

        const volumeTool = <PlaceVolumeTool>this.annotationLayerView.layer.tool.value;
        volumeTool.session.value = <VolumeSession>{reference: reference};

        if(urlParams.multiUserMode) {
          const updates: any = {};
          updates[`/test_annotations_tool/volume_mode/${urlParams.stateID}`] = ToolMode.EDIT;
          update(ref(database), updates)
              .then(() => {
                  console.log('Successfully Published Cell Session State to Firebase');
              })
              .catch((error) => {
                  console.error(error);
              });
        }

        this.dispose();
      });
      button.classList.add('volume-session-btn');

      col.appendChild(button);
      row.appendChild(col);
      return row;
    }
    /**
     * 
     * @returns A html row element containing information about closing the current active volume session.
     */
    closeSessionRow() : HTMLTableRowElement {
      const row = document.createElement('tr');
      const col = document.createElement('td');
      col.style.textAlign = 'center';
      col.colSpan = 2;
      const button = document.createElement('button');

      button.setAttribute('type', 'button');
      button.textContent = 'Close session';
      button.addEventListener('click', () => {
        const isInstance = this.annotationLayerView.layer.tool.value instanceof PlaceVolumeTool;
        if (isInstance) {
          if (this.annotationLayerView.layer.tool.value  instanceof LegacyTool) {
            this.annotationLayerView.layer.tool.value.layer.tool.value = undefined;
          }
        }
        this.dispose();
      });
      button.classList.add('volume-session-btn');

      col.appendChild(button);
      row.appendChild(col);
      return row;
    }
    /**
     * 
     * @returns A table row element for polygon configuration.
     */
     polygonConfigRow() : HTMLTableRowElement {
      const row = document.createElement('tr');
      const col = document.createElement('td');
      col.style.textAlign = 'center';
      col.colSpan = 2;
      const button = document.createElement('button');

      button.setAttribute('type', 'button');
      button.textContent = 'Polygon configuration';
      button.addEventListener('click', () => {
        this.dispose();
        new PolygonOptionsDialog();
      });
      button.classList.add('volume-session-btn');

      col.appendChild(button);
      row.appendChild(col);
      return row;
    }
    /**
     * 
     * @returns A html select element containing all the landmarks for the volume session.
     */
    getLandMarkDropDown() : HTMLSelectElement {
      const landmarkDropdown = document.createElement('select');
      landmarkDropdown.classList.add('neuroglancer-landmarks-dropdown');
      const defaultOption = document.createElement('option');
      defaultOption.text = 'Select landmark';
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      landmarkDropdown.add(defaultOption);

      getLandmarkList(AnnotationType.VOLUME).then(function(result) {
        const n_landmark = result.length
        for (let i = 0; i < n_landmark; i++){
          const landmarki = result[i];
          const option = document.createElement('option');
          option.value = landmarki; 
          option.text = landmarki;
          landmarkDropdown.add(option)
        }
      });

      return landmarkDropdown;
    }
    /**
     * This is currently disabled as it needs to run as a background process and it 
     * also needs to allow the apache user write access to the NFS filesystem.
     * @returns A html row element containing information about segmentation feature of volume session.
     */
    getSegmentationRow() : HTMLTableRowElement {
      const row = document.createElement('tr');
      const col = document.createElement('td');
      col.style.textAlign = 'center';
      col.colSpan = 2;
      const button = document.createElement('button');

      button.setAttribute('type', 'button');
      button.textContent = 'Segment volume';
      button.addEventListener('click', () => {
        const selectionState : PersistentViewerSelectionState|undefined = 
        this.annotationLayerView.layer.manager.root.selectionState.value;

        if (!this.annotationLayerView.layer.manager.root.selectionState.pin.value || selectionState === undefined) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to segment");
          return;
        }
        let selectedAnnotationId :string|undefined = undefined;
        let selectedAnnotationLayer :AnnotationLayerState|undefined = undefined;
        let selectedUserLayer :UserLayerWithAnnotations|undefined = undefined;

        for (let layer of selectionState.layers) {
          if (layer.state.annotationId === undefined) continue;
          const userLayerWithAnnotations = <UserLayerWithAnnotations>layer.layer;
          const annotationLayer = userLayerWithAnnotations.annotationStates.states.find(
            x => x.sourceIndex === layer.state.annotationSourceIndex &&
                (layer.state.annotationSubsource === undefined ||
                x.subsourceId === layer.state.annotationSubsource) && !x.source.readonly);
          if (annotationLayer === undefined) continue;
          selectedAnnotationLayer = this.annotationLayerView.layer.annotationStates.states.find(
            x => x === annotationLayer 
          );
          if (selectedAnnotationLayer === undefined) continue;
          
          selectedAnnotationId = layer.state.annotationId;
          selectedAnnotationLayer = annotationLayer;
          selectedUserLayer = userLayerWithAnnotations;
          break;
        }
        if (selectedAnnotationId === undefined || selectedAnnotationLayer === undefined || selectedUserLayer === undefined) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to segment");
          return;
        }

        const reference = selectedAnnotationLayer.source.getReference(selectedAnnotationId);
        if (!reference.value || reference.value.type !== AnnotationType.VOLUME) {
          StatusMessage.showTemporaryMessage("Please select and pin a volume annotation in current layer to segment");
          if (reference) reference.dispose();
          return;
        }
        //@ts-ignore
        const stateLoader = <StateLoader>(window['viewer'].stateLoader);
        const successCallback = (res: Segmentation) => {
          const manager = selectedUserLayer!.manager;
          const segmentationLayer = makeLayer(manager, res.name, {type: 'segmentation', 
          'source': res.url, 'tab': 'segments', 'segments': ["1"]});
          manager.add(segmentationLayer);
        }
        stateLoader.segmentVolume(reference.id, successCallback);

        // const resTemp : Segmentation = {
        //   url: 'testURL',
        //   name: 'testName'
        // };
        // successCallback(resTemp);

        this.dispose();
      });
      button.classList.add('volume-session-btn');

      col.appendChild(button);
      row.appendChild(col);
      return row;
    }
  }
  