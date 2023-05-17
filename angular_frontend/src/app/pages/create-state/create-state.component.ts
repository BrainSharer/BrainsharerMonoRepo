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
  resultsCount = 0;
  resultsPerPage = 10;
  offset = 0;
  page: number = 1;
  count: number = 0;
  isLoading = true;
  layer_type_filter: string | undefined;
  lab_filter: number | undefined;
  title_filter: string | undefined;

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

  layer_types = [
    { id: '', name: 'All' },
    { id: 'annotation', name: 'Annotation' },
    { id: 'segmentation', name: '3D volume' },
    { id: 'image', name: 'Image stack' },
  ]

  searchForm: UntypedFormGroup = new UntypedFormGroup({
    comments: new UntypedFormControl(''),
    labs: new UntypedFormControl(''),
    layer_types: new UntypedFormControl('')
  });


  constructor(
    private dataService: DataService
  ) { }

    ngOnInit(): void {
      this.setData();
      this.setLabs(this.labUrl);
    }

    public onReset(): void {
    }


  /**
   * This gets called when a user selects a lab.
   * The lab search ID is set and the data is set from the REST API
   * @param labId integer for the Lab ID
   */
  public searchLab(labId: number): void {
    this.lab_filter = labId;
    this.page = 0;
    this.setData();
  }


    /**
     * This gets called when a user enters something in the search title field.
     * @param search string of title search
     */
    public searchLayerType(search: string): void {
      this.layer_type_filter = search;
      this.setData();
      this.page = 0;
    }

    public searchTitle(search: string): void {
      this.title_filter = search;
      this.setData();
      this.page = 0;
    }

  /**
   * Fill up the drop down menu with the labs
   * @param url URL string used to fetch results from the REST API
   */
  private setLabs(url: string): void {
    this.dataService.getData(url).subscribe(response => {
      this.labs = response.results;
    });
  }

    /**
   * This gets called right when the page loads, and whenever
   * a user clicks on the pagination or the search fields.
   * @returns a URL as string
   */
    private buildUrl(): string {
      let baseUrl = this.stateUrl + '?limit=' + this.resultsPerPage + "&offset=" + this.offset;
      
      if (this.lab_filter) {
        baseUrl += '&lab=' + this.lab_filter;
      }
  
      if (this.layer_type_filter) {
        baseUrl += '&layer_type=' + this.layer_type_filter;
      }
  
      if (this.title_filter) {
        baseUrl += '&animal=' + this.title_filter;
      }
  
      return baseUrl;
    }
  
    /**
     * This calls the build URL method, and then fetches
     * the data from the REST API.
     */
    private setData(): void {
      let url = this.buildUrl();
      console.log(url);
      this.isLoading = true;
      this.dataService.getSecureData(url).subscribe(response => {
        this.resultsCount = response.count;
        this.states = response.results;
        this.groups = Array.from(new GroupSet(response.results.map((x: GroupView) => new GroupView(x.group_name, x.layer_type))));
        this.isLoading = false;
        console.log('resultsCount=' + this.resultsCount);
        console.log('this.groups.length=' + this.groups.length);
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

  public onRemove(state: StateView) {
    console.log('removing id=' + state.id);
    let index: number = this.selectedStates.indexOf(state);
    if (index !== -1) {
      this.selectedStates.splice(index, 1);
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
    this.setData();
  }

  public onTableSizeChange(event: any): void {
    this.resultsPerPage = event.target.value;
    this.page = 0;
    this.setData();
  }


}