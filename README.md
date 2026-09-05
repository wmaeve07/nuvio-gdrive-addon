# Nuvio GDrive Cloudflare Worker Addon

A high-performance Nuvio addon that streams video files directly from your Google Drive (including Shared Drives and Shared with Me files). 

This addon is designed to be deployed as a **Cloudflare Worker**, meaning it runs 24/7 in the cloud, requires no local server, and handles authentication headers automatically so it works flawlessly on Nuvio without buffering.

## Features
- **Zero Buffering:** Proxied playback through Cloudflare ensures smooth streaming.
- **Universal Compatibility:** Works perfectly on Nuvio, Stremio, and external players.
- **Wide Search:** Finds files regardless of folder structure. Supports standard naming conventions (e.g., `Movie.Name.2023.1080p.mkv` or `Show.Name.S01E01.mkv`).
- **Shared Drives:** Automatically scans your personal Drive, Shared Drives, and files shared with you.
- **Secure:** Your Google credentials are stored securely as encrypted Environment Variables in Cloudflare.

## Prerequisites
Before deploying, you need to generate your own Google Cloud credentials. This is required to allow the addon to access your specific Google Drive.

### Step 1: Get Google Cloud Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project**.
3. Go to **APIs & Services > Library**, search for **Google Drive API**, and click **Enable**.
4. Go to **APIs & Services > Credentials**.
5. Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**
   - Name: `Nuvio GDrive`
   - Under **Authorized redirect URIs**, click **Add URI** and paste: `https://developers.google.com/oauthplayground`
   - Click **Create**.
6. Copy your **Client ID** and **Client Secret** and save them somewhere safe.

### Step 2: Get your Refresh Token
1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **Gear icon (⚙️)** in the top right.
3. Check **"Use your own OAuth credentials"** and paste your Client ID and Client Secret. Close settings.
4. On the left, expand **Drive API v3** and check `https://www.googleapis.com/auth/drive.readonly`.
5. Click **Authorize APIs**, select your Google account, and allow access.
6. Click **Exchange authorization code for tokens**.
7. Copy the **Refresh token**.

## Deployment (Cloudflare Workers)

1. Go to [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers) and log in (free account).
2. Click **Create Application > Create Worker**. Name it `nuvio-gdrive` and click **Deploy**.
3. Click **Edit Code**.
4. Delete the default code, and paste the contents of `index.js` from this repository.
5. Click **Save and Deploy**.
6. Go to the **Settings** tab (top right), then click **Variables** on the left sidebar.
7. Under **Environment Variables**, add the following three variables (click "Encrypt" for each):
   - `CLIENT_ID`: *(Your Google Client ID)*
   - `CLIENT_SECRET`: *(Your Google Client Secret)*
   - `REFRESH_TOKEN`: *(Your Google Refresh Token)*
8. Click **Save** and then go back to **Edit Code** and click **Deploy** one last time.

## Installation in Nuvio

1. Copy your Worker URL. It will look like this: `https://nuvio-gdrive.YOUR_NAME.workers.dev`
2. Open Nuvio.
3. Paste the following URL into the addon search/install bar:
       https://nuvio-gdrive.YOUR_NAME.workers.dev/manifest.json
   *(Replace `YOUR_NAME` with your actual Cloudflare subdomain)*
4. Click **Install**. You will now see a "Nuvio GDrive Search" catalog in your addons!

## Configuration (Optional)
If you want to change how the addon behaves (e.g., change the addon name, filter specific resolutions, or restrict searches to specific folder IDs), open the `index.js` file and modify the `CONFIG` object at the very top of the code, then redeploy your Worker.

