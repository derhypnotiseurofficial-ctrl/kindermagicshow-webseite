<?php
/**
 * Magic Tim – Kontaktformular-Handler
 * Verarbeitet AJAX-Formularanfragen und sendet per SMTP
 * Kompatibel mit ALL-INKL.COM Hosting
 */

declare(strict_types=1);

// ─── Konfiguration (hier anpassen!) ─────────────────
const CONFIG = [
    // E-Mail-Empfänger (deine Buchungs-E-Mail)
    'to'           => 'info@kindermagicshow.de',
    'to_name'      => 'Magic Tim Buchungen',

    // Absender (muss eine E-Mail in deiner ALL-INKL-Domain sein)
    'from'         => 'noreply@kindermagicshow.de',
    'from_name'    => 'Kindermagicshow.de Kontaktformular',

    // SMTP-Zugangsdaten (ALL-INKL stellt diese im KAS bereit)
    'smtp_host'    => 'mail.kindermagicshow.de',
    'smtp_port'    => 587,
    'smtp_user'    => 'noreply@kindermagicshow.de',
    'smtp_pass'    => 'DEIN_SMTP_PASSWORT',  // Im KAS unter "E-Mail-Postfächer" setzen
    'smtp_secure'  => 'tls',

    // Erlaubte Herkunft (für CORS-Header)
    'allowed_origin' => 'https://kindermagicshow.de',

    // Rate-Limiting: max. Anfragen pro Stunde pro IP
    'rate_limit'   => 5,
];

// ─── Sicherheits-Header ──────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Nur AJAX-Anfragen erlauben
if (
    !isset($_SERVER['HTTP_X_REQUESTED_WITH']) ||
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest'
) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Unerlaubter Zugriff.']));
}

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Methode nicht erlaubt.']));
}

// ─── Honeypot-Check (Anti-Spam) ──────────────────────
if (!empty($_POST['website_url'])) {
    // Bot erkannt – stilles Ignorieren
    exit(json_encode(['success' => true, 'message' => 'Vielen Dank!']));
}

// ─── Rate-Limiting per Session ───────────────────────
session_start();
$now = time();
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

if (!isset($_SESSION['form_attempts'])) {
    $_SESSION['form_attempts'] = [];
}

// Alte Einträge bereinigen (älter als 1 Stunde)
$_SESSION['form_attempts'] = array_filter(
    $_SESSION['form_attempts'],
    fn($t) => ($now - $t) < 3600
);

if (count($_SESSION['form_attempts']) >= CONFIG['rate_limit']) {
    http_response_code(429);
    exit(json_encode([
        'success' => false,
        'message' => 'Zu viele Anfragen. Bitte warte eine Stunde oder schreib uns direkt per E-Mail.'
    ]));
}

$_SESSION['form_attempts'][] = $now;

// ─── Eingaben bereinigen ─────────────────────────────
function clean(string $str): string {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}

$firstName  = clean($_POST['firstName']  ?? '');
$lastName   = clean($_POST['lastName']   ?? '');
$email      = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone      = clean($_POST['phone']      ?? '');
$eventType  = clean($_POST['eventType']  ?? '');
$eventDate  = clean($_POST['eventDate']  ?? '');
$guestCount = clean($_POST['guestCount'] ?? '');
$location   = clean($_POST['location']   ?? '');
$message    = clean($_POST['message']    ?? '');
$privacy    = isset($_POST['privacy']) ? true : false;

// ─── Pflichtfeld-Validierung ─────────────────────────
$errors = [];

if (strlen($firstName) < 2) $errors[] = 'Vorname ungültig.';
if (strlen($lastName)  < 2) $errors[] = 'Nachname ungültig.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'E-Mail-Adresse ungültig.';
if (empty($eventType))  $errors[] = 'Veranstaltungsart fehlt.';
if (!$privacy)          $errors[] = 'Datenschutzzustimmung fehlt.';

if (!empty($errors)) {
    http_response_code(422);
    exit(json_encode(['success' => false, 'message' => implode(' ', $errors)]));
}

// ─── E-Mail zusammenbauen ────────────────────────────
$eventTypeLabels = [
    'kindergeburtstag' => 'Kindergeburtstag',
    'schulshow'        => 'Schulshow / Kita',
    'stadtfest'        => 'Stadtfest / Gemeindeevent',
    'firmenevent'      => 'Firmenevent',
    'sommerfest'       => 'Sommerfest',
    'weihnachtsfeier'  => 'Weihnachtsfeier',
    'sonstiges'        => 'Sonstiges',
];

$eventLabel = $eventTypeLabels[$eventType] ?? $eventType;
$dateLabel  = $eventDate ? date('d.m.Y', strtotime($eventDate)) : 'Nicht angegeben';
$guestLabel = $guestCount ?: 'Nicht angegeben';
$locLabel   = $location ?: 'Nicht angegeben';
$phoneLabel = $phone ?: 'Nicht angegeben';
$msgLabel   = $message ?: 'Keine Nachricht';

$subject = "Neue Buchungsanfrage: {$eventLabel} – {$firstName} {$lastName}";

$body = "
<!DOCTYPE html>
<html lang=\"de\">
<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a1628; color: #e0e8ff; margin: 0; padding: 20px; }
  .wrap { max-width: 600px; margin: auto; background: #111f45; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1a2d6e, #2347a8); padding: 32px; text-align: center; }
  .header h1 { color: #f5c518; font-size: 22px; margin: 0; }
  .header p { color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 28px 32px; }
  .field { margin-bottom: 16px; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #f5c518; display: block; margin-bottom: 4px; }
  .value { font-size: 15px; color: #e0e8ff; background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 6px; border-left: 3px solid #2347a8; }
  .msg-value { white-space: pre-wrap; }
  .footer { background: #0a1628; padding: 20px 32px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.35); }
</style>
</head>
<body>
<div class=\"wrap\">
  <div class=\"header\">
    <h1>✦ Neue Buchungsanfrage ✦</h1>
    <p>Magic Tim – kindermagicshow.de</p>
  </div>
  <div class=\"body\">
    <div class=\"field\"><span class=\"label\">Name</span><div class=\"value\">{$firstName} {$lastName}</div></div>
    <div class=\"field\"><span class=\"label\">E-Mail</span><div class=\"value\"><a href=\"mailto:{$email}\" style=\"color:#3a6fd8\">{$email}</a></div></div>
    <div class=\"field\"><span class=\"label\">Telefon</span><div class=\"value\">{$phoneLabel}</div></div>
    <div class=\"field\"><span class=\"label\">Veranstaltungsart</span><div class=\"value\">{$eventLabel}</div></div>
    <div class=\"field\"><span class=\"label\">Wunschdatum</span><div class=\"value\">{$dateLabel}</div></div>
    <div class=\"field\"><span class=\"label\">Gästezahl</span><div class=\"value\">{$guestLabel}</div></div>
    <div class=\"field\"><span class=\"label\">Ort</span><div class=\"value\">{$locLabel}</div></div>
    <div class=\"field\"><span class=\"label\">Nachricht</span><div class=\"value msg-value\">{$msgLabel}</div></div>
  </div>
  <div class=\"footer\">Diese Anfrage wurde über kindermagicshow.de gesendet am " . date('d.m.Y H:i') . " Uhr.</div>
</div>
</body></html>
";

// ─── Bestätigungs-E-Mail an den Anfragenden ──────────
$confirmSubject = 'Deine Anfrage bei Magic Tim – wir melden uns bald!';
$confirmBody = "
<!DOCTYPE html>
<html lang=\"de\">
<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; color: #1a1a2e; margin: 0; padding: 20px; }
  .wrap { max-width: 560px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a2d6e, #2347a8); padding: 36px; text-align: center; }
  .header h1 { color: #f5c518; font-size: 24px; margin: 0; }
  .header p { color: rgba(255,255,255,0.8); margin: 10px 0 0; }
  .body { padding: 32px; }
  .body p { font-size: 15px; line-height: 1.7; margin-bottom: 14px; color: #2a3350; }
  .highlight { color: #1a2d6e; font-weight: 700; }
  .cta { display: block; width: fit-content; margin: 24px auto; background: linear-gradient(135deg, #c8192a, #a01220); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 15px; }
  .footer { background: #f8f9ff; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
<div class=\"wrap\">
  <div class=\"header\">
    <h1>✨ Vielen Dank, {$firstName}!</h1>
    <p>Deine Anfrage ist angekommen.</p>
  </div>
  <div class=\"body\">
    <p>Hallo <span class=\"highlight\">{$firstName}</span>,</p>
    <p>deine Buchungsanfrage für eine <span class=\"highlight\">{$eventLabel}</span> ist bei uns eingegangen! Ich freue mich riesig und melde mich innerhalb von <span class=\"highlight\">24 Stunden</span> persönlich bei dir.</p>
    <p>In der Zwischenzeit kannst du dir gerne noch mehr von Magic Tim & Tuddy auf Instagram und YouTube ansehen.</p>
    <a class=\"cta\" href=\"https://www.instagram.com/kindermagicshow\">Instagram ansehen</a>
    <p style=\"text-align:center;font-size:13px;color:#9ca3af;\">Falls du noch Fragen hast, erreichst du uns unter:<br><a href=\"mailto:" . CONFIG['to'] . "\" style=\"color:#1a2d6e;\">" . CONFIG['to'] . "</a></p>
  </div>
  <div class=\"footer\">Magic Tim – kindermagicshow.de | © " . date('Y') . "</div>
</div>
</body></html>
";

// ─── E-Mail senden (PHPMailer oder mail()) ────────────
// Option A: Natives PHP mail() – einfach aber unzuverlässig
// Option B: PHPMailer mit SMTP – empfohlen für ALL-INKL

// Prüfe ob PHPMailer verfügbar (via Composer oder manuell eingebunden)
$phpmailerAvailable = class_exists('PHPMailer\PHPMailer\PHPMailer');

if ($phpmailerAvailable) {
    // ── PHPMailer (empfohlen) ──────────────────────────
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = CONFIG['smtp_host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = CONFIG['smtp_user'];
        $mail->Password   = CONFIG['smtp_pass'];
        $mail->SMTPSecure = CONFIG['smtp_secure'];
        $mail->Port       = CONFIG['smtp_port'];
        $mail->CharSet    = 'UTF-8';

        // Haupt-Mail
        $mail->setFrom(CONFIG['from'], CONFIG['from_name']);
        $mail->addAddress(CONFIG['to'], CONFIG['to_name']);
        $mail->addReplyTo($email, "{$firstName} {$lastName}");
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->send();

        // Bestätigungs-Mail
        $mail->clearAddresses();
        $mail->addAddress($email, "{$firstName} {$lastName}");
        $mail->Subject = $confirmSubject;
        $mail->Body    = $confirmBody;
        $mail->send();

        exit(json_encode(['success' => true, 'message' => 'Anfrage erfolgreich gesendet!']));

    } catch (Exception $e) {
        error_log('PHPMailer Fehler: ' . $mail->ErrorInfo);
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden.']));
    }

} else {
    // ── Fallback: PHP mail() ───────────────────────────
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . CONFIG['from_name'] . " <" . CONFIG['from'] . ">\r\n";
    $headers .= "Reply-To: {$firstName} {$lastName} <{$email}>\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

    $sent = mail(CONFIG['to'], $subject, $body, $headers);

    // Bestätigung
    $confHeaders  = "MIME-Version: 1.0\r\n";
    $confHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    $confHeaders .= "From: " . CONFIG['from_name'] . " <" . CONFIG['from'] . ">\r\n";

    mail($email, $confirmSubject, $confirmBody, $confHeaders);

    if ($sent) {
        exit(json_encode(['success' => true, 'message' => 'Anfrage erfolgreich gesendet!']));
    } else {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Fehler beim Senden.']));
    }
}
