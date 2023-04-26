import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';

import { GroupView, StateView } from 'src/app/_models/state_view';
import { GroupSet } from 'src/app/_models/group.set';
import { Lab } from 'src/app/_models/lab';
import { DataService } from 'src/app/_services/data.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-create-state',
  templateUrl: './create-state.component.html',
  styleUrls: ['./create-state.component.css']
})
export class CreateStateComponent implements OnInit {
  labs: Lab[] = [];
  states: StateView[] = [];
  public selectedStates: StateView[] = [];
  groups : StateView[] = [];
  baseUrl = environment.API_URL;
  ngUrl = environment.NG_URL;
  url_ID = 0;
  animalUrl = this.baseUrl + '/animal';
  labUrl = this.baseUrl + '/labs';
  stateUrl = this.baseUrl + '/states';
  searchForm: UntypedFormGroup = new UntypedFormGroup({
    comments: new UntypedFormControl(''),
    labs: new UntypedFormControl(''),
    layer_types: new UntypedFormControl('')
  });

  page: number = 1;
  count: number = 0;
  tableSize: number = 7;
  tableSizes: any = [3, 6, 9, 12];

  layer_types = [
    { id: '', name: 'All' },
    { id: 'annotation', name: 'Annotation' },
    { id: 'segmentation', name: '3D volume' },
    { id: 'image', name: 'Image stack' },
  ]

  constructor(
    private dataService: DataService
    ) { }

    ngOnInit(): void {
      this.setData(this.stateUrl);
      this.setLabs(this.labUrl);
    }

    public onReset(): void {
    }

    public searchLab(search: number): void {
      const url = this.stateUrl + '?lab=' + search;
      this.setData(url);
      this.page = 1;
    }

    public searchLayerType(search: string): void {
      const url = this.stateUrl + '?layer_type=' + search;
      this.setData(url);
      this.page = 1;
    }

    public searchTitle(search: string): void {
      const url = this.stateUrl + '?animal=' + search;
      this.setData(url);
      this.page = 1;
    }

  private setLabs(url: string): void {
    this.dataService.getData(url).subscribe(response => {
      this.labs = response.results;
    });

  }

  private setData(url: string): void {
    this.dataService.getSecureData(url).subscribe(response => {
      this.states = response.results;
      this.groups = Array.from(new GroupSet(response.results.map((x: GroupView) => new GroupView(x.group_name, x.layer_type))));
    });
  }

  public toggleLeftSide(isToggled: boolean, layer_type: string): void {
    console.log(layer_type);
    this.states.filter(element => {
      return element.layer_type == layer_type;
    })
  }

  public toggleRightSide(isToggled: boolean, state_id: number): void {
    
    let state = this.states.filter(element => {
      return element.id == state_id;
    })

    if (isToggled) {
      this.selectedStates.push(state[0]);

    } else {
      for (let i in this.selectedStates) {
        let index: number = this.selectedStates.indexOf(state[0]);
        if (index !== -1) {
          this.selectedStates.splice(index, 1);
        }
      }
    }
  }

  public onSubmit() {
    if (this.selectedStates.length > 0) {
      this.dataService.addStateView(this.selectedStates)
        .subscribe({
          next: (res) => {
            this.url_ID = res;
            const redirecturl = this.ngUrl + '?id=' + this.url_ID;
            // window.location.href = redirecturl;
            window.open(redirecturl, '_blank');
          },
          error: (e) => console.error(e)
        });
    }
  }

  public onTableDataChange(event: any) {
    this.page = event;
    this.setData(this.stateUrl);
  }

  public onTableSizeChange(event: any): void {
    this.tableSize = event.target.value;
    this.page = 1;
    this.setData(this.stateUrl);
  }


}