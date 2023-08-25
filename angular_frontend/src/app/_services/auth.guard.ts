import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

import { AuthService } from './auth.service';
import { NotificationService } from 'src/app/_services/notification';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class AuthGuard implements CanActivate {

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
    const refresh = this.cookieService.get('refresh');
    if (refresh) {
      this.authService.refreshToken();
    }
    const access = this.cookieService.get('access');
    if (access) {
      status = true;
    } else {
      // not logged in so display warning message
      this.notificationService.showError('Error', 'You do not have access to that page.');
      status = false;
    }
    return status;
  }

}
