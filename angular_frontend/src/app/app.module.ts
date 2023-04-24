import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './_shared/header/header.component';
import { ContactComponent } from './pages/contact/contact.component';
import { AuthService } from './_services/auth.service';
import { AuthGuard } from 'src/app/_services/auth.guard';
import { InterceptService } from 'src/app/_services/intercept.service';


@NgModule({
    declarations: [
        AppComponent,
        ContactComponent,
        HeaderComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        AppRoutingModule,
        FormsModule,
        NgbModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        ToastrModule.forRoot()
    ],
    providers: [InterceptService, { provide: HTTP_INTERCEPTORS, useClass: InterceptService, multi: true }, AuthService, CookieService, AuthGuard],
    bootstrap: [AppComponent]
})
export class AppModule { }
