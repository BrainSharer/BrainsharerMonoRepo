import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

import { NotificationService } from './notification';
import { environment } from '../../environments/environment';
import { User } from '../_models/user';
import { httpValidateOptions } from 'src/app/_services/data.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public sessionActive = new BehaviorSubject<boolean>(this.tokenAvailable());
  public user: User = {
    id: 0,
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password2: ''
  };
  public errors: any = [];
  public token_expires: Partial<Date> = {};
  API_URL = environment.API_URL;

  constructor(
    private cookieService: CookieService,
    private httpClient: HttpClient,
    private notificationService: NotificationService) {
    this.authStatusListener();
  }

  private authStatusListener(): void {
    const access = this.cookieService.get('access');
    console.log(access);
    if (access) {
      this.sessionActive = new BehaviorSubject<boolean>(true);
      this.updateUserDataFromStorage();
    }       
  }

    /**
     * This is the method to use to login into the local Django DB.
     * The Django REST uses simplejwt for token stuff. The token gets sent
     * to use in the response data['access'] 
     * See: https://django-rest-framework-simplejwt.readthedocs.io/en/latest/getting_started.html
     * This has been deprecated as we do the logging in via Django. Django will then redirect
     * back to the angular app after the login.
     * @param username string for the username from the login page
     * @param password string for password
     * @returns 
     */
  public login(username: string, password: string): any {
    return this.httpClient.post<any>(this.API_URL + '/api-token-auth/', { username: username, password: password }, httpOptions)
      .pipe(
        map(data => {
        if (data && data['access']) {
          this.sessionActive.next(true);
          this.updateCookies(data);
          this.updateUser(username);
        } else {
          console.log("No data returned from login.")
        }
        return data;
      }), catchError(error => {
        return throwError(() => new Error('Error: ' + error))
      }));
  }

  public getFullname(): string {
    let fullname = 'NA';
    if (this.user.first_name) {
      fullname = this.user.first_name;
    }
    if (this.user.last_name) {
      fullname = fullname.concat(' ').concat(this.user.last_name);
    }
    return fullname;
  }

  private updateUser(username: string): void {
    this.getCurrentUser(username)
      .subscribe({
        next: (user: User) => {
          this.user = user;
          console.log('updateUser');
          console.log(this.user);
          this.cookieService.set('id', this.user.id.toString(), 7);
          this.cookieService.set('username', this.user.username, 7);
          localStorage.setItem('first_name', this.user.first_name);
          localStorage.setItem('last_name', this.user.last_name);
          localStorage.setItem('email', this.user.email);
        },
        error: (msg: Error) => {
          this.notificationService.showError(msg.message, 'Error fetching user.');
        }
      });
  }


  /**
   * id and username are cookies
   * first_name, last_name and email are in localstorage.
   */
  private updateUserDataFromStorage(): void {
    console.log('updateUserDataFromStorage');
    let last_name = localStorage.getItem('last_name');
    // need username to get the current user REST call
    const username = this.cookieService.get('username');

    if ((username) && (last_name === null)) {
      this.updateUser(username);
      last_name = localStorage.getItem('last_name')
    }

    let email = localStorage.getItem('email');
    let first_name = localStorage.getItem('first_name');
    const id = this.cookieService.get('id');
    if (id) { this.user.id = +id;}
    if (username) { this.user.username = username; }
    if (first_name) { this.user.first_name = first_name; }
    if (last_name) { this.user.last_name = last_name; }
    if (email) { this.user.email = email; }
  }


  private getCurrentUser(username: string): any {
    return this.httpClient.get<User>(this.API_URL + '/user/' + username, httpValidateOptions);
  }

  private updateCookies(token: any): void {
    if (this.user && this.user.id) {
      this.cookieService.set('id', this.user.id.toString(), 7);
    }
    this.cookieService.set('access', token['access'], 7);
    this.cookieService.set('refresh', token['refresh'], 7);
  }

  // Refreshes the JWT token, to extend the time the user is logged in
  public refreshToken(): void {
    const refresh = this.cookieService.get('refresh');
    this.httpClient.post(this.API_URL + '/api-token-refresh/', { refresh: refresh }, httpOptions)
      .subscribe({
        next: (token: any) => {
          this.cookieService.set('access', token['access'], 7);
          this.cookieService.set('refresh', token['refresh'], 7);
          this.updateUser(this.user.username);
        },
        error: (err: any) => {
          this.errors = err['error'];
          console.log(this.errors);
        }
      });
  }

  public tokenAvailable(): boolean {
    return !!this.cookieService.get('access');
  }

  public logout(): void {
    this.cookieService.delete('access')
    this.cookieService.delete('refresh')
    this.cookieService.delete('id');
    this.cookieService.delete('username');
    localStorage.removeItem('first_name');
    localStorage.removeItem('last_name');
    localStorage.removeItem('email');    
    this.sessionActive = new BehaviorSubject<boolean>(false);
  }

}