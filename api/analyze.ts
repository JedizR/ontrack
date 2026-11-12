// Vercel wrapper. The handler is portable: a web standard Request in, Response out, with the live dependencies.
import { analyze } from '../server/handlers/analyze.js';

export const POST = (request: Request) => analyze(request);
