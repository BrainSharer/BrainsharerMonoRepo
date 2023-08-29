import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '../../environments/environment';
import { User } from '../_models/user';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public sessionActive = new BehaviorSubject<boolean>(this.idAvailable());
  public user: User = {id: 0, username: ''};
  API_URL = environment.API_URL;

  constructor(
    private cookieService: CookieService) {
    this.authStatusListener();
  }

  private authStatusListener(): void {
    const id = this.cookieService.get('id');
    const username = this.cookieService.get('username');
    if ((id) && (username)) {
      console.log('ID=' + id + ' username=' + username);
      this.sessionActive = new BehaviorSubject<boolean>(true);
      this.user.id = +id;
      this.user.username = username;
    } else {
      console.log('we are in auth listener with no id and/or username');
    }
  }

  public getFullname(): string {
    let fullname = 'NA';
    if (this.user.username) {
      fullname = this.user.username;
    }
    return fullname;
  }

  public idAvailable(): boolean {
    return !!this.cookieService.get('id');
  }

  public logout(): void {
    this.cookieService.delete('id');
    this.cookieService.delete('username');
    this.sessionActive = new BehaviorSubject<boolean>(false);
  }



}