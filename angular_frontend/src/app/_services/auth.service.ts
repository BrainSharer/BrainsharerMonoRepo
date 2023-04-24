import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

import { NotificationService } from './notification';
import { environment } from '../../environments/environment';
import { User } from '../_models/user';

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
    private router: Router,
    private httpClient: HttpClient,
    private notificationService: NotificationService) {
    this.authStatusListener();
  }

  private authStatusListener(): void {
    const access = this.cookieService.get('access');
    if (this.user.id === 0) {
      const user_id = this.cookieService.get('id');
      const username = this.cookieService.get('username');
      const first_name = this.cookieService.get('first_name');
      const last_name = this.cookieService.get('last_name');
      const email = this.cookieService.get('email');
      if (user_id) {
        this.user = {'id': +user_id, 'username': username, 'first_name': first_name, 'last_name': last_name, 'email': email, 'password':'', 'password2': ''};
      }       
      if (access) {
        this.sessionActive = new BehaviorSubject<boolean>(true);
      }       
    } 
  }

    /**
     * This is the method to use to login into the local Django DB.
     * The Django REST uses simplejwt for token stuff. The token gets sent
     * to use in the response data['access'] 
     * See: https://django-rest-framework-simplejwt.readthedocs.io/en/latest/getting_started.html
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
          this.updateData(data);
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
          this.cookieService.set('id', this.user.id.toString());
          this.cookieService.set('username', this.user.username);
          this.cookieService.set('first_name', this.user.first_name);
          this.cookieService.set('last_name', this.user.last_name);
          this.cookieService.set('email', this.user.email);
        },
        error: (msg: Error) => {
          this.notificationService.showError(msg.message, 'Error fetching user.');
        }
      });
  }

  private getCurrentUser(username: string): any {
    return this.httpClient.get<User>(this.API_URL + '/user/' + username);
  }

  private updateData(token: any): void {
    this.cookieService.set('access', token['access']);
    this.cookieService.set('refresh', token['refresh']);
  }

  // Refreshes the JWT token, to extend the time the user is logged in
  private refreshToken(): void {
    const refresh = this.cookieService.get('refresh');
    this.httpClient.post(this.API_URL + '/api-token-refresh/', { refresh: refresh }, httpOptions)
      .subscribe({
        next: (token: any) => {
          this.cookieService.set('access', token['access']);
        },
        error: (err: any) => {
          this.errors = err['error'];
        }
      });
  }

  public tokenAvailable(): boolean {
    return !!this.cookieService.get('access');
  }


  public logout(): void {
    this.cookieService.delete('id')
    this.cookieService.delete('username')
    this.cookieService.delete('access')
    this.cookieService.delete('refresh')
    this.sessionActive = new BehaviorSubject<boolean>(false);
    this.notificationService.showWarning('You have been logged out', 'Success');
    this.router.navigate(['/']);
  }


  /*
  public getExpiration() {
    return moment(this.token_expires);
  }

  public get isTokenActive() {
    return moment().isBefore(this.getExpiration());
  }

  public userAvailableXXXXXXXXXXX(): Observable<boolean> {
    let data = this.cookieService.get('user');
    data = data.replace(/\\054/g, ',');
    this.user = JSON.parse(data);
    if (this.user.id > 0) {
      this.sessionActive.next(true);
      sessionStorage.setItem('user', JSON.stringify(data));
    }
    return this.sessionActive;
  }

  public getDjangoUser(): any {
    return this.httpClient.get<User>(this.API_URL + '/session');
  }

  public getSessionUser(): User | null {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    return user;
  }

  public checkLoginStatus(): Observable<boolean> {
    if (this.user.id === 0) {
      console.log('checkLoginStatus: user is NOT defined, fetching from cookie');
      let data = this.cookieService.get('user');
      if (data) {
        data = data.replace(/\\054/g, ',');
        this.user = JSON.parse(data);
        console.log('checkLoginStatus:this.user=' + this.user);
        sessionStorage.setItem('user', JSON.stringify(this.user));
        this.sessionActive = new BehaviorSubject<boolean>(true);
      } else {
        console.log('checkLoginStatus:No cookie')
      }
    }
    return this.sessionActive.asObservable();
  }

  */


}