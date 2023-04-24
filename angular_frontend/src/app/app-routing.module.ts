import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContactComponent } from './pages/contact/contact.component';

const accountModule = () => import('./pages/account/account.module').then(x => x.AccountModule);
const browseStateModule = () => import('./pages/browse-state/browse-state.module').then(x => x.BrowseStateModule);
const createStateModule = () => import('./pages/create-state/create-state.module').then(x => x.CreateStateModule);



const routes: Routes = [
    { path: '', loadChildren: browseStateModule },
    { path: 'account', loadChildren: accountModule },
    { path: 'browse-state', loadChildren: browseStateModule },
    { path: 'create-view', loadChildren: createStateModule },
    { path: 'contact', component: ContactComponent  },
    // otherwise redirect to home
    { path: '**', redirectTo: ''  }
];



@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
