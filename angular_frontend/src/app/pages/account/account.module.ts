import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
import { HttpClientModule } from '@angular/common/http';
import { AccountRoutingModule } from './account-routing.module';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';


@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AccountRoutingModule,
        RecaptchaModule,
        RecaptchaFormsModule,
        HttpClientModule,
    ],
    providers: [],
    declarations: [
        LoginComponent,
        RegisterComponent
    ]
})
export class AccountModule { }