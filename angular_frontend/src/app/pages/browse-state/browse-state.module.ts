import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { NgxPaginationModule } from 'ngx-pagination';

import { BrowseStateComponent } from './browse-state.component';
import { DataService } from 'src/app/_services/data.service';
import { BrowseStateRoutes } from './browse-state-routing';
import { SharedModule } from 'src/app/_shared/shared.module';
import { AuthGuard } from 'src/app/_services/auth.guard';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, BrowseStateRoutes,
    MatExpansionModule, MatIconModule, SharedModule, NgxPaginationModule],
  declarations: [BrowseStateComponent],
  providers: [ AuthGuard, DataService],
  bootstrap: [BrowseStateComponent]
})
export class BrowseStateModule { }
