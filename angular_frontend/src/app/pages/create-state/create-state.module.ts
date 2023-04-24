import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { NgxPaginationModule } from 'ngx-pagination';

import { CreateStateComponent } from './create-state.component';
import { DataService } from 'src/app/_services/data.service';
import { CreateStateRoutes } from './create-state-routing.module';
import { SharedModule } from 'src/app/_shared/shared.module';
import { AuthGuard } from 'src/app/_services/auth.guard';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, CreateStateRoutes,
    MatExpansionModule, MatIconModule, SharedModule, NgxPaginationModule],
  declarations: [CreateStateComponent],
  providers: [ AuthGuard, DataService],
  bootstrap: [CreateStateComponent]
})
export class CreateStateModule { }
