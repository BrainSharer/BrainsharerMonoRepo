import { Component } from '@angular/core';
import { AuthService } from '../../_services/auth.service';
import { environment } from '../../../environments/environment';

const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

const scope = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

const googleParams = {
    response_type: 'code',
    client_id: '821517150552-71h6bahua9qul09l90veb8g3hii6ed25.apps.googleusercontent.com',
    redirect_uri: environment.GOOGLE_URL,
    prompt: 'select_account',
    access_type: 'offline',
    scope
};



@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent {


    constructor(public authService: AuthService) { }

    public title:string = environment.TITLE;


    public clickGoogle() {
        if (environment.production) {
            const urlParams = new URLSearchParams(googleParams).toString();
            window.location.href = `${googleAuthUrl}?${urlParams}`;    
        } else {
            alert('This functionality is not available on the demo site.');
        }
    }
  
    public clickAdmin() {
        window.location.href = environment.API_URL + '/admin';
    }
  
    public clickLocalLogin() {
        window.location.href = environment.API_URL + '/local/login/';
    }

    /**
     * The first method removes cookies and localstorage
     * The 2nd method logs you out of Django and redirects
     */
    public clickLocalLogout() {
        this.authService.logout();
        window.location.href = environment.API_URL + '/local/signout/';
    }

    public clickLocalRegister() {
        if (environment.production) {
            window.location.href = environment.API_URL + '/local/signup/';
        } else {
            alert('This functionality is not available on the demo site.');
        }
    }

    public clickLocalLostPassword() {
        if (environment.production) {
            window.location.href = environment.API_URL + '/local/password_reset/';
        } else {
            alert('This functionality is not available on the demo site.');
        }
    }



}
