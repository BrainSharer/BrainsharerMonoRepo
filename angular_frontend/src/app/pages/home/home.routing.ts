import { RouterModule, Routes } from '@angular/router';
import { BrowseStateComponent } from './home.component';

const routes: Routes = [
  { path: '', component: HomeComponent }
];

export const HomeRoutes = RouterModule.forChild(routes);

