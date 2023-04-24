import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest,} from '@angular/common/http';
import { Observable } from 'rxjs';

import { VALIDATE } from 'src/app/_services/data.service';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class InterceptService implements HttpInterceptor {

  constructor(private cookieService: CookieService) { }


  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.headers.get(VALIDATE)) {
      console.log('Intercepting URL=' + request.url);
      request = request.clone({
        headers: request.headers.delete(VALIDATE)
      });
      let modifiedRequest = this.addAuthToken(request);
      return next.handle(modifiedRequest);
    }
    return next.handle(request);
  }


  addAuthToken(request: HttpRequest<any>) {
    let access = this.cookieService.get('access');
    if (!access) {
      return request;
    } 
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${access}`,
      },
    });
  }

}



