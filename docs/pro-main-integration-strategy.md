# INUMIS Pro – Vergleich und sichere Integrationsstrategie

Stand: 2026-09-07 19:07 CEST
Gemeinsamer Ausgangs-Commit: `6e6da5a` (`origin/codex/desktop-google-oauth-fix`)
Status: Separate Integrationskopie aufgebaut und verifiziert; Hauptarbeitsbaum unverändert.

## Verifizierter Pro-Arbeitsstand

Der isolierte Arbeitsbaum `INUMIS-Pro-Work` enthält eine serverautoritativ ausgelegte Apple-Pro-Grundlage:

- serverseitig erzeugtes und atomar in Firestore gebundenes `appAccountToken`
- Prüfung signierter Apple-Transaktionen mit `@apple/app-store-server-library`
- feste Produkt-Allowlist (`com.alaniselin.numisma.pro.monthly`, `com.alaniselin.numisma.pro.yearly`)
- Bindung der Transaktion an Firebase-UID und servergespeichertes `appAccountToken`
- persistierter, minimierter Entitlement-Status für Desktop-Zugriff
- authentifizierte Endpunkte für Account-Token, Kauf-/Restore-Verifikation und Desktop-Entitlement
- Web-Adapter für StoreKit-Kauf und Wiederherstellung sowie API-Koordination

Verifikation dieses Stands:

- `npm test`: 88/88 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; Vite meldet weiterhin den bereits sichtbaren Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden

### Eingefrorener Vergleich vom 2026-09-07 17:01 CEST

Beide Arbeitsstände wurden erneut ausschließlich lesend erfasst:

- Pro-Arbeitsbaum: detached auf `6e6da5a`; 3 geänderte getrackte Pfade und 39 neue Quell-/Dokumentationsdateien. SHA-256 des getrackten Binär-Diffs: `91bf19e6ba243e5deb7bd66d4d474258eaacce76c27a0ba87967c824e15497e7`.
- Hauptarbeitsbaum: Branch `codex/desktop-google-oauth-fix` auf `6e6da5a`; 19 geänderte getrackte Pfade sowie relevante neue Entitlement-, Test-, iOS-Entitlement- und Dokumentationsdateien. SHA-256 des getrackten Binär-Diffs: `5a72802b076d972f7cbad8a66aa024b9bcecf4011c8b9c8ffdba6501f31357eb`.
- Beide `git diff --check`-Prüfungen sind sauber. Die mechanischen Kollisionen bleiben auf `package.json`, `package-lock.json` und `server.ts` begrenzt.
- Lokale/generierte Hauptartefakte (`.hermes/`, `builder-debug.yml`, `dist-ios/`, SwiftPM-`symlinks/`) gehören nicht in eine Integrationskopie. Die ungetrackte Datei `src/context/AuthContext 2.tsx` ist als mögliche Dublette zunächst ebenfalls ausgeschlossen und muss separat geprüft werden.

Die Hashes sichern den getrackten Diff-Zustand, nicht den Inhalt ungetrackter Dateien. Vor einer späteren Übernahme werden deshalb die ausgewählten ungetrackten Quelldateien einzeln kopiert und anschließend gegen Quell- und Zielinhalt geprüft; eine pauschale Verzeichnisübernahme bleibt ausgeschlossen.

Seit dem Erstvergleich wurde der nicht konfigurierte Subscription-Fallback per RED–GREEN abgesichert und in ein separat testbares Router-Modul ausgelagert. `GET /entitlement` antwortet nun ebenso wie die Kauf-/Restore-Endpunkte fail-closed mit HTTP 503, `active: false`, No-Store-Headern und derselben Origin-Grenze.

Das Persistenzschema wurde anschließend in drei vertikalen RED–GREEN-Etappen vereinheitlicht: Apple-verifizierte Zustände `active`, `expired` und `revoked` werden jetzt ausschließlich als vollständige, versionierte Datensätze gespeichert, während die API weiterhin nur minimale DTOs ohne Transaktionskennungen ausgibt. Eine Transaktion aus der falschen Apple-Umgebung überschreibt keinen bereits vertrauenswürdigen Serverzustand.

## Vergleich mit dem aktuellen Hauptarbeitsbaum

Beide Arbeitsbäume basieren auf demselben Commit, enthalten aber voneinander unabhängige, noch nicht committete Änderungen. Der Hauptarbeitsbaum ist deshalb **kein sicheres Ziel für eine pauschale Kopie, einen Checkout oder einen Merge mit Überschreiben**.

### Direkte Dateikollisionen

Nur drei geänderte Pfade überschneiden sich mechanisch:

1. `package.json`
2. `package-lock.json`
3. `server.ts`

Diese drei Dateien müssen gezielt zusammengeführt werden.

### Änderungen im Hauptarbeitsbaum, die erhalten bleiben müssen

Der Hauptarbeitsbaum enthält unter anderem noch nicht committete Arbeiten an:

- iOS-/Capacitor-Konfiguration und Sign-in-with-Apple-Entitlement
- Apple-Anmeldung und Kontolöschung
- PDF-/Share-/Filesystem-Funktionen und zugehörigen Abhängigkeiten
- Druck-, Formular-, Listen- und Statistikoberflächen
- Firestore-Regeln und Speicherlogik
- KI-Timeouts, Fehlerbehandlung und Timing im Server
- einem ungetrackten allgemeinen Subscription-Datentyp samt lokaler Access-Entscheidung

Die Pro-Integration darf diese Änderungen nicht ersetzen oder zurücksetzen.

### Pro-Dateien ohne direkte Namenskollision

Die neuen Module unter `src/server/apple*`, `src/server/firestoreAppleAccountTokenStore.ts` sowie `src/utils/apple*` existieren im Hauptarbeitsbaum derzeit nicht unter denselben Namen. Sie können später grundsätzlich als geschlossene Gruppe übertragen werden, müssen danach aber gegen den zusammengeführten Stand erneut vollständig getestet werden.

## Fachliche Schnittstellen, die vor UI-Freischaltung vereinheitlicht werden müssen

### 1. Entitlement-Schema

Der Hauptarbeitsbaum definiert einen allgemeinen Datensatz mit `trial`, `active`, `grace`, `expired` und `revoked`. Der geprüfte Pro-Code persistiert bei aktiver Subscription einen kompatiblen aktiven Datensatz, bei inaktiver Subscription derzeit jedoch nur `{ active: false, reason }`.

Sichere Entscheidung:

- API-Antwort und persistierten Firestore-Datensatz als getrennte Typen behandeln.
- In Firestore nur ein vollständig versioniertes, servergeschriebenes Schema speichern.
- Für die erste Einreichung nur Zustände gewähren, die Apple serverseitig sicher bestätigt hat; unbekannte, unvollständige oder nicht unterstützte Zustände bleiben ohne Zugriff.
- `trial` und `grace` erst freischalten, wenn deren Apple-Quelle und Aktualisierung serverseitig eindeutig implementiert und getestet sind.

### 2. Desktop-Entitlement

Der geprüfte Server kann einen zuvor von Apple verifizierten, noch nicht abgelaufenen aktiven Datensatz für Desktop-Clients lesen. Das ist die richtige Vertrauensgrenze: Der Desktop darf keinen lokalen Pro-Status erzeugen.

Vor Integration sind noch Tests/Entscheidungen nötig für:

- fehlenden gegenüber abgelaufenem oder widerrufenem Datensatz
- Aktualität ohne App-Start auf dem iPhone (App Store Server Notifications oder ein anderer serverseitiger Refresh-Pfad)

Der nicht konfigurierte Fallback-Router ist inzwischen auch für `GET /entitlement` konsistent abgesichert.

### 3. Kauf und Wiederherstellung

Die TypeScript-Schicht ist getestet, aber noch nicht Ende-zu-Ende lauffähig:

- Im iOS-Projekt existiert noch kein nativer `AppleStoreKit`-Capacitor-Plugin-Code.
- Es existiert noch keine `.storekit`-Testkonfiguration.
- Die Restore-Schnittstelle liefert derzeit genau eine signierte Transaktion; das Verhalten bei mehreren früheren Produkten/Transaktionen muss im nativen Adapter eindeutig und testbar festgelegt werden.
- Kauf-/Restore-UI ist im Hauptstand noch nicht mit dem geprüften Coordinator verdrahtet.

Daher darf Pro im UI noch nicht als kaufbar oder wiederherstellbar angezeigt werden.

### 4. Noch offene serverseitige Release-Grenzen

Der erneute Abgleich mit dem Implementierungsbrief zeigt zwei bewusst noch nicht erfüllte Sicherheitsanforderungen:

- Es gibt noch keinen atomaren Ledger, der eine `originalTransactionId` genau einer Firebase-UID zuordnet und Wiederholungen idempotent verarbeitet. Die aktuelle `appAccountToken`-Prüfung ist notwendig, ersetzt diesen dauerhaften Eindeutigkeitsnachweis aber nicht.
- App Store Server Notifications V2, `notificationUUID`-Deduplizierung und ein kanonischer serverseitiger Refresh fehlen noch. Ohne diesen Pfad können Ablauf, Erstattung oder Widerruf außerhalb eines iPhone-App-Starts den Desktopstatus nicht zeitnah aktualisieren.

Außerdem unterscheiden sich die im älteren Brief genannten Routen (`/billing/...`) von der derzeit implementierten Mount-Grenze `/api/subscription/apple`. Vor UI-Anbindung muss genau ein öffentlicher Vertrag festgelegt und durch Endpunkt-Tests dokumentiert werden; eine parallele, versehentliche Doppel-API ist zu vermeiden.

## Sichere Integrationsreihenfolge

1. **Arbeitsstände einfrieren, ohne Commit/Push:** Vor der eigentlichen Integration beide Statuslisten und Diffs erneut prüfen; keine Datei im Hauptarbeitsbaum pauschal ersetzen.
2. **Integrationskopie auf Basis des aktuellen Hauptinhalts erstellen:** Die noch nicht committeten Hauptänderungen kontrolliert in einen separaten Integrationsarbeitsbaum übernehmen. Nicht direkt im Hauptarbeitsbaum experimentieren.
3. **Pro-Module als geschlossene Gruppe übernehmen:** Neue `src/server/apple*`, `firestoreAppleAccountTokenStore`- und `src/utils/apple*`-Dateien einschließlich Tests übertragen.
4. **Abhängigkeiten gezielt zusammenführen:** In `package.json` die Haupt-Abhängigkeiten beibehalten und nur Testskript plus `@apple/app-store-server-library` ergänzen; Lockfile anschließend ausschließlich mit npm regenerieren, nicht durch Kopieren ersetzen.
5. **`server.ts` manuell zusammenführen:** KI-/Account-Deletion-Änderungen aus dem Hauptstand behalten und nur Imports sowie Subscription-Router-Mount ergänzen. Danach speziell konfigurierte und nicht konfigurierte Startpfade testen.
6. **Entitlement-Vertrag vereinheitlichen:** Persistenztyp, API-DTO und lokale Anzeigeentscheidung trennen; jede Änderung strikt RED–GREEN–REFACTOR.
7. **Native StoreKit-Brücke implementieren:** Zuerst Plugin-Vertragstests, dann Swift-/Capacitor-Implementierung für Produkte, Kauf, `appAccountToken`, Verifikationsergebnis und Restore. Keine echten Käufe ohne Nutzerbestätigung; zunächst lokale StoreKit-Konfiguration, danach Apple Sandbox.
8. **UI anbinden:** Kauf und Wiederherstellung nur für authentifizierte iOS-Nutzer; Desktop liest ausschließlich das servergespeicherte Entitlement. Fehler, Abbruch, Pending und Restore-ohne-Kauf fail-closed behandeln.
9. **Server-Aktualisierung ergänzen:** Apple-Statusänderungen serverseitig aktualisieren, bevor Desktop-Zugriff als vollständig belastbar gilt.
10. **Release-Gates:** vollständige Tests, `npm run lint`, `npm run build`, `npm run build:ios`, `git diff --check`, Xcode-Build/Tests sowie manuelle Sandbox-Matrix. App-Store-Connect, Preise, Käufe und Einreichung bleiben bestätigungspflichtig.

## Verifizierte Integrationskopie vom 2026-09-07 19:07 CEST

Der geplante isolierte Zusammenbau liegt nun unter `INUMIS-Integration-Work` als detached Worktree auf `6e6da5a`. Dabei wurden der getrackte Haupt-Diff angewendet und nur die ausdrücklich ausgewählten ungetrackten Hauptdateien übernommen. Ausgeschlossen blieben `.hermes/`, `builder-debug.yml`, `dist-ios/`, SwiftPM-`symlinks/` und `src/context/AuthContext 2.tsx`.

Anschließend wurden die 38 kollisionsfreien Pro-Quell- und Testdateien einzeln übertragen und per SHA-256-Inhaltsvergleich ohne Abweichung bestätigt. `package.json` wurde gezielt um das Testskript und `@apple/app-store-server-library` ergänzt; `package-lock.json` wurde durch `npm install` neu erzeugt. In `server.ts` wurden ausschließlich die Subscription-Imports und der konfigurierte beziehungsweise fail-closed Router-Mount in den erhaltenen Hauptstand eingefügt.

Verifikation der Integrationskopie:

- `npm test`: 99/99 Tests bestanden, einschließlich der 11 übernommenen Haupttests
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden
- Haupt- und Pro-Arbeitsbaum nach dem Aufbau erneut geprüft und nicht verändert

Es wurde weder committed noch gepusht oder deployed. Die Integrationskopie ist ein Prüfstand und noch nicht der freigegebene Hauptarbeitsbaum.

## Verifizierte Entitlement-Etappe vom 2026-09-07 21:12 CEST

In der isolierten Integrationskopie wurde die Desktop-API per RED–GREEN an den gemeinsamen `parseSubscriptionEntitlement`-Validator angebunden. Der neue Endpunkttest zeigte zunächst reproduzierbar, dass ein unvollständiger aktiver Firestore-Datensatz fälschlich Zugriff gewährte; nach der minimalen Änderung wird ein solcher Datensatz fail-closed als `malformed-entitlement` abgelehnt. Der bestehende Produkt-Allowlist-Test verwendet nun einen ansonsten vollständigen Datensatz, damit Parser- und Produktgrenze unabhängig geprüft bleiben.

Verifikation:

- RED: der neue Endpunkttest schlug mit tatsächlich gewährtem Zugriff erwartungsgemäß fehl
- GREEN: `npm test`: 100/100 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden
- Haupt- und Pro-Arbeitsbaum wurden nach der Etappe erneut ausschließlich lesend geprüft

Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte Missing-Entitlement-Etappe vom 2026-09-07 23:15 CEST

In der isolierten Integrationskopie wurde der Desktop-Vertrag für einen nicht vorhandenen Firestore-Datensatz als erster vertikaler Slice präzisiert. Der neue Endpunkttest schlug zunächst erwartungsgemäß fehl, weil `null` noch als `malformed-entitlement` ausgegeben wurde; nach der minimalen Änderung antwortet die API fail-closed, aber unterscheidbar mit `missing-entitlement`.

Verifikation:

- RED: spezifischer Endpunkttest mit tatsächlichem `malformed-entitlement` statt erwartetem `missing-entitlement`
- GREEN: spezifischer Test bestanden
- `npm test`: 101/101 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden

Es wurde weder committed noch gepusht oder deployed. Haupt- und Pro-Arbeitsbaum wurden nicht überschrieben; Apple-Konten, Käufe und App Store Connect wurden nicht berührt.

## Verifizierte Revoked-Entitlement-Etappe vom 2026-09-08 01:19 CEST

Im dauerhaften Pro-Arbeitsbereich wurde der Desktop-Vertrag für einen vollständigen widerrufenen Datensatz als einzelner RED–GREEN-Slice festgelegt. Der Endpunkttest schlug zunächst erwartungsgemäß mit `expired` statt `revoked` fehl; nach der minimalen Änderung bleibt der Zugriff gesperrt und die API liefert den nicht-sensitiven Grund `revoked`.

Verifikation:

- RED: spezifischer Endpunkttest mit tatsächlichem `expired` statt erwartetem `revoked`
- GREEN: spezifischer Endpunkttest bestanden
- `npm test`: 89/89 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden

Es wurde weder committed noch gepusht oder deployed. Haupt- und Integrationsarbeitsbaum wurden nicht überschrieben; Apple-Konten, Käufe und App Store Connect wurden nicht berührt.

## Verifizierter Revoked-Abgleich in der Integrationskopie vom 2026-09-08 03:23 CEST

Der erneute Inhaltsvergleich zeigte eine konkrete Abweichung: Der Pro-Arbeitsstand meldete einen vollständig validierten, widerrufenen Desktop-Datensatz bereits als `revoked`, während die isolierte Integrationskopie denselben Datensatz noch pauschal als `expired` ausgab. Diese Lücke wurde in der Integrationskopie als einzelner vertikaler TDD-Slice geschlossen:

- RED: Der neue Endpunkttest schlug mit tatsächlich `expired` statt erwartetem `revoked` fehl.
- GREEN: Nach der minimalen, erst hinter dem gemeinsamen Schema-Parser ausgeführten Statusprüfung bestand der spezifische Test.
- Gesamtlauf: `npm test` bestand mit 102/102 Tests.
- `npm run lint`, `npm run build` und `git diff --check` bestanden; beim Build blieb nur der bekannte Chunk-Größenhinweis.

Der aktuelle Hauptarbeitsbaum blieb unverändert. Die erneut ermittelten SHA-256-Werte der getrackten Binär-Diffs sind für Pro weiterhin `91bf19e6ba243e5deb7bd66d4d474258eaacce76c27a0ba87967c824e15497e7`, für Main weiterhin `5a72802b076d972f7cbad8a66aa024b9bcecf4011c8b9c8ffdba6501f31357eb` und für die Integrationskopie weiterhin `249cfb3e9385b085052bae5889d89c2cddd230d72c9213e39a3084644b8bc1b2`. Der Integrationshash bleibt trotz dieser Etappe unverändert, weil die betroffenen `src/server`-Dateien weiterhin ungetrackt sind; maßgeblich sind deshalb zusätzlich der Inhaltsvergleich und der vollständige Testlauf.

Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte Desktop-Client-Etappe vom 2026-09-08 05:29 CEST

In der isolierten Integrationskopie wurde der bislang nur serverseitig vorhandene Desktop-Entitlement-Pfad in drei vertikalen TDD-Slices bis zur Client-API geführt:

- RED: Der aktive Desktop-Abruf scheiterte zunächst am fehlenden Export `fetchAppleProDesktopEntitlement`; GREEN: authentifizierter `GET /api/subscription/apple/entitlement` ohne Apple-Transaktionsdaten.
- RED: Ein serverbestätigt fehlendes Entitlement wurde zunächst fälschlich als `subscription/unavailable` verworfen; GREEN: `{ active: false, reason: 'missing-entitlement' }` bleibt ein gültiges, zugriffsloses Ergebnis.
- RED: Ein malformed gespeicherter Datensatz wurde ebenfalls als Transportfehler verworfen; GREEN: `{ active: false, reason: 'malformed-entitlement' }` wird ausdrücklich fail-closed transportiert.

Der Kauf-/Restore-Vertrag bleibt davon getrennt: Seine POST-Antworttypen wurden nicht um Desktop-spezifische Gründe erweitert. Die Client-Prüfung akzeptiert weiterhin nur exakte Antwortfelder, erlaubte Produkt-IDs und kanonische Ablaufzeitpunkte.

Verifikation:

- alle drei spezifischen RED-Läufe scheiterten aus dem jeweils erwarteten Grund und bestanden nach minimaler Implementierung
- `npm test`: 105/105 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden

Es wurde weder committed noch gepusht oder deployed. Haupt- und Pro-Arbeitsbaum wurden nicht überschrieben; Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte StoreKit-Produktvertrag-Etappe vom 2026-09-08 07:34 CEST

Im dauerhaften Pro-Arbeitsbereich wurde der bisher nur Kauf und Restore umfassende TypeScript-Vertrag der nativen StoreKit-Brücke um die Produktdarstellung erweitert. Der einzelne vertikale TDD-Slice legt fest, dass die native Seite für die beiden erlaubten Pro-Produkte `productId`, lokalisierten Anzeigenamen und lokalisierten Anzeigepreis liefert; Preise werden damit nicht im Web-Client erfunden oder fest hinterlegt.

Verifikation:

- RED: Der spezifische Test scheiterte erwartungsgemäß am noch fehlenden Export `listAppleProProducts`.
- GREEN: Der spezifische StoreKit-Testlauf bestand mit 4/4 Tests.
- `npm test`: 90/90 Tests bestanden.
- `npm run lint`: bestanden.
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: bestanden.
- Die getrackten Diff-Hashes von Pro, Main und Integrationskopie blieben unverändert; die neuen StoreKit-Dateien sind im Pro-Prüfstand weiterhin ungetrackt.

Der Hauptarbeitsbaum und die Integrationskopie wurden nicht überschrieben. Es wurde weder committed noch gepusht oder deployed; Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte StoreKit-Produktvalidierungs-Etappe vom 2026-09-08 09:11 CEST

Im dauerhaften Pro-Arbeitsbereich wurde der native Produktlisten-Vertrag in fünf kleinen vertikalen TDD-Slices fail-closed abgesichert. Die Web-Schicht verwirft jetzt unbekannte Produkt-IDs, doppelte Produkt-IDs, leere lokalisierte Namen, leere lokalisierte Preise und einen malformed Produktlisten-Container einheitlich mit `subscription/storekit-invalid-response`.

Verifikation:

- Jeder der fünf spezifischen RED-Läufe scheiterte vor der jeweiligen Produktionsänderung aus dem erwarteten Grund; die zugehörigen GREEN-Läufe bestanden anschließend einzeln.
- `npm test`: 95/95 Tests bestanden.
- `npm run lint`: bestanden.
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: bestanden.
- Haupt- und Integrationsarbeitsbaum wurden nur lesend kontrolliert und nicht überschrieben.

Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierter Produktlisten-Abgleich in der Integrationskopie vom 2026-09-08 11:15 CEST

Die beiden geprüften StoreKit-Dateien wurden test-first und einzeln in die isolierte Integrationskopie übernommen. Der RED-Lauf schlug dort erwartungsgemäß fehl, weil `listAppleProProducts` im bisherigen Integrationsstand nicht exportiert wurde. Nach Übernahme der Produktionsdatei bestand der spezifische Lauf mit 9/9 Tests; die SHA-256-Werte von Quell- und Zielpaar stimmen jeweils exakt überein.

Verifikation der Integrationskopie:

- `npm test`: 111/111 Tests bestanden
- `npm run lint`: bestanden
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden
- Haupt- und Pro-Arbeitsbaum wurden nach der Übernahme erneut nur lesend kontrolliert

Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte native Produktkern-Etappe vom 2026-09-08 13:20 CEST

Im dauerhaften Pro-Prüfstand wurde ein eigenständig testbares Swift-Package `ios/AppleStoreKitCore` als erster nativer Produktabfrage-Slice angelegt. Der Kern fordert ausschließlich die beiden erlaubten Pro-Produktkennungen an, transportiert die von StoreKit zu liefernden lokalisierten Namen und Preise ohne clientseitige Preisannahmen und weist unbekannte Produktkennungen fail-closed zurück.

Verifikation:

- RED 1: Der erste spezifische Swift-Test scheiterte erwartungsgemäß an den noch fehlenden Produktvertragstypen und dem fehlenden Service; GREEN: Produktanforderung und lokalisierte Präsentation bestanden.
- RED 2: Der zweite spezifische Swift-Test scheiterte erwartungsgemäß am noch fehlenden Fehlervertrag; GREEN: unbekannte Produktkennung wurde als `invalidProductResponse` abgelehnt.
- `swift test`: 2/2 Tests bestanden.
- `npm test`: 95/95 Tests bestanden.
- `npm run lint`: bestanden.
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: bestanden.

Der Swift-Kern ist absichtlich noch nicht an das Xcode-App-Target oder einen Capacitor-Plugin-Einstieg gekoppelt; dadurch bleibt diese Etappe klein, testbar und ohne Eingriff in die parallel geänderte iOS-Projektdatei des Hauptstands. Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte echte StoreKit-Loader-Etappe vom 2026-09-08 15:24 CEST

Der isolierte Swift-Kern besitzt nun einen produktiven `StoreKitProductLoader`. Dessen öffentlicher Standardinitialisierer ruft `StoreKit.Product.products(for:)` auf und überführt ausschließlich Apples lokalisierte Produktkennung, Anzeigename und Anzeigepreis in den bereits geprüften Kernvertrag. Die StoreKit-Abhängigkeit bleibt hinter `ProductLoading` gekapselt, sodass der Service ohne Store- oder Kontoaktion deterministisch testbar bleibt.

Verifikation:

- RED: Der spezifische Swift-Test scheiterte erwartungsgemäß am fehlenden `StoreKitProductLoader`.
- GREEN: Der spezifische Test bestand nach der minimalen Implementierung.
- `swift test`: 3/3 Tests bestanden.
- `npm test`: 95/95 Tests bestanden.
- `npm run lint`: bestanden.
- `npm run build`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: bestanden.

Haupt- und Integrationsarbeitsbaum wurden nicht überschrieben. Es wurde weder committed noch gepusht oder deployed; Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierter Swift-Package-Abgleich in der Integrationskopie vom 2026-09-08 17:29 CEST

Das eigenständig testbare Package `ios/AppleStoreKitCore` wurde dateiweise in die isolierte Integrationskopie übernommen. Der RED-Lauf scheiterte dort erwartungsgemäß, weil das Package noch nicht existierte. Danach wurden ausschließlich `Package.swift`, der Swift-Kern und dessen Testdatei kopiert; die SHA-256-Werte von Quelle und Ziel stimmen für alle drei Dateien exakt überein.

Verifikation der Integrationskopie:

- `swift test --package-path ios/AppleStoreKitCore`: 3/3 Tests bestanden
- `npm test`: 111/111 Tests bestanden
- `npm run lint`: bestanden
- `npm run build` und `npm run build:ios`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk
- `git diff --check`: bestanden

Der Hauptarbeitsbaum wurde nicht verändert. Es wurde weder committed noch gepusht oder deployed; Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte native Plugin-Vertrag-Etappe vom 2026-09-09 20:57 CEST

Im dauerhaften Pro-Prüfstand wurde die erste native Plugin-Grenze als isolierter Swift-Vertrag ergänzt. `AppleStoreKitProductPluginHandler.getProducts()` kapselt die asynchrone Produktabfrage und liefert exakt einen `products`-Container mit den bereits geprüften `productId`-, `displayName`- und `displayPrice`-Darstellungen. Die Capacitor- und Xcode-Projektdateien bleiben dabei bewusst unangetastet.

Verifikation:

- RED: Der spezifische Swift-Test scheiterte erwartungsgemäß an den fehlenden Typen `AppleStoreKitProductPluginHandler` und `AppleStoreKitProductsResponse`.
- GREEN: Der spezifische Test bestand nach der minimalen Implementierung.
- `swift test`: 4/4 Tests bestanden.
- `npm test`: 95/95 Tests bestanden.
- `npm run lint`, `npm run build` und `npm run build:ios`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: in Pro-, Haupt- und Integrationsarbeitsbaum bestanden; Haupt- und Integrationsarbeitsbaum wurden nur lesend geprüft.

Es wurde weder committed noch gepusht oder deployed. Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Verifizierte native Kaufvertrags-Etappe vom 2026-09-09 23:02 CEST

Der erneute Vergleich zeigte, dass der isolierte Swift-Kern inzwischen bereits einen geprüften Kaufservice enthält: Er akzeptiert ausschließlich die beiden freigegebenen Produktkennungen, wandelt nur ein kanonisch parsebares `appAccountToken` in eine UUID um und reicht beides an die gekapselte StoreKit-Grenze weiter. Unbekannte Produkte und malformed Account-Tokens werden vor jedem Store-Aufruf abgewiesen.

Als nächster einzelner vertikaler Slice wurde die noch fehlende Plugin-Grenze für den Web-Kaufvertrag ergänzt. `AppleStoreKitPurchasePluginHandler.purchase(...)` transportiert die beiden Eingabefelder unverändert zur geprüften Kaufoperation und liefert ausschließlich `{ signedTransaction }` zurück; Capacitor- und Xcode-Projektdateien bleiben weiterhin unangetastet.

Verifikation:

- RED: Der spezifische Swift-Test scheiterte erwartungsgemäß an den fehlenden Typen `AppleStoreKitPurchasePluginHandler` und `AppleStoreKitPurchaseResponse`.
- GREEN: Der spezifische Test bestand nach der minimalen Implementierung.
- `swift test --package-path ios/AppleStoreKitCore`: 8/8 Tests bestanden.
- `npm test`: 95/95 Tests bestanden.
- `npm run lint`, `npm run build` und `npm run build:ios`: bestanden; nur der bekannte Vite-Hinweis auf einen großen JavaScript-Chunk.
- `git diff --check`: bestanden.

Der Hauptarbeitsbaum wurde nur lesend kontrolliert und nicht überschrieben. Es wurde weder committed noch gepusht oder deployed; Apple-Konten, Käufe, Preise und App Store Connect wurden nicht berührt.

## Nächster autonom sicherer Schritt

Den produktiven `ProductPurchasing`-Adapter gegen StoreKit 2 per TDD entwerfen, insbesondere die getrennte Behandlung von verifizierter Transaktion, nicht verifizierter Transaktion, Abbruch und Pending. Vor der Implementierung muss der Abschlusszeitpunkt (`Transaction.finish`) mit der serverseitigen Verifikation sauber abgestimmt werden; echte Sandbox-Käufe und Apple-Kontoaktionen bleiben bestätigungspflichtig.
