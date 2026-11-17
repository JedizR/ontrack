// Vercel wrapper. The handler is portable: a web standard Request in, Response out, with the live dependencies.
import { coach } from '../server/handlers/coach.js';

export const POST = (request: Request) => coach(request);
