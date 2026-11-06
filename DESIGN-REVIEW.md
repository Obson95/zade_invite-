# Birthday invitation update

The original archive was extracted to `zade-invite`. The design follows the supplied `Zade_1_inspo .PNG`: royal blue, gold, clouds, balloons, a crown, and family portraits. The reference image itself is not shipped as a website asset.

## Changes

- Responsive two-column desktop hero and stacked mobile invitation.
- Gold-framed family photo and gently floating circular portrait of Zade.
- Large crowned first-birthday heading, ribbon, invitation copy, and RSVP/details links.
- Drifting confetti and clouds, floating balloons, sparkles, entrance animation, and existing section reveals.
- Pause control for continuous hero animations; reduced-motion preference respected.
- Wider event details layout and photo gallery with keepsake-style framing.
- Removed the development-only configuration banner from the guest-facing layout.

## Review findings and verification

Event date, time, timezone, venue/address, RSVP deadline, and guest limit are unset in `src/config/event.ts`. The site retains its coming-soon labels. The sample date and venue on the inspiration were not assumed to be real party details.

Apps Script, Netlify functions, and submission logic are unchanged. Live RSVP submissions require their existing backend configuration. For the existing non-submitting form preview use `?invite=preview`.

Local image references, anchor targets, CSS brace balance, and preservation of backend files were checked. Full type checking, production build, tests, and browser QA remain unverified: the local environment runs Node 16.20.2 and npm installation failed with ENOTFOUND for registry.npmjs.org. Build and test attempts therefore could not find tsc or vitest.

## Next steps for Netlify

Use Node 22.12 or newer (Node 22 is configured in netlify.toml). From this folder run:

```sh
npm ci
npm run build
npm test
npm run dev
```

Review desktop and phone widths, photo crops, RSVP navigation, pause/play, reduced motion, and form preview in the browser. The existing Netlify configuration uses `npm run build`, publishes `dist`, and bundles `netlify/functions`. Deploy through that configuration when ready, then configure and verify Apps Script submissions in the next stage. No deployment has been performed.
