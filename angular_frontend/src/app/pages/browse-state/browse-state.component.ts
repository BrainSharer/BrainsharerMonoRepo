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
  displayedColumns: string[] = ['description', 'id', 'single_view', 'multi_view'];
  dataSource = new MatTableDataSource<NeuroglancerState>();
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  page: number = 0;
  resultsCount = 0;
  resultsPerPage = 10;
  offset = 0;
  isLoading = true;
  description_filter: string | undefined;
  lab_filter: number | undefined;
  labs: Lab[] = [];
  neuroglancer_states: NeuroglancerState[] = [];

  baseUrl = environment.API_URL;
  ngUrl = environment.NG_URL;
  animalUrl = this.baseUrl + '/animal';
  labUrl = this.baseUrl + '/labs';
  neuroUrl = this.baseUrl + '/neuroglancers';

  searchForm: UntypedFormGroup = new UntypedFormGroup({
    description: new UntypedFormControl(''),
    labs: new UntypedFormControl(''),
  });


  constructor(private dataService: DataService,
    public authService: AuthService) { }

    /**
     * Run on page load. set the list of views and get the available labs
     */
  ngOnInit(): void {
    this.setData();
    this.setLabs(this.labUrl);
  }

  /**
   * Set up the initial sort and pagination
   */
  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
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
   * This gets called when a user types something in the search box.
   * @param search string for whatever the user inputs. Searches the description field from the database
   */
  public searchTitle(search: string): void {
    if (search && search.length > 1) {
      this.description_filter = search;
    } else {
      this.description_filter = undefined;
    }
    this.page = 0;
    this.setData();
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
   * This gets called when the user clicks the view icon (the brain icon)
   * @param id the Neuroglancer state ID
   */
  public redirectToView = (id: string) => {
    const redirecturl = this.ngUrl + '?id=' + id;
    window.open(redirecturl, '_blank');
  }

  /**
   * This gets called when the user clicks the view multi user icon (the people icon)
   * @param id the Neuroglancer state ID
   */
  public redirectToMulti = (id: string) => {
    const redirecturl = this.ngUrl + '?id=' + id + "&multi=1";
    window.open(redirecturl, '_blank');
  }

  /**
   * This gets called when the user clicks one of the forward or
   * backward buttons at the bottom of the table.
   * @param pe the pagination event, click forward, backward
   */
  public onChangePage(pe:PageEvent) {
    // "http://localhost:8000/neuroglancer?limit=10&offset=10",
    this.page = pe.pageIndex;
    this.offset = pe.pageIndex * this.resultsPerPage;
    this.setData();
  }

  /**
   * This gets called right when the page loads, and whenever
   * a user clicks on the pagination or the search fields.
   * @returns a URL as string
   */
  private buildUrl(): string {
    let baseUrl = this.neuroUrl + '?limit=' + this.resultsPerPage + "&offset=" + this.offset;

    if (this.description_filter && this.description_filter.length > 1) {
      baseUrl += '&description=' + this.description_filter;
    }

    if (this.lab_filter) {
      baseUrl += '&lab=' + this.lab_filter;
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
    this.dataService.getData(url).subscribe(response => {
      this.resultsCount = response.count;
      this.dataSource.data = response.results as NeuroglancerState[];
      this.isLoading = false;
    });
  }


}
