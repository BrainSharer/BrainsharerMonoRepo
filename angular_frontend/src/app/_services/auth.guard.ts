import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

import { User } from 'src/app/_models/user';
import { AuthService } from './auth.service';
import { NotificationService } from 'src/app/_services/notification';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class AuthGuard implements CanActivate {
  private user: User = {
    id:0, 
    username:'',
    first_name:'',
    last_name:'',
    email:'',
    password:'',
    password2:''};


  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private notificationService: NotificationService) { }

    /**
     * The name of the token cookie is named: 'access'
     * @returns true if there is a cookie named access, otherwise return false
     */
  canActivate(): boolean {
    let status: boolean = false;
    let access = this.cookieService.get('access');
    const user_id = this.cookieService.get('id');
    const username = this.cookieService.get('username');
    const first_name = this.cookieService.get('first_name');
    const last_name = this.cookieService.get('last_name');
    const email = this.cookieService.get('email');
    if (access) {
      this.authService.refreshToken();
      this.user = {'id': +user_id, 'username': username, 'first_name': first_name, 'last_name': last_name, 'email': email, 'password':'', 'password2': ''};
      this.authService.user = this.user;
      status = true;
    } else {
      // not logged in so display warning message
      this.notificationService.showError('Error', 'You do not have access to that page.');
      status = false;
    }
    return status;
  }

}
