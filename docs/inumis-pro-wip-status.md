# INUMIS Pro – WIP-Status

Dieser Branch sichert den aktuellen, getesteten Entwicklungsstand der Apple-Abo-Integration. Er ist **nicht releasebereit** und darf nicht deployed oder in den Release-Branch gemerged werden, bevor die unten genannten Blocker geschlossen und erneut geprüft sind.

## Verifiziert

- StoreKit-2-Produktabfrage, Kauf-, Finish- und Wiederherstellungsverträge
- Capacitor-Brücke und iOS-Projektintegration
- Firebase-authentifizierte Serverrouten
- serverseitige JWS-Prüfung und Bindung an `appAccountToken`
- persistierter Entitlement-Status für iPhone und Desktop
- Produkt-IDs:
  - `com.alaniselin.numisma.pro.monthly`
  - `com.alaniselin.numisma.pro.yearly`
- 104 Node-Tests bestanden
- 23 Swift-Tests bestanden
- TypeScript-Lint, Produktions-Build und `git diff --check` bestanden

## Release-Blocker

1. Ein atomarer Ledger muss `originalTransactionId` eindeutig einer Firebase-UID zuordnen und ältere Transaktionen daran hindern, einen neueren Ablauf- oder Widerrufsstatus zu überschreiben.
2. App Store Server Notifications V2 oder ein gleichwertiger serverseitiger Abgleich muss Verlängerung, Ablauf, Erstattung und Widerruf unabhängig vom nächsten iPhone-App-Start aktualisieren.
3. Die Kaufoberfläche darf erst nach Schließen der beiden serverseitigen Blocker für einen Release aktiviert werden.
4. App-Store-Connect-Verfügbarkeit, Preise und Lokalisierungen müssen vollständig geprüft werden; aktuell liefert StoreKit auf dem physischen Gerät noch keine Produkte.
5. Ein echter Sandbox-Kauf, Wiederherstellung und geräteübergreifender Entitlement-Test stehen aus.

## Nicht enthalten

- keine Secrets oder Apple-Zugangsdaten
- keine erzeugten `dist-ios`-Artefakte
- keine SwiftPM-`symlinks`
- keine lokalen Dubletten mit ` 2` im Dateinamen
- kein Deployment und keine App-Store-Einreichung
