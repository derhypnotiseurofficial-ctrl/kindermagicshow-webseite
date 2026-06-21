<?php
declare(strict_types=1);

// ─── Konfiguration ───────────────────────────────────
define('TO_EMAIL',   'info@kindermagicshow.de');
define('TO_NAME',    'Magic Tim');
define('FROM_EMAIL', 'noreply@kindermagicshow.de');
define('FROM_NAME',  'Kindermagicshow.de');

// ─── Sicherheits-Header ──────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Nur AJAX-POST erlauben
if (
    empty($_SERVER['HTTP_X_REQUESTED_WITH']) ||
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest' ||
    $_SERVER['REQUEST_METHOD'] !== 'POST'
) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Unerlaubter Zugriff.']));
}

// ─── Honeypot-Check ──────────────────────────────────
if (!empty($_POST['website_url'])) {
    exit(json_encode(['success' => true, 'message' => 'Vielen Dank!']));
}

// ─── Eingaben bereinigen ─────────────────────────────
function clean(string $str): string {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}

$name       = clean($_POST['name']       ?? '');
$email      = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone      = clean($_POST['phone']      ?? '');
$eventType  = clean($_POST['eventType']  ?? '');
$eventDate  = clean($_POST['eventDate']  ?? '');
$guestCount = clean($_POST['guestCount'] ?? '');
$location   = clean($_POST['location']   ?? '');
$message    = clean($_POST['message']    ?? '');
$privacy    = !empty($_POST['privacy']);

// ─── Pflichtfeld-Validierung ─────────────────────────
$errors = [];
if (strlen($name) < 2)                            $errors[] = 'Name ungültig.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   $errors[] = 'E-Mail ungültig.';
if (empty($eventType))                            $errors[] = 'Veranstaltungsart fehlt.';
if (!$privacy)                                    $errors[] = 'Datenschutzzustimmung fehlt.';

if (!empty($errors)) {
    http_response_code(422);
    exit(json_encode(['success' => false, 'message' => implode(' ', $errors)]));
}

// ─── Daten aufbereiten ───────────────────────────────
$eventLabels = [
    'kindergeburtstag' => 'Kindergeburtstag',
    'schulshow'        => 'Schulshow / Kita',
    'stadtfest'        => 'Stadtfest / Gemeindeevent',
    'firmenevent'      => 'Firmenevent',
    'sommerfest'       => 'Sommerfest',
    'weihnachtsfeier'  => 'Weihnachtsfeier',
    'sonstiges'        => 'Sonstiges',
];

$eventLabel = $eventLabels[$eventType] ?? $eventType;
$dateLabel  = $eventDate ? date('d.m.Y', strtotime($eventDate)) : 'Nicht angegeben';
$guestLabel = $guestCount ?: 'Nicht angegeben';
$locLabel   = $location   ?: 'Nicht angegeben';
$phoneLabel = $phone      ?: 'Nicht angegeben';
$msgLabel   = nl2br(htmlspecialchars($message ?: 'Keine Nachricht', ENT_QUOTES, 'UTF-8'));

// ─── Buchungsanfrage-Mail an Magic Tim ───────────────
$subject = "Neue Buchungsanfrage: {$eventLabel} – {$name}";

$body = "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"utf-8\">
<style>
  body{font-family:Arial,sans-serif;background:#0a1628;color:#e0e8ff;margin:0;padding:20px}
  .wrap{max-width:600px;margin:auto;background:#111f45;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a2d6e,#2347a8);padding:28px;text-align:center}
  .hdr h1{color:#f5c518;font-size:20px;margin:0}
  .hdr p{color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px}
  .bdy{padding:24px 28px}
  .row{margin-bottom:14px}
  .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#f5c518;display:block;margin-bottom:3px}
  .val{font-size:14px;color:#e0e8ff;background:rgba(255,255,255,0.05);padding:9px 12px;border-radius:5px;border-left:3px solid #2347a8}
  .ftr{background:#0a1628;padding:16px 28px;text-align:center;font-size:11px;color:rgba(255,255,255,.3)}
</style></head><body>
<div class=\"wrap\">
  <div class=\"hdr\"><h1>✦ Neue Buchungsanfrage ✦</h1><p>kindermagicshow.de</p></div>
  <div class=\"bdy\">
    <div class=\"row\"><span class=\"lbl\">Name</span><div class=\"val\">{$name}</div></div>
    <div class=\"row\"><span class=\"lbl\">E-Mail</span><div class=\"val\"><a href=\"mailto:{$email}\" style=\"color:#3a6fd8\">{$email}</a></div></div>
    <div class=\"row\"><span class=\"lbl\">WhatsApp / Telefon</span><div class=\"val\">{$phoneLabel}</div></div>
    <div class=\"row\"><span class=\"lbl\">Veranstaltungsart</span><div class=\"val\">{$eventLabel}</div></div>
    <div class=\"row\"><span class=\"lbl\">Wunschdatum</span><div class=\"val\">{$dateLabel}</div></div>
    <div class=\"row\"><span class=\"lbl\">Gästezahl</span><div class=\"val\">{$guestLabel}</div></div>
    <div class=\"row\"><span class=\"lbl\">Ort</span><div class=\"val\">{$locLabel}</div></div>
    <div class=\"row\"><span class=\"lbl\">Nachricht</span><div class=\"val\">{$msgLabel}</div></div>
  </div>
  <div class=\"ftr\">Gesendet am " . date('d.m.Y H:i') . " Uhr über kindermagicshow.de</div>
</div></body></html>";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";

$sent = mail(TO_EMAIL, $subject, $body, $headers);

if (!$sent) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden. Bitte schreib uns direkt an info@kindermagicshow.de']));
}

// ─── Bestätigungs-Mail an den Anfragenden ────────────
$confirmSubject = 'Deine Anfrage bei Magic Tim – ich melde mich bald!';
$confirmBody = "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"utf-8\">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4ff;color:#1a1a2e;margin:0;padding:20px}
  .wrap{max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hdr{background:linear-gradient(135deg,#1a2d6e,#2347a8);padding:32px;text-align:center}
  .hdr h1{color:#f5c518;font-size:22px;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .bdy{padding:28px 32px}
  .bdy p{font-size:15px;line-height:1.7;margin-bottom:12px;color:#2a3350}
  .hl{color:#1a2d6e;font-weight:700}
  .cta{display:block;width:fit-content;margin:20px auto;background:linear-gradient(135deg,#c8192a,#a01220);color:#fff;text-decoration:none;padding:13px 30px;border-radius:50px;font-weight:700;font-size:15px}
  .ftr{background:#f8f9ff;padding:18px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head><body>
<div class=\"wrap\">
  <div class=\"hdr\"><h1>✨ Danke, {$name}!</h1><p>Deine Anfrage ist angekommen.</p></div>
  <div class=\"bdy\">
    <p>Hallo <span class=\"hl\">{$name}</span>,</p>
    <p>deine Buchungsanfrage für eine <span class=\"hl\">{$eventLabel}</span> ist bei mir eingegangen! Ich freue mich sehr und melde mich innerhalb von <span class=\"hl\">24 Stunden</span> persönlich bei dir.</p>
    <p>Schau gerne schon mal auf Instagram vorbei:</p>
    <a class=\"cta\" href=\"https://www.instagram.com/KinderMagicShow.de\">Instagram ansehen</a>
    <p style=\"text-align:center;font-size:13px;color:#9ca3af\">Fragen? Erreichst du mich unter:<br>
    <a href=\"mailto:" . TO_EMAIL . "\" style=\"color:#1a2d6e\">" . TO_EMAIL . "</a></p>
  </div>
  <div class=\"ftr\">Magic Tim – kindermagicshow.de &copy; " . date('Y') . "</div>
</div></body></html>";

$confHeaders  = "MIME-Version: 1.0\r\n";
$confHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
$confHeaders .= "From: Magic Tim <" . FROM_EMAIL . ">\r\n";

mail($email, $confirmSubject, $confirmBody, $confHeaders);

exit(json_encode(['success' => true, 'message' => 'Anfrage erfolgreich gesendet!']));
