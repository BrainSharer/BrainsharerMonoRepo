import { Component, OnInit } from '@angular/core';
import { User } from '../../_models/user';
import { AuthService } from '../../_services/auth.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent {

    
    constructor(public authService: AuthService) {}


}
