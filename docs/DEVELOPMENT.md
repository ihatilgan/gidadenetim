# Development Notes

This project is currently deployed as static GitHub Pages files.

## App Source

- Edit `src/app.source.html` for application code changes.
- Run `node scripts/pack-app.js` to rebuild `app.html`.
- `app.html` still contains the original bundler wrapper and embedded third-party assets.

The current setup intentionally preserves runtime behavior while making the app source easier to inspect and edit.

Sensitive business records should not be embedded in the public HTML bundle. The app now relies on device cache plus authenticated Firestore reads from `isletmeler_master` instead of a bundled business-data seed. The next cleanup step is to split `src/app.source.html` into smaller modules.
