import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { State } from 'src/app/_models/state';
import { Lab } from 'src/app/_models/lab';
import { DataService } from 'src/app/_services/data.service';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/_services/auth.service';


@Component({
  selector: 'app-browse-state',
  templateUrl: './browse-state.component.html',
  styleUrls: ['./browse-state.component.css']
})
export class BrowseStateComponent implements OnInit {
  labs: Lab[] = [];
  states: State[] = [];
  baseUrl = environment.API_URL;
  ngUrl = environment.NG_URL;
  url_ID = 0;
  animalUrl = this.baseUrl + '/animal';
  labUrl = this.baseUrl + '/labs';
  neuroUrl = this.baseUrl + '/neuroglancer';
  searchForm: FormGroup = new FormGroup({
    comments: new FormControl(''),
    labs: new FormControl(''),
  });

  page: number = 1;
  count: number = 0;
  tableSize: number = 6;
  tableSizes: any = [3, 6, 9, 12];


  constructor(private dataService: DataService,
    public authService: AuthService) { }

  ngOnInit(): void {
    this.setData(this.neuroUrl);
    this.setLabs(this.labUrl);
  }


  public searchLab(search: number): void {
    const url = this.neuroUrl + '?lab=' + search;
    console.log(url);
    this.setData(url);
    this.page = 1;
  }


  public searchTitle(search: string): void {
    const url = this.neuroUrl + '?comments=' + search;
    this.setData(url);
    this.page = 1;
  }

  private setLabs(url: string): void {
    this.dataService.getData(url).subscribe(response => {
      this.labs = response.results;
    });

  }

  private setData(url: string): void {
    this.dataService.getData(url).subscribe(response => {
      this.states = response.results;
    });
  }

  public onTableDataChange(event: any) {
    this.page = event;
    this.setData(this.neuroUrl);
  }

  public onTableSizeChange(event: any): void {
    this.tableSize = event.target.value;
    this.page = 1;
    this.setData(this.neuroUrl);
  }


}