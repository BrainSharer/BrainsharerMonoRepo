import './save_annotation.css';
import {AnnotationLayerView} from 'neuroglancer/ui/annotations';
import {RefCounted} from 'neuroglancer/util/disposable';
import {removeFromParent} from 'neuroglancer/util/dom';
import {makeIcon} from 'neuroglancer/widget/icon';
import { StateLoader } from '../services/state_loader';
import { User, getUser } from 'neuroglancer/services/user_loader';

const buttonText = 'Save annotations';
const buttonTitle = 'Save annotations';

/**
 * This class is used to create a HTML widget on annotation tab which allows
 * to save annotations in a tab to the backend database.
 */
export class SaveAnnotationWidget extends RefCounted {
  element: HTMLElement;
  private saveButton: HTMLElement;

  constructor(private layerView: AnnotationLayerView) {
    super();
    this.layerView = layerView;

    this.saveButton = makeIcon({
      text: buttonText,
      title: buttonTitle,
      onClick: () => {this.saveAnnotation()},
    });
    this.saveButton.classList.add('neuroglancer-save-annotation-button');

    this.element = document.createElement('div');
    this.element.classList.add('neuroglancer-save-annotation-tool');
    this.element.appendChild(this.saveButton);

    getUser().then(data => {
      const user:User = data;
      if (user.user_id === 0) {
        this.saveButton.style.removeProperty('display');
        this.saveButton.style.display = 'none';
      } 
    });


    this.registerDisposer(() => removeFromParent(this.element));
  }
  /**
   * Saves the annotation by calling the stateLoader with the layername.
   */
  private saveAnnotation() {
    const layerName = this.layerView.layer.managedLayer.name;
    //@ts-ignore
    const stateLoader = <StateLoader>(window['viewer'].stateLoader);
    stateLoader.saveAnnotations(layerName);
  }
}