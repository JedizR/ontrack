// Vercel wrapper. The handler is portable: a web standard Request in, Response out, with the live dependencies.
import { billing } from '../server/handlers/billing.js';

export const POST = (request: Request) => billing(request);
