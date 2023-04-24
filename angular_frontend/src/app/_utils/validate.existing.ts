import { AbstractControl,  AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../_services/data.service';

export function existingUsernameValidator(userService: DataService): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> => {
      return userService.findByUsername(control.value).pipe(map(
        (data) => {
            console.log("The result is : " + data.count)
          return (data.count > 0) ? { "existing": true } : null;
        }
      ));
    };
  } 

  export function existingEmailValidator(userService: DataService): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> => {
      return userService.findByEmail(control.value).pipe(map(
        (data) => {
            console.log("The result is : " + data.count)
          return (data.count > 0) ? { "existing": true } : null;
        }
      ));
    };
  } 