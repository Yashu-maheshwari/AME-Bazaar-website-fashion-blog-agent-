<?php
/**
 * ==============================================================================
 * AME Bazaar AI Operating System - Hostinger Image Discovery Service
 * File: api/image-service.php
 * ==============================================================================
 * Standalone, authenticated proxy endpoint for Wikimedia Commons official API.
 * Discovers freely licensed commercial images (CC0, PD, CC-BY, CC-BY-SA)
 * without bootstrapping WordPress, without database connections, and without
 * temporary image storage on the Hostinger server.
 *
 * Requirements:
 * - PHP 8.0+
 * - cURL extension enabled
 * - JSON extension enabled
 * ==============================================================================
 */

// 1. Strict HTTP Method Guard
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    header('Allow: POST');
    echo json_encode([
        'success' => false,
        'error' => 'Method Not Allowed',
        'message' => 'Only POST requests are supported.'
    ]);
    exit;
}

// 2. Authentication: Timing-Safe Token Verification
$serverSecret = getenv('AME_IMAGE_SERVICE_SECRET');
if (empty($serverSecret) && defined('AME_IMAGE_SERVICE_SECRET')) {
    $serverSecret = AME_IMAGE_SERVICE_SECRET;
}
$configPath = dirname(__DIR__, 2) . '/image-service-config.php';
if (empty($serverSecret) && file_exists($configPath)) {
    @include_once $configPath;
    if (defined('AME_IMAGE_SERVICE_SECRET')) {
        $serverSecret = AME_IMAGE_SERVICE_SECRET;
    }
}

$clientToken = '';
if (!empty($_SERVER['HTTP_X_AME_IMAGE_TOKEN'])) {
    $clientToken = trim($_SERVER['HTTP_X_AME_IMAGE_TOKEN']);
} elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    if (preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
        $clientToken = trim($matches[1]);
    }
}

if (empty($serverSecret) || empty($clientToken) || !hash_equals((string)$serverSecret, (string)$clientToken)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'Invalid or missing image service authentication token.'
    ]);
    exit;
}

// 3. Rate Limiting: 30 requests / minute per client IP
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$rateLimitFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ame_img_rl_' . md5($clientIp) . '.json';
$now = time();
$window = 60; // 60 seconds
$maxRequests = 30;

$rlData = ['count' => 0, 'reset' => $now + $window];
if (file_exists($rateLimitFile)) {
    $content = @file_get_contents($rateLimitFile);
    if ($content) {
        $parsed = @json_decode($content, true);
        if (is_array($parsed) && isset($parsed['reset']) && $parsed['reset'] > $now) {
            $rlData = $parsed;
        }
    }
}

if ($rlData['count'] >= $maxRequests) {
    http_response_code(429);
    header('Content-Type: application/json; charset=utf-8');
    header('Retry-After: ' . ($rlData['reset'] - $now));
    echo json_encode([
        'success' => false,
        'error' => 'Too Many Requests',
        'message' => 'Rate limit exceeded (30 requests/min). Please try again shortly.',
        'retry_after' => $rlData['reset'] - $now
    ]);
    exit;
}

$rlData['count']++;
@file_put_contents($rateLimitFile, json_encode($rlData), LOCK_EX);

// 4. Request Payload Validation
$rawInput = file_get_contents('php://input');
$input = @json_decode($rawInput, true);

if (!is_array($input)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Bad Request',
        'message' => 'Malformed JSON request body.'
    ]);
    exit;
}

$queries = [];
if (!empty($input['queries']) && is_array($input['queries'])) {
    foreach ($input['queries'] as $q) {
        if (is_string($q) && trim($q) !== '') {
            $queries[] = trim($q);
        }
    }
} elseif (!empty($input['query']) && is_string($input['query'])) {
    if (trim($input['query']) !== '') {
        $queries[] = trim($input['query']);
    }
}

if (empty($queries)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Bad Request',
        'message' => 'Missing or empty search queries array.'
    ]);
    exit;
}

$limit = isset($input['limit']) ? (int)$input['limit'] : 10;
if ($limit < 1) $limit = 1;
if ($limit > 20) $limit = 20;

// 5. Licensing Rules Evaluator
/**
 * Evaluates Wikimedia Commons extmetadata for commercial license compliance.
 *
 * @param array $extmetadata
 * @return array{valid: bool, reason?: string, tier?: int, code?: string, name?: string, url?: string, commercialAllowed?: bool, attributionRequired?: bool, artist?: string}
 */
function evaluateWikimediaLicense(array $extmetadata): array {
    $licenseShort = strtolower(trim($extmetadata['LicenseShortName']['value'] ?? ''));
    $licenseLong = strtolower(trim($extmetadata['License']['value'] ?? ''));
    $usageTerms = strtolower(trim($extmetadata['UsageTerms']['value'] ?? ''));
    $licenseUrl = trim($extmetadata['LicenseUrl']['value'] ?? '');
    $artistRaw = trim($extmetadata['Artist']['value'] ?? '');
    $artist = trim(strip_tags($artistRaw));
    $attributionRequired = strtolower(trim($extmetadata['AttributionRequired']['value'] ?? 'false')) === 'true';

    $combinedLicense = $licenseShort . ' ' . $licenseLong . ' ' . $usageTerms;

    // 1. Strict Denylist Check
    // Any Non-Commercial restriction (e.g., CC-BY-NC, CC-BY-NC-SA)
    if (preg_match('/\b(nc|non-commercial|noncommercial)\b/i', $combinedLicense)) {
        return ['valid' => false, 'reason' => 'Non-commercial restriction is not permitted'];
    }
    // Any No-Derivatives restriction (e.g., CC-BY-ND, CC-BY-SA-ND)
    if (preg_match('/\b(nd|no-derivatives|noderivatives)\b/i', $combinedLicense)) {
        return ['valid' => false, 'reason' => 'No-derivatives restriction is not permitted'];
    }
    // Fair use, copyrighted, all rights reserved
    if (preg_match('/\b(fair\s*use|copyrighted|all\s*rights\s*reserved)\b/i', $combinedLicense)) {
        return ['valid' => false, 'reason' => 'Copyrighted or fair use image is not permitted'];
    }

    // 2. Allowlist Check & Tier Ranking
    // Tier 1: CC0 (Creative Commons Zero)
    if (preg_match('/\b(cc0|cc-zero|creative\s*commons\s*zero)\b/i', $combinedLicense)) {
        return [
            'valid' => true,
            'tier' => 1,
            'code' => 'cc0',
            'name' => 'CC0 1.0 Universal',
            'url' => !empty($licenseUrl) ? $licenseUrl : 'https://creativecommons.org/publicdomain/zero/1.0/',
            'commercialAllowed' => true,
            'attributionRequired' => false,
            'artist' => $artist ?: 'Unknown'
        ];
    }

    // Tier 2: Public Domain (PD)
    if (preg_match('/\b(pd|public\s*domain|pd-us|pd-art|pd-user|pd-self|pd-old|no\s*known\s*restrictions)\b/i', $combinedLicense)) {
        return [
            'valid' => true,
            'tier' => 2,
            'code' => 'public-domain',
            'name' => 'Public Domain',
            'url' => !empty($licenseUrl) ? $licenseUrl : 'https://creativecommons.org/publicdomain/mark/1.0/',
            'commercialAllowed' => true,
            'attributionRequired' => false,
            'artist' => $artist ?: 'Public Domain'
        ];
    }

    // Tier 3: CC-BY (all versions: 4.0, 3.0, 2.5, 2.0)
    // Matches CC-BY without SA
    if (preg_match('/\b(cc[-\s]?by)\b/i', $combinedLicense) && !preg_match('/\b(cc[-\s]?by[-\s]?sa)\b/i', $combinedLicense)) {
        if (empty($artist)) {
            return ['valid' => false, 'reason' => 'CC-BY license requires artist attribution but artist is missing'];
        }
        $version = '4.0';
        if (preg_match('/(4\.0|3\.0|2\.5|2\.0)/', $combinedLicense, $vm)) {
            $version = $vm[1];
        }
        return [
            'valid' => true,
            'tier' => 3,
            'code' => 'cc-by-' . $version,
            'name' => 'CC BY ' . $version,
            'url' => !empty($licenseUrl) ? $licenseUrl : 'https://creativecommons.org/licenses/by/' . $version . '/',
            'commercialAllowed' => true,
            'attributionRequired' => true,
            'artist' => $artist
        ];
    }

    // Tier 4: CC-BY-SA (all versions: 4.0, 3.0, 2.5, 2.0)
    if (preg_match('/\b(cc[-\s]?by[-\s]?sa)\b/i', $combinedLicense)) {
        if (empty($artist)) {
            return ['valid' => false, 'reason' => 'CC-BY-SA license requires artist attribution but artist is missing'];
        }
        $version = '4.0';
        if (preg_match('/(4\.0|3\.0|2\.5|2\.0)/', $combinedLicense, $vm)) {
            $version = $vm[1];
        }
        return [
            'valid' => true,
            'tier' => 4,
            'code' => 'cc-by-sa-' . $version,
            'name' => 'CC BY-SA ' . $version,
            'url' => !empty($licenseUrl) ? $licenseUrl : 'https://creativecommons.org/licenses/by-sa/' . $version . '/',
            'commercialAllowed' => true,
            'attributionRequired' => true,
            'artist' => $artist
        ];
    }

    return ['valid' => false, 'reason' => 'License is not in permitted commercial allowlist'];
}

// 6. Query Wikimedia Commons API for each query (max 3)
$collectedCandidates = [];
$seenPageIds = [];
$userAgent = 'AMEBazaarBot/1.0 (https://amebazaar.in; contact@amebazaar.in)';
$allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

$limitedQueries = array_slice($queries, 0, 3);

foreach ($limitedQueries as $query) {
    $searchParam = urlencode($query);
    $apiUrl = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch={$searchParam}&gsrlimit={$limit}&prop=imageinfo&iiprop=url|extmetadata|dimensions|mime&iiurlwidth=1024&format=json";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($response)) {
        continue;
    }

    $data = @json_decode($response, true);
    if (!isset($data['query']['pages']) || !is_array($data['query']['pages'])) {
        continue;
    }

    foreach ($data['query']['pages'] as $pageId => $page) {
        if (isset($seenPageIds[$pageId])) {
            continue;
        }

        if (empty($page['imageinfo'][0])) {
            continue;
        }

        $imageInfo = $page['imageinfo'][0];
        $mime = strtolower($imageInfo['mime'] ?? '');
        if (!in_array($mime, $allowedMimes, true)) {
            continue;
        }

        // Quality check: minimum 400px width/height
        $width = (int)($imageInfo['width'] ?? 0);
        $height = (int)($imageInfo['height'] ?? 0);
        if ($width < 400 && $height < 400) {
            continue;
        }

        $extmetadata = $imageInfo['extmetadata'] ?? [];
        $licenseEval = evaluateWikimediaLicense($extmetadata);
        if (!$licenseEval['valid']) {
            continue;
        }

        $seenPageIds[$pageId] = true;

        $fileTitle = $page['title'] ?? 'File:Image.jpg';
        $cleanTitle = trim(preg_replace('/^File:/i', '', $fileTitle));
        $cleanTitleWithoutExt = trim(preg_replace('/\.[a-zA-Z0-9]+$/', '', $cleanTitle));
        $cleanTitleReadable = str_replace('_', ' ', $cleanTitleWithoutExt);

        $descRaw = $extmetadata['ImageDescription']['value'] ?? '';
        $cleanDesc = trim(strip_tags($descRaw));
        if (empty($cleanDesc)) {
            $cleanDesc = $cleanTitleReadable;
        }

        // 1024px scaled regular preview URL
        $thumbUrl = $imageInfo['thumburl'] ?? $imageInfo['url'];
        $originalUrl = $imageInfo['url'] ?? $thumbUrl;

        $sourcePageUrl = 'https://commons.wikimedia.org/wiki/' . urlencode(str_replace(' ', '_', $fileTitle));

        $artist = $licenseEval['artist'];
        $licenseName = $licenseEval['name'];
        $licenseUrl = $licenseEval['url'];

        $creditHtml = '<a href="' . htmlspecialchars($sourcePageUrl, ENT_QUOTES, 'UTF-8') . '">Photo by ' . htmlspecialchars($artist, ENT_QUOTES, 'UTF-8') . '</a> via Wikimedia Commons (<a href="' . htmlspecialchars($licenseUrl, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($licenseName, ENT_QUOTES, 'UTF-8') . '</a>)';
        $creditText = "Photo by {$artist} via Wikimedia Commons ({$licenseName})";

        $attribution = [
            'artist' => $artist,
            'creditHtml' => $creditHtml,
            'creditText' => $creditText,
            'sourceUrl' => $sourcePageUrl,
            'licenseUrl' => $licenseUrl
        ];

        $candidate = [
            'id' => $fileTitle,
            'title' => $cleanTitleReadable,
            'description' => $cleanDesc,
            'alt_description' => $cleanDesc,
            'slug' => strtolower(preg_replace('/[^a-z0-9]+/i', '-', $cleanTitleReadable)),
            'urls' => [
                'regular' => $thumbUrl,
                'full' => $originalUrl,
                'raw' => $originalUrl
            ],
            'width' => $width,
            'height' => $height,
            'mime' => $mime,
            'source' => 'wikimedia_commons',
            'license' => [
                'name' => $licenseName,
                'code' => $licenseEval['code'],
                'tier' => $licenseEval['tier'],
                'url' => $licenseUrl,
                'commercialAllowed' => true,
                'attributionRequired' => $licenseEval['attributionRequired']
            ],
            'attribution' => $attribution,
            'user' => [
                'name' => $artist,
                'bio' => $artist
            ]
        ];

        $collectedCandidates[] = $candidate;
    }
}

// 7. Sort candidates by license tier preference (CC0: 1 -> PD: 2 -> CC-BY: 3 -> CC-BY-SA: 4)
usort($collectedCandidates, function ($a, $b) {
    $tierA = $a['license']['tier'] ?? 5;
    $tierB = $b['license']['tier'] ?? 5;
    return $tierA <=> $tierB;
});

// Slice to requested limit
$finalCandidates = array_slice($collectedCandidates, 0, $limit);

// 8. Output Response
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'source' => 'wikimedia_commons',
    'count' => count($finalCandidates),
    'candidates' => $finalCandidates
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
