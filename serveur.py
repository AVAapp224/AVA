"""Serveur de test : affiche le site et relance la collecte toutes les 5 minutes.

Lancement : python3 serveur.py   puis ouvrir http://localhost:8080
Sur un iPhone connecté au même Wi-Fi : utiliser l'adresse « réseau » affichée au démarrage.
"""
import functools
import http.server
import os
import socket
import subprocess
import sys
import threading
import time

ICI = os.path.dirname(os.path.abspath(__file__))
COLLECTE = os.path.join(ICI, 'collecte', 'collecte.py')
DUREE_MAX_S = 240   # une collecte plus longue est arrêtée : un site trop lent ne bloque jamais l'app

PORT = int(os.environ.get('PORT', 8080))
INTERVALLE_MIN = 5


def collecter():
    try:
        r = subprocess.run([sys.executable, COLLECTE], cwd=os.path.dirname(COLLECTE), capture_output=True, text=True, timeout=DUREE_MAX_S)
        print(time.strftime('%H:%M'), (r.stdout.strip().splitlines() or ['collecte terminée'])[-1] if r.returncode == 0 else 'Collecte en erreur : ' + r.stderr.strip()[-300:], flush=True)
    except subprocess.TimeoutExpired:
        print(time.strftime('%H:%M'), 'Collecte trop longue, arrêtée. La suivante prendra le relais.', flush=True)


def boucle_collecte():
    while True:
        collecter()
        time.sleep(INTERVALLE_MIN * 60)


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # pendant les tests : toujours la dernière version du site et des données
        if self.path.startswith('/donnees/') or self.path.split('?')[0].endswith(('.html', '.css', '.js', '/')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


def adresse_reseau():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return None


if __name__ == '__main__':
    if not os.path.exists(os.path.join(ICI, 'donnees', 'actus.json')):
        print('Première collecte en cours (environ 30 secondes)…', flush=True)
        collecter()
    threading.Thread(target=boucle_collecte, daemon=True).start()
    serveur = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), functools.partial(Gestionnaire, directory=ICI))
    ip = adresse_reseau()
    print(f'Site prêt : http://localhost:{PORT}' + (f'  ·  sur ton iPhone (même Wi-Fi) : http://{ip}:{PORT}' if ip else ''), flush=True)
    serveur.serve_forever()
