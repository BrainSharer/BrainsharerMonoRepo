import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { DataService } from '../../_services/data.service';
import { NotificationService } from '../../_services/notification';
import { existingUsernameValidator, existingEmailValidator } from '../../_utils/validate.existing';
import Validation from '../../_utils/validation';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    public captchaResolved : boolean = false;

    addForm: FormGroup = new FormGroup({
        username: new FormControl(null, {
            validators: [
              Validators.required,
              Validators.minLength(3),
              Validators.maxLength(20),
            ],
            asyncValidators: [existingUsernameValidator(this.dataService)],
            updateOn: 'change'
          }),
        first_name: new FormControl('', {
            validators: [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(20),
            ]}),
        last_name: new FormControl('', {
            validators: [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(60),
            ]}),
        email: new FormControl('', {
            validators: [
              Validators.required,
              Validators.email],
              asyncValidators: [existingEmailValidator(this.dataService)],
              updateOn: 'change'
            }),
        password: new FormControl('', {
            validators: [
              Validators.required,
              Validators.minLength(8),
              Validators.maxLength(40),
            ]}),
        password2: new FormControl('', {
            validators: [
              Validators.required,
              Validators.minLength(8),
              Validators.maxLength(40)
            ]})
    });

    submitted: boolean = false;

    checkCaptcha(captchaResponse : string) {
        this.captchaResolved = (captchaResponse && captchaResponse.length > 0) ? true : false
    }

    constructor(
        private router: Router,
        private dataService: DataService,
        private notificationService: NotificationService,
    ) { }

    ngOnInit() {        
        this.addForm.setValidators(Validation.match('password', 'password2'));
    }

    get f(): { [key: string]: AbstractControl } {
        return this.addForm.controls;
    }

    onReset(): void {
        this.submitted = false;
        this.addForm.reset();
    }

    register(): void {
        this.submitted = true;
        if (this.addForm.invalid) {
            return;
        }

        this.dataService.register({ userData: this.addForm.value })
            .subscribe({
                next: () => {
                    this.notificationService.showSuccess('Registration was successful','Success');
                    this.router.navigate(['/account/login']);
                },
                error: (msg) => {
                    this.notificationService.showError(msg.message,'Error');
                }
            });
    }
}
