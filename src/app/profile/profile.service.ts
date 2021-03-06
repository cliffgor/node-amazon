import { Injectable } from '@angular/core';
import { Headers, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { AuthHttp } from 'angular2-jwt';
import { map } from 'rxjs/operators';

@Injectable()
export class ProfileService {

    constructor(
        private authHttp: AuthHttp
    ) { }

    getUserProfile(): Observable<any> {
        return this.authHttp.get(`/api/user/settings`)
            .pipe(
                map((res: Response) => res.json())
            );
    }

    updateUserProfile(userObj): Observable<any> {
        const userInfo = JSON.stringify(userObj);
        const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
        return this.authHttp.post(`/api/user/update`, userInfo, { headers })
            .pipe(
                map((res: Response) => res.status)
            );
    }
}
