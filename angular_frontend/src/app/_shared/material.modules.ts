import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

const materialModules = [
  MatIconModule,
  MatPaginatorModule,
  MatSortModule,
  MatTableModule,
];

@NgModule({
  imports: [
    CommonModule,
    ...materialModules
  ],
  exports: [materialModules],
})
export class AngularMaterialModule { }