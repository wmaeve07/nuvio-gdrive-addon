const CONFIG = {
    addonName: "GDrive Direct",
    resolutions: ["2160p", "1080p", "720p", "480p", "Unknown"],
    qualities: ["BluRay REMUX", "BluRay", "WEB-DL", "WEBRip", "HDRip", "HDTV", "CAM", "Unknown"],
    visualTags: ["HDR10+", "HDR10", "HDR", "DV", "IMAX"],
    sortBy: ["resolution", "visualTag", "size", "quality"],
    showAudioFiles: false,
    considerHdrTagsAsEqual: true,
    prioritiseLanguage: null,
    proxiedPlayback: true,
    strictTitleCheck: false,
    maxFilesToFetch: 1000,
    driveFolderIds: [],
};

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
};

const API = {
    DRIVE_FILES: "https://content.googleapis.com/drive/v3/files",
    DRIVE_FILE: "https://content.googleapis.com/drive/v3/files/{fileId}",
    DRIVE_STREAM: "https://www.googleapis.com/drive/v3/files/{fileId}?alt=media&ack_abort=1",
    DRIVE_TOKEN: "https://oauth2.googleapis.com/token",
    CINEMETA: "https://v3-cinemeta.strem.io/meta/{type}/{id}.json",
};

const REGEX = {
    stream: /\/stream\/(movie|series)\/([a-zA-Z0-9%:\-_]+)\.json/,
    catalog: /\/catalog\/(movie|series)\/([a-zA-Z0-9%:\-_]+)(\/search=(.+))?\.json/,
    meta: /\/meta\/(movie|series)\/([a-zA-Z0-9%:\-_]+)\.json/,
    playback: /\/playback\/([a-zA-Z0-9%:\-_]+)\/(.+)/,
    resolutions: {
        "2160p": /(?<![^ [(_\-.])(4k|2160p|uhd)(?=[ \)\]_.-]|$)/i,
        "1080p": /(?<![^ [(_\-.])(1080p|fhd)(?=[ \)\]_.-]|$)/i,
        "720p": /(?<![^ [(_\-.])(720p|hd)(?=[ \)\]_.-]|$)/i,
        "480p": /(?<![^ [(_\-.])(480p|sd)(?=[ \)\]_.-]|$)/i,
    },
    qualities: {
        "BluRay REMUX": /(?<![^ [(_\-.])((blu[ .\-_]?ray|bd|br|b|uhd)[ .\-_]?remux)(?=[ \)\]_.-]|$)/i,
        "BluRay": /(?<![^ [(_\-.])(blu[ .\-_]?ray|((bd|br|b|uhd)[ .\-_]?(rip|r)?))(?![ .\-_]?remux)(?=[ \)\]_.-]|$)/i,
        "WEB-DL": /(?<![^ [(_\-.])(web[ .\-_]?(dl)?)(?![ .\-_]?DLRip)(?=[ \)\]_.-]|$)/i,
        "WEBRip": /(?<![^ [(_\-.])(web[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        "HDRip": /(?<![^ [(_\-.])(hd[ .\-_]?rip|web[ .\-_]?dl[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
        "HDTV": /(?<![^ [(_\-.])((hd|pd)tv|tv[ .\-_]?rip|hdtv[ .\-_]?rip|dsr(ip)?|sat[ .\-_]?rip)(?=[ \)\]_.-]|$)/i,
    },
    visualTags: {
        "HDR10+": /(?<![^ [(_\-.])(hdr[ .\-_]?(10|ten)[ .\-_]?([+]|plus))(?=[ \)\]_.-]|$)/i,
        "HDR10": /(?<![^ [(_\-.])(hdr10)(?=[ \)\]_.-]|$)/i,
        "HDR": /(?<![^ [(_\-.])(hdr)(?=[ \)\]_.-]|$)/i,
        "DV": /(?<![^ [(_\-.])(dolby[ .\-_]?vision|dv)(?=[ \)\]_.-]|$)/i,
    }
};

function formatSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1000;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function parseFile(file) {
    let resolution = Object.entries(REGEX.resolutions).find(([_, p]) => p.test(file.name))?.[0] || "Unknown";
    let quality = Object.entries(REGEX.qualities).find(([_, p]) => p.test(file.name))?.[0] || "Unknown";
    let visualTags = Object.entries(REGEX.visualTags).filter(([_, p]) => p.test(file.name)).map(([tag]) => tag);
    
    if (visualTags.includes("HDR10+")) visualTags = visualTags.filter(t => t !== "HDR" && t !== "HDR10");
    else if (visualTags.includes("HDR10")) visualTags = visualTags.filter(t => t !== "HDR");

    return {
        id: file.id,
        name: file.name.trim(),
        size: file.size,
        formattedSize: formatSize(parseInt(file.size)),
        resolution,
        quality,
        visualTags,
        type: file.mimeType,
    };
}

async function getAccessToken(env) {
    const params = new URLSearchParams({
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        refresh_token: env.REFRESH_TOKEN,
        grant_type: "refresh_token",
    });
    const res = await fetch(API.DRIVE_TOKEN, {
        method: "POST",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error("Failed to get access token: " + await res.text());
    const data = await res.json();
    return data.access_token;
}

async function fetchFile(fileId, env) {
    const accessToken = await getAccessToken(env);
    const url = new URL(API.DRIVE_FILE.replace("{fileId}", fileId));
    url.searchParams.set("fields", "id,name,size,videoMediaMetadata,mimeType,fileExtension,thumbnailLink,createdTime");
    
    const res = await fetch(url.toString(), { 
        headers: { 
            Authorization: `Bearer ${accessToken}`,
            "supportsAllDrives": "true"
        } 
    });
    if (!res.ok) throw new Error("Failed to fetch file: " + await res.text());
    return await res.json();
}

async function fetchFiles(query, env) {
    const accessToken = await getAccessToken(env);
    const url = new URL(API.DRIVE_FILES);
    url.searchParams.set("q", query);
    url.searchParams.set("corpora", "allDrives");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("fields", "files(id,name,size,videoMediaMetadata,mimeType,fileExtension,thumbnailLink,createdTime)");

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error("Failed to fetch files: " + await res.text());
    return { files: (await res.json()).files || [], accessToken };
}

function buildQuery(searchTerm) {
    let q = `trashed=false and mimeType contains 'video/' and not name contains 'trailer' and not name contains 'sample'`;
    
    if (CONFIG.driveFolderIds.length > 0) {
        q += ` and (${CONFIG.driveFolderIds.map(id => `'${id}' in parents`).join(' or ')})`;
    }
    
    if (searchTerm) {
        const cleanTerm = searchTerm.replace(/'/g, "\\'").replace(/\s+/g, " ");
        q += ` and (name contains '${cleanTerm}' or fullText contains '${cleanTerm}')`;
    }
    
    return q;
}

function buildStreamQuery(streamRequest) {
    const { name, year } = streamRequest.metadata;
    let q = `trashed=false and mimeType contains 'video/' and not name contains 'trailer' and not name contains 'sample'`;
    
    if (CONFIG.driveFolderIds.length > 0) {
        q += ` and (${CONFIG.driveFolderIds.map(id => `'${id}' in parents`).join(' or ')})`;
    }

    const sanitisedName = name.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    
    if (streamRequest.type === "movie") {
        q += ` and (name contains '${sanitisedName}'`;
        if (year) q += ` or name contains '${sanitisedName} ${year}'`;
        q += `)`;
    } else {
        q += ` and (name contains '${sanitisedName}' or name contains '${sanitisedName.replace(/\s/g, "")}')`;
        
        if (streamRequest.season && streamRequest.episode) {
            const s = String(streamRequest.season).padStart(2, '0');
            const e = String(streamRequest.episode).padStart(2, '0');
            const s_single = String(streamRequest.season);
            const e_single = String(streamRequest.episode);
            
            const episodePatterns = [
                `s${s}e${e}`,
                `s${s_single}e${e_single}`,
                `${s_single}x${e_single}`,
                `${s}x${e}`,
                `season ${s_single} episode ${e_single}`,
                `s${s} e${e}`,
                `${s_single}${e}`
            ];
            
            const episodeQuery = episodePatterns.map(p => `fullText contains '${p}'`).join(' or ');
            q += ` and (${episodeQuery})`;
        }
    }
    return q;
}

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const playbackUrl = url.origin + "/playback";

    if (url.pathname === "/manifest.json" || url.pathname === "/") {
        const manifest = {
            id: "stremio.gdrive.worker.v2",
            version: "1.0.0",
            name: CONFIG.addonName,
            description: "Stream your files directly from Google Drive!",
            catalogs: [
                { 
                    type: "movie", 
                    id: "gdrive_search", 
                    name: "GDrive Search", 
                    extra: [{ name: "search", isRequired: true }] 
                }
            ],
            resources: [
                { name: "stream", types: ["movie", "series"] }, 
                { name: "catalog", types: ["movie"] }, 
                { name: "meta", types: ["movie"] }
            ],
            types: ["movie", "series"],
        };
        return new Response(JSON.stringify(manifest), { headers: HEADERS });
    }

    const streamMatch = REGEX.stream.exec(url.pathname);
    const catalogMatch = REGEX.catalog.exec(url.pathname);
    const metaMatch = REGEX.meta.exec(url.pathname);
    const playbackMatch = REGEX.playback.exec(url.pathname);

    if (!streamMatch && !catalogMatch && !metaMatch && !playbackMatch) {
        return new Response("Not Found", { status: 404, headers: HEADERS });
    }

    try {
        if (playbackMatch) {
            const fileId = playbackMatch[1];
            const filename = decodeURIComponent(playbackMatch[2]);
            const accessToken = await getAccessToken(env);
            const streamUrl = API.DRIVE_STREAM.replace("{fileId}", fileId).replace("{filename}", filename);
            
            // Get the range header from the client
            const range = request.headers.get("Range") || "bytes=0-";
            
            // Fetch from Google Drive with proper headers for video streaming
            const driveHeaders = {
                Authorization: `Bearer ${accessToken}`,
                Range: range,
                "Accept-Encoding": "identity", // Don't allow compression of video data
            };
            
            const driveResponse = await fetch(streamUrl, { headers: driveHeaders });
            
            if (!driveResponse.ok) {
                throw new Error(`Drive error: ${driveResponse.status} ${driveResponse.statusText}`);
            }
            
            // Get content info from Drive
            const contentRange = driveResponse.headers.get("Content-Range");
            const contentLength = driveResponse.headers.get("Content-Length");
            const contentType = driveResponse.headers.get("Content-Type") || "video/*";
            
            // Create response with proper video streaming headers
            const responseHeaders = {
                "Content-Range": contentRange || "",
                "Content-Length": contentLength || "",
                "Content-Type": contentType,
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Range, Content-Length",
            };
            
            // Return the stream with proper headers
            return new Response(driveResponse.body, {
                status: driveResponse.status,
                statusText: driveResponse.statusText,
                headers: responseHeaders
            });
        }

        if (metaMatch) {
            const type = metaMatch[1];
            const fullId = decodeURIComponent(metaMatch[2]);
            
            let fileId;
            if (fullId.startsWith("gdrive:")) {
                fileId = fullId.replace("gdrive:", "");
            } else {
                fileId = fullId;
            }
            
            const file = await fetchFile(fileId, env);
            
            if (!file) {
                return new Response(JSON.stringify({ meta: null }), { headers: HEADERS });
            }
            
            const parsed = parseFile(file);
            
            const meta = {
                id: `gdrive:${file.id}`,
                name: parsed.name,
                type: "movie",
                posterShape: "landscape",
                poster: file.thumbnailLink || "",
                background: file.thumbnailLink || "",
                description: `Size: ${parsed.formattedSize}\nQuality: ${parsed.quality}\nResolution: ${parsed.resolution}`,
                released: file.createdTime ? new Date(file.createdTime).toISOString() : undefined,
            };
            
            return new Response(JSON.stringify({ meta }), { headers: HEADERS });
        }

        if (catalogMatch) {
            const type = catalogMatch[1];
            const catalogId = catalogMatch[2];
            const searchTerm = catalogMatch[4] ? decodeURIComponent(catalogMatch[4]) : "";
            
            if (catalogId === "gdrive_search") {
                if (!searchTerm) {
                    return new Response(JSON.stringify({ metas: [] }), { headers: HEADERS });
                }
                
                const query = buildQuery(searchTerm);
                const { files } = await fetchFiles(query, env);
                
                const metas = files.map(f => ({
                    id: `gdrive:${f.id}`,
                    name: f.name,
                    type: "movie",
                    posterShape: "landscape",
                    poster: f.thumbnailLink || "",
                    background: f.thumbnailLink || "",
                    description: `Size: ${formatSize(parseInt(f.size))}`,
                }));
                
                return new Response(JSON.stringify({ metas }), { headers: HEADERS });
            }
            
            return new Response(JSON.stringify({ metas: [] }), { headers: HEADERS });
        }

        if (streamMatch) {
            const type = streamMatch[1];
            const fullId = decodeURIComponent(streamMatch[2]);
            
            if (fullId.startsWith("gdrive:")) {
                const fileId = fullId.replace("gdrive:", "");
                const accessToken = await getAccessToken(env);
                const file = await fetchFile(fileId, env);
                
                if (!file) {
                    return new Response(JSON.stringify({ streams: [] }), { headers: HEADERS });
                }
                
                const parsed = parseFile(file);
                const desc = ` ${parsed.quality} | 📺 ${parsed.visualTags.join(", ") || "SD"} |  ${parsed.formattedSize}\n📄 ${parsed.name}`;
                
                const stream = {
                    name: `[⚡] ${CONFIG.addonName} ${parsed.resolution}`,
                    description: desc,
                    url: CONFIG.proxiedPlayback ? 
                        `${playbackUrl}/${parsed.id}/${encodeURIComponent(parsed.name)}` :
                        API.DRIVE_STREAM.replace("{fileId}", parsed.id).replace("{filename}", parsed.name),
                    behaviorHints: { 
                        videoSize: parseInt(parsed.size) || 0, 
                        filename: parsed.name 
                    }
                };
                
                if (!CONFIG.proxiedPlayback) {
                    stream.behaviorHints.proxyHeaders = { 
                        request: { Authorization: `Bearer ${accessToken}` } 
                    };
                    stream.behaviorHints.notWebReady = true;
                }
                
                return new Response(JSON.stringify({ streams: [stream] }), { headers: HEADERS });
            }
            
            let season, episode, cinemetaId;
            if (fullId.includes(":")) {
                const parts = fullId.split(":");
                if (parts[0] === "tmdb" || parts[0] === "kitsu") {
                    cinemetaId = parts[1];
                } else {
                    cinemetaId = parts[0];
                }
                season = parts.length >= 2 ? parseInt(parts[parts.length - 2]) : undefined;
                episode = parts.length >= 1 ? parseInt(parts[parts.length - 1]) : undefined;
            } else {
                cinemetaId = fullId;
            }

            const metaRes = await fetch(API.CINEMETA.replace("{type}", type).replace("{id}", cinemetaId));
            const metaData = await metaRes.json();
            
            if (!metaData || !metaData.meta) {
                return new Response(JSON.stringify({ streams: [] }), { headers: HEADERS });
            }

            const streamRequest = {
                type,
                metadata: { name: metaData.meta.name, year: metaData.meta.year },
                season,
                episode
            };

            const query = buildStreamQuery(streamRequest);
            const { files, accessToken } = await fetchFiles(query, env);

            const streams = files.map(file => {
                const parsed = parseFile(file);
                const desc = `🎥 ${parsed.quality} | 📺 ${parsed.visualTags.join(", ") || "SD"} | 📦 ${parsed.formattedSize}\n📄 ${parsed.name}`;
                
                return {
                    name: `[⚡] ${CONFIG.addonName} ${parsed.resolution}`,
                    description: desc,
                    url: CONFIG.proxiedPlayback ? 
                        `${playbackUrl}/${parsed.id}/${encodeURIComponent(parsed.name)}` :
                        API.DRIVE_STREAM.replace("{fileId}", parsed.id).replace("{filename}", parsed.name),
                    behaviorHints: { 
                        videoSize: parseInt(parsed.size) || 0, 
                        filename: parsed.name 
                    }
                };
            });

            return new Response(JSON.stringify({ streams }), { headers: HEADERS });
        }
    } catch (error) {
        console.error("Worker Error:", error);
        return new Response(JSON.stringify({ streams: [{ name: "Error", description: error.message }] }), { 
            status: 500, 
            headers: HEADERS 
        });
    }
}

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env);
    }
};
