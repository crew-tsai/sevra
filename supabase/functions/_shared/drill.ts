// Is this asset part of a rehearsal?
//
// The single question both outbound paths must ask before they act, and the
// one guard whose failure is unrecoverable: a drill that posts to a real X
// account, or mails a real stakeholder list, has stopped being a drill and
// become the crisis.
//
// It lives here, in one function, for two reasons. Two copies of a safety
// check drift, and the copy that drifts is discovered by the thing it was
// meant to prevent. And a check spelled out inline in two edge functions can
// only be verified by calling those functions as an authenticated person,
// which is exactly the kind of test that never gets written.

/**
 * True when this asset belongs to a drill.
 *
 * Fails CLOSED. If the asset cannot be read — a deleted row, a database
 * hiccup, a caller passing something that is not an id — the answer is "treat
 * it as a drill", because refusing to publish something real is a recoverable
 * mistake and publishing something that should not exist is not.
 *
 * A null id means the caller is not publishing an asset at all (an ad-hoc
 * post), and there is nothing to be a drill.
 */
// deno-lint-ignore no-explicit-any
export async function isDrillAsset(admin: any, assetId: string | null | undefined): Promise<boolean> {
  if (!assetId) return false;
  try {
    const { data, error } = await admin
      .from("incident_assets")
      .select("is_drill")
      .eq("id", assetId)
      .maybeSingle();
    if (error) {
      console.error("isDrillAsset: could not read the asset, refusing to send", error.message);
      return true;
    }
    if (!data) {
      console.error("isDrillAsset: no such asset, refusing to send", assetId);
      return true;
    }
    return !!data.is_drill;
  } catch (e) {
    console.error("isDrillAsset: threw, refusing to send", e);
    return true;
  }
}
