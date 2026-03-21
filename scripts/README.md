# NeoFab-ScanLab Setup-Skripte (Debian 13, LXC/VM/Server)

## Wohin kopieren?

- Empfohlener Pfad: `/home/neofab/projects/neofab-scanlab/scripts`
- Wenn du das gesamte Repository klonst, liegen die Skripte automatisch dort. Kein separates Kopieren noetig.

## Schnellstart (als root im Debian-Container)

Ausgangs-Situation:
Neu erstellter LXC-Container mit Debian 13 auf einem Proxmox-Server (8.4.14) (Stand Ende Dezember 2025)

In der Konsole des Servers (Proxmox-Oberflaeche) als `root` angemeldet:

```bash
# Sudo installieren und weitere Vorbereitungen fuer die Installation
apt install sudo -y
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip git

# Repo (falls noch nicht vorhanden) nach /home/neofab/projects/neofab-scanlab holen
adduser neofab               # falls Benutzer noch nicht existiert
sudo -u neofab mkdir -p /home/neofab/projects
sudo -u neofab git clone https://github.com/know-how-schmiede/NeoFab-ScanLab.git /home/neofab/projects/neofab-scanlab

# Ausfuehrbar machen
chmod +x /home/neofab/projects/neofab-scanlab/scripts/setupNeoFabScanLab.sh
chmod +x /home/neofab/projects/neofab-scanlab/scripts/setupNeoFabScanLabService.sh
chmod +x /home/neofab/projects/neofab-scanlab/scripts/updateNeoFabScanLabService.sh

# Basis-Setup und Test-Run (interaktiv, startet den Flask-Testserver optional im Terminal)
sudo bash /home/neofab/projects/neofab-scanlab/scripts/setupNeoFabScanLab.sh

# Wenn alles passt: als Service (Gunicorn + systemd) einrichten
sudo bash /home/neofab/projects/neofab-scanlab/scripts/setupNeoFabScanLabService.sh

# NeoFab-ScanLab als Service aktualisieren
sudo bash /home/neofab/projects/neofab-scanlab/scripts/updateNeoFabScanLabService.sh
```

## Hinweis

- Alle drei Skripte muessen als `root` bzw. per `sudo` laufen, weil Benutzer angelegt, Pakete installiert und systemd-Dateien geschrieben werden.
- `setupNeoFabScanLab.sh` fragt dich nach User, Installationspfad, Git-Branch und Test-Port und kann den Dev-Server direkt im Terminal starten.
- Zu Beginn der Skripte werden einige Werte abgefragt. Mit einfachem Return werden die Standard-Einstellungen uebernommen.
- `setupNeoFabScanLabService.sh` setzt auf der Basisinstallation auf und erstellt den systemd-Dienst unter `/etc/systemd/system/<name>.service`.
- `updateNeoFabScanLabService.sh` holt den aktuellen Stand aus GitHub, installiert neue Abhaengigkeiten, fuehrt einen Smoke-Test aus und startet den Dienst anschliessend neu.

## Installation auf Proxmox LXC-Container

Die in der NeoFab-Vorlage gezeigten Proxmox-Screenshots sind in diesem Repository aktuell nicht enthalten.
Die Skripte sind fuer einen frisch erstellten Debian-13-LXC-Container auf Proxmox ausgelegt.
