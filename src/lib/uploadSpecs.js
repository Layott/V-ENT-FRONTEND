// What we ask people to upload, in one place.
//
// Before this, every upload told a different story: 256x256 here, 1256x256
// there, 1200x400 on the newest page, 5MB in one validator and 10MB in the next,
// and several spots said nothing at all so people guessed and uploaded a phone
// photo for a crest.
//
// The numbers lean generous on purpose. A 256px avatar is drawn at 512 physical
// pixels on any modern screen, and art is never drawn above its own resolution
// without going soft, so we ask for the size that still looks sharp rather than
// the smallest that technically fits.

/** Every kind of image the platform accepts, with what to ask for. */
export const UPLOAD_SPECS = {
  avatar: {
    width: 512,
    height: 512,
    maxMB: 5,
    shape: 'square'
  },
  logo: {
    width: 512,
    height: 512,
    maxMB: 5,
    shape: 'square'
  },
  banner: {
    width: 1600,
    height: 400,
    maxMB: 5,
    shape: 'wide'
  },
  sponsorLogo: {
    width: 400,
    height: 200,
    maxMB: 2,
    shape: 'wide'
  },
  gallery: {
    width: 2000,
    height: 2000,
    maxMB: 5,
    shape: 'any'
  },
  // A document or a screenshot: what matters is that it can be read, not that
  // it matches a ratio, so no dimension is suggested.
  document: {
    maxMB: 5,
    shape: 'any'
  }
};

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

/** The sentence shown under an upload control.
 *
 *  Written as plain guidance rather than a rule, because these are suggestions:
 *  a smaller file still uploads, it just may not look as sharp.
 */
export function uploadHint(tt, kind) {
  const spec = UPLOAD_SPECS[kind] || UPLOAD_SPECS.document;
  if (!spec.width) {
    return tt('upload.hintSizeOnly', 'PNG, JPG or WebP, up to {mb} MB.').replace('{mb}', spec.maxMB);
  }
  return tt('upload.hintFull', 'PNG, JPG or WebP. {w} by {h} pixels works best, up to {mb} MB.').replace('{w}', spec.width).replace('{h}', spec.height).replace('{mb}', spec.maxMB);
}

/** Check a chosen file before it is ever sent.
 *
 *  Returns null when the file is fine, or a sentence explaining what is wrong.
 *  Refusing here means somebody learns the file is too big before they have
 *  filled in the rest of the form and pressed Save.
 */
export function checkImageFile(tt, kind, file) {
  const spec = UPLOAD_SPECS[kind] || UPLOAD_SPECS.document;
  if (!file) return null;

  const allowed = ACCEPTED_IMAGE_TYPES.split(',');
  if (file.type && !allowed.includes(file.type)) {
    return tt('upload.errType', 'That file is not an image we can use. Choose a PNG, JPG or WebP.');
  }

  if (file.size > spec.maxMB * 1024 * 1024) {
    const actual = (file.size / (1024 * 1024)).toFixed(1);
    return tt('upload.errTooBig', 'That image is {actual} MB. The limit is {mb} MB.').replace('{actual}', actual).replace('{mb}', spec.maxMB);
  }

  return null;
}

export default { UPLOAD_SPECS, ACCEPTED_IMAGE_TYPES, uploadHint, checkImageFile };
