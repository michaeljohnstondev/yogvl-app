# QR Code Setup Instructions

## What Changed

The app now uses **one universal QR code** that works for both:
- Users who already have the app installed (opens directly)
- Users who don't have the app (redirects to download)

## How It Works

1. **QR Code URL**: `https://bigvibestudios.com/theyo/invite/BVS-12345`
2. **Web page tries to open app**: `the-yo://invite/BVS-12345`
3. **If app doesn't open**: Shows download button for App Store/Play Store

## Server Setup Required

You need to host the redirect page on your website at `https://bigvibestudios.com`

### Step 1: Upload the HTML File

Upload `web-redirect-template.html` to your web server at:
```
https://bigvibestudios.com/theyo/invite/index.html
```

### Step 2: Configure Server Routing

Configure your server so that ANY path under `/theyo/invite/*` serves the same HTML file.

**Examples:**
- `/theyo/invite/BVS-12345` → serves `index.html`
- `/theyo/invite/BVS-ABC99` → serves `index.html`
- `/theyo/u/userId123` → serves `index.html` (for user profiles)

#### Option A: Nginx Configuration

Add to your nginx config:
```nginx
location /theyo/invite/ {
    try_files $uri /theyo/invite/index.html;
}

location /theyo/u/ {
    try_files $uri /theyo/u/index.html;
}
```

#### Option B: Apache (.htaccess)

Create `.htaccess` in your `/theyo/` directory:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^invite/.*$ /theyo/invite/index.html [L]
RewriteRule ^u/.*$ /theyo/u/index.html [L]
```

#### Option C: Firebase Hosting (if using Firebase)

In `firebase.json`:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/theyo/invite/**",
        "destination": "/theyo/invite/index.html"
      },
      {
        "source": "/theyo/u/**",
        "destination": "/theyo/u/index.html"
      }
    ]
  }
}
```

### Step 3: Update App Store URLs

Edit the HTML file and replace the placeholder App Store URL:

```javascript
const appStoreURL = 'https://apps.apple.com/app/the-yo/YOUR_APP_ID';
```

Find your actual App Store URL and replace `YOUR_APP_ID`.

## Testing

### Test with App Installed:
1. Build and install the app on your test device
2. Generate a QR code for an event
3. Scan the QR code with your camera app
4. Should open directly in The Yo app

### Test without App Installed:
1. Delete the app from your test device (or use a device without the app)
2. Scan the same QR code
3. Should show a page with "Opening The Yo..."
4. After 2 seconds, should show "Download The Yo" button
5. Click button to go to App Store/Play Store

## Fallback Behavior

If you **don't set up the server redirect** yet:
- QR codes will open in the browser
- Users will see a blank page or 404 error
- You'll need to share events using the app's built-in share feature instead

## File Structure

```
/theyo/
  /invite/
    index.html    (copy of web-redirect-template.html)
  /u/
    index.html    (copy of web-redirect-template.html)
```

## Next Steps (Optional)

For a more professional setup, you can also configure:
- **Universal Links (iOS)**: Add `apple-app-site-association` file
- **App Links (Android)**: Add `assetlinks.json` file

These will make the links open the app INSTANTLY without any redirect page, but they require more complex server setup. The current solution works fine for most use cases.
