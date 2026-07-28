#!/usr/bin/env python3
"""
Casefile Builder — Local Server
Serves static files and proxies image uploads to uploadimgur.com.

Usage:
    python server.py

Opens http://localhost:5000/index.html automatically.
"""

import http.server
import json
import os
import sys
import webbrowser
import threading

try:
    import requests
except ImportError:
    print("\n  ✗ ERROR: 'requests' module required.")
    print("    Install with: pip install requests\n")
    sys.exit(1)

PORT = 5000
UPLOAD_URL = "https://uploadimgur.com/api/upload"


class CasefileHandler(http.server.SimpleHTTPRequestHandler):
    """Serves static files + proxies /api/upload to uploadimgur.com."""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_POST(self):
        """Proxy upload requests to uploadimgur.com."""
        if self.path == '/api/upload':
            content_type = self.headers.get('Content-Type', '')
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                resp = requests.post(
                    UPLOAD_URL,
                    data=body,
                    headers={'Content-Type': content_type},
                    timeout=30,
                )

                self.send_response(resp.status_code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(resp.content)

                # Log result
                try:
                    data = resp.json()
                    if 'link' in data:
                        print(f"  ✓ Uploaded → {data['link']}")
                    else:
                        print(f"  ✗ Upload response: {data}")
                except Exception:
                    pass

            except Exception as e:
                error_msg = str(e)
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': error_msg}).encode())
                print(f"  ✗ Upload error: {error_msg}")
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"Not found"}')

    def log_message(self, format, *args):
        # Quieter logging — only show requests, not every detail
        msg = format % args
        if 'GET' in msg or 'POST' in msg:
            print(f"  [{self.log_date_time_string()}] {msg}")


def main():
    # Change to the script's directory so static files are served correctly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    server = http.server.HTTPServer(('0.0.0.0', PORT), CasefileHandler)

    print()
    print("  ═══════════════════════════════════════════════════")
    print("  ▸ CASEFILE SERVER RUNNING")
    print(f"  ▸ http://localhost:{PORT}/index.html")
    print("  ▸ Press Ctrl+C to stop")
    print("  ═══════════════════════════════════════════════════")
    print()

    # Auto-open browser after a short delay
    threading.Timer(0.8, lambda: webbrowser.open(f'http://localhost:{PORT}/index.html')).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  ▸ SERVER STOPPED\n")
        server.server_close()


if __name__ == '__main__':
    main()
