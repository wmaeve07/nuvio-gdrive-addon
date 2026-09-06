# 🚀 [Click Here for the 1-Click Easy Setup Wizard](https://wmaeve07.github.io/nuvio-gdrive-addon/setup.html)

*(Highly Recommended: The wizard automatically generates your custom code and guides you step-by-step!)*

---

# Nuvio GDrive Cloudflare Worker Addon

A high-performance addon that streams video files directly from your Google Drive (including Shared Drives and Shared with Me files). It runs 24/7 in the cloud, requires no local server, and handles authentication automatically for zero-buffering playback on Nuvio, Stremio, and external players.

## ✨ Features
- **Zero Buffering:** Proxied playback through Cloudflare ensures smooth streaming.
- **Universal Compatibility:** Works perfectly on Nuvio, Stremio (Desktop/Web), and external players.
- **Smart Search:** Finds files regardless of folder structure. Supports standard naming (e.g., `Movie.Name.2023.1080p.mkv` or `Show.Name.S01E01.mkv`).
- **Shared Drives:** Automatically scans your personal Drive, Shared Drives, and files shared with you.

## ❓ FAQ & Troubleshooting
<details>
<summary><strong>⚠️ I'm getting an "Access Blocked" or "invalid_client" error!</strong></summary>
You missed the <strong>Test User</strong> step. Google blocks all apps by default unless you explicitly add your Gmail address to the "Test Users" list in the Google Cloud Console. Please redo Step 1 in the Setup Wizard carefully.
</details>

<details>
<summary><strong>🎬 My files aren't showing up in the search!</strong></summary>
Ensure your files are named correctly. The addon looks for standard naming conventions:
- Movies: <code>Movie Name (2023).mkv</code> or <code>Movie.Name.2023.1080p.mp4</code>
- Series: <code>Show.Name.S01E01.mkv</code> or <code>Show.Name.1x01.mp4</code>
</details>

<details>
<summary><strong>🔄 How do I update the addon if I add new files?</strong></summary>
You don't need to do anything! The addon queries your Google Drive in real-time. New files will appear automatically within 15 minutes (due to caching).
</details>

---

<details>
<summary><strong>⚙️ Advanced: Manual Deployment Instructions (Click to Expand)</strong></summary>

If you prefer not to use the wizard, follow these steps:

1. Get your **Client ID**, **Client Secret**, and **Refresh Token** (ensure you added your email as a Test User in the OAuth Consent Screen!).
2. Go to [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers) and create a new Worker named `nuvio-gdrive`.
3. Click **Edit Code**, delete the default code, and paste the contents of [`index.js`](index.js) from this repository.
4. Go to **Settings > Variables**, and add these three Environment Variables (click "Encrypt" for each):
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `REFRESH_TOKEN`
5. Click **Save**, then **Deploy**.
6. Install in Nuvio using: `https://nuvio-gdrive.YOUR_SUBDOMAIN.workers.dev/manifest.json`
</details>

## License
MIT License. Feel free to fork, modify, and share.
