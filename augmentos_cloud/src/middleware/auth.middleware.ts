// backend/src/middleware/auth.middleware.ts

import { NextFunction, Response } from 'express';
import * as UserService from '../services/user.service';
// import * as GooglePhotosService from '../services/google-photos.service';
import { RequestI } from '../types/request';

export async function userAuth(req: RequestI, res: Response, next: NextFunction): Promise<void> {
  try {
    const jwt = req.cookies['user'];
    if (!jwt) throw 'Unauthorized';

    let user;
    try {
      user = await UserService.getUserFromJwt(jwt);
    } catch (e) {
      // console.error(e);
    }
    if (!user) throw 'Unauthorized';

    // Check if the access token has expired
    // const now = new Date().getTime();
    // const expiresAt = new Date(user.expiresAt!).getTime();

    // if (expiresAt && expiresAt < now) {
    // user = await GooglePhotosService.refreshAccessToken(user);
    // }

    req.user = user;
    next();
  } catch (e) {
    console.error(e);
    res.status(401).send(e).end();
  }
}

