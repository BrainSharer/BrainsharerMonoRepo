import { NgModule } from '@angular/core';

import { FilterPipe } from '../_utils/filter.pipe';
import { StateFilterPipe  } from '../_utils/state.filter'

@NgModule({
  declarations: [FilterPipe, StateFilterPipe],
  // exports is required so you can access your component/pipe in other modules
  exports: [FilterPipe, StateFilterPipe]
})
export class SharedModule{}