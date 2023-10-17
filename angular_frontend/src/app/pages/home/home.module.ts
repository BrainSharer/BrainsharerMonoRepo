import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AngularMaterialModule } from 'src/app/_shared/material.modules';
import { HomeComponent } from './home.component';
import { SharedModule } from 'src/app/_shared/shared.module';


@NgModule({
  imports: [AngularMaterialModule, 
    CommonModule, FormsModule, ReactiveFormsModule, NgbModule,
    SharedModule],
  declarations: [HomeComponent],
  providers: [ ],
  bootstrap: [HomeComponent]
})
export class HomeModule { }
