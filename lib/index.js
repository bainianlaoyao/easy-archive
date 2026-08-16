/**
 * easy-archive — host half.
 *
 * A deliberately inert web-profile plugin row: its only job is to carry the
 * `dsh.client` declaration into the profile's loader graph so client-modules
 * serves the browser bundle at `/plugins/easy-archive/client.js`.
 */
export const name = "easy-archive";
export const inject = [];
/** No host-side behavior; the client half owns everything. */
export function apply() {}