import { RouterModule, Routes } from '@angular/router';
import { BrowseStateComponent } from './browse-state.component';

const routes: Routes = [
  { path: '', component: BrowseStateComponent }
];

export const BrowseStateRoutes = RouterModule.forChild(routes);

