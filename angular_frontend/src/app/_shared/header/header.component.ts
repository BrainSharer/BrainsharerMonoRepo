import { Component } from '@angular/core';
import { AuthService } from '../../_services/auth.service';
import { environment } from '../../../environments/environment';



const githubAuthUrl = 'https://github.com/login/oauth/authorize';


const githubParams = {
    client_id: '3ad4b114f66ffb3b6ed8',
    redirect_uri: environment.GITHUB_URL,
};

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


    public clickGithub() {
        const urlParams = new URLSearchParams(githubParams).toString();
        window.location.href = `${githubAuthUrl}?${urlParams}`;
    }

    public clickGoogle() {
        const urlParams = new URLSearchParams(googleParams).toString();
        window.location.href = `${googleAuthUrl}?${urlParams}`;
    }
  
    public clickAdmin() {
        window.location.href = environment.API_URL + '/admin';
    }
  
    public clickLocalLogin() {
        window.location.href = environment.API_URL + '/local/login/';
    }

    public clickLocalLogout() {
        window.location.href = environment.API_URL + '/local/logout/';
    }

    public clickLocalRegister() {
        window.location.href = environment.API_URL + '/local/signup/';
    }

    public clickLocalLostPassword() {
        window.location.href = environment.API_URL + '/local/password_reset/';
    }



}
