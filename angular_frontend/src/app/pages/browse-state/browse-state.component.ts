import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';

import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import {MatPaginator, PageEvent} from '@angular/material/paginator';

import { NeuroglancerState } from 'src/app/_models/state';
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
  displayedColumns: string[] = ['id', 'comments', 'lab', 'created', 'view'];
  dataSource = new MatTableDataSource<NeuroglancerState>();
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  resultsCount = 0;
  resultsPerPage = 10;
  offset: number | undefined;
  isLoading = true;


  labs: Lab[] = [];
  neuroglancer_states: NeuroglancerState[] = [];
  baseUrl = environment.API_URL;
  ngUrl = environment.NG_URL;
  url_ID = 0;
  animalUrl = this.baseUrl + '/animal';
  labUrl = this.baseUrl + '/labs';
  neuroUrl = this.baseUrl + '/neuroglancers';
  searchForm: UntypedFormGroup = new UntypedFormGroup({
    comments: new UntypedFormControl(''),
    labs: new UntypedFormControl(''),
  });

  page: number = 0;


  constructor(private dataService: DataService,
    public authService: AuthService) { }

  ngOnInit(): void {
    this.setData(this.neuroUrl);
    this.setLabs(this.labUrl);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
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
    this.isLoading = true;
    this.dataService.getData(url).subscribe(response => {
      this.resultsCount = response.count;
      this.dataSource.data = response.results as NeuroglancerState[];
      this.isLoading = false;
    });
  }

  public redirectToView = (id: string) => {
    const redirecturl = this.ngUrl + '?id=' + id;
    window.open(redirecturl, '_blank');
  }

  public onChangePage(pe:PageEvent) {
    // "http://localhost:8000/neuroglancer?limit=10&offset=10",
    this.page = pe.pageIndex;
    let offset = pe.pageIndex * this.resultsPerPage;
    let url = this.neuroUrl + '?limit=' + this.resultsPerPage + "&offset=" + offset;
    console.log(url);
    this.setData(url);
  }


}