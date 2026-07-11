import { handleAmfiNav } from '../../src/server/amfiNav'

// Cloudflare Pages Function entry point for task N2's edge handler — the
// "thin per-platform entry file" N2's own resolution note deferred to D1.
// Pages auto-routes this file to GET/OPTIONS /api/amfi-nav based on its path
// under functions/ (see https://developers.cloudflare.com/pages/functions/).
// handleAmfiNav is a plain Web-standard `(Request) => Promise<Response>`
// handler with no platform imports and already does its own method
// branching (GET/OPTIONS/reject), so this wrapper only needs to unwrap
// Pages' EventContext down to the one field it needs.
export const onRequest = ({ request }: { request: Request }): Promise<Response> => handleAmfiNav(request)
