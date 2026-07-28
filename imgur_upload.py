#!/usr/bin/env python3
import os
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox

try:
    import requests
except ImportError:
    import tkinter.messagebox as msg
    root = tk.Tk()
    root.withdraw()
    msg.showerror("Dependencies Missing", "The 'requests' module is required. Please install it using 'pip install requests'.")
    sys.exit(1)

UPLOAD_IMGUR_URL = "https://uploadimgur.com/api/upload"

class ImgurUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Imgur Uploader")
        self.root.geometry("400x200")
        self.root.resizable(False, False)
        
        # UI Elements
        self.lbl_status = tk.Label(root, text="Select an image to upload", font=("Helvetica", 10))
        self.lbl_status.pack(pady=10)
        
        self.btn_browse = tk.Button(root, text="Browse Image...", command=self.browse_file, width=20, height=2)
        self.btn_browse.pack(pady=5)
        
        self.url_var = tk.StringVar()
        self.entry_url = tk.Entry(root, textvariable=self.url_var, state='readonly', width=50)
        self.entry_url.pack(pady=10)
        
        self.btn_copy = tk.Button(root, text="Copy URL", command=self.copy_url, state=tk.DISABLED)
        self.btn_copy.pack()

    def browse_file(self):
        file_path = filedialog.askopenfilename(
            title="Select Image to Upload",
            filetypes=[("Image files", "*.png;*.jpg;*.jpeg;*.gif;*.bmp"), ("All files", "*.*")]
        )
        if file_path:
            self.lbl_status.config(text=f"Uploading {os.path.basename(file_path)}...")
            self.btn_browse.config(state=tk.DISABLED)
            self.btn_copy.config(state=tk.DISABLED)
            self.url_var.set("")
            
            # Run upload in a separate thread so GUI doesn't freeze
            threading.Thread(target=self.upload_image, args=(file_path,), daemon=True).start()

    def upload_image(self, file_path):
        try:
            with open(file_path, 'rb') as f:
                files = {'image': (os.path.basename(file_path), f)}
                response = requests.post(UPLOAD_IMGUR_URL, files=files)
            
            response.raise_for_status()
            data = response.json()
            
            if 'link' in data:
                self.on_upload_success(data['link'])
            else:
                self.on_upload_error(f"Upload successful, but no link returned.\n{data}")
                
        except Exception as e:
            self.on_upload_error(f"An error occurred:\n{str(e)}")

    def on_upload_success(self, url):
        self.lbl_status.config(text="Upload successful!")
        self.url_var.set(url)
        self.btn_browse.config(state=tk.NORMAL)
        self.btn_copy.config(state=tk.NORMAL)
        self.entry_url.config(state=tk.NORMAL) # Enable briefly to allow focus/selection if needed
        self.entry_url.config(state='readonly')

    def on_upload_error(self, error_msg):
        self.lbl_status.config(text="Upload failed.")
        self.btn_browse.config(state=tk.NORMAL)
        messagebox.showerror("Upload Error", error_msg)

    def copy_url(self):
        url = self.url_var.get()
        if url:
            self.root.clipboard_clear()
            self.root.clipboard_append(url)
            self.root.update()
            self.lbl_status.config(text="URL copied to clipboard!")

if __name__ == "__main__":
    root = tk.Tk()
    app = ImgurUploaderApp(root)
    
    # If a file was dragged onto the .exe or passed via CLI args
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        if os.path.isfile(image_path):
            # Give UI a moment to draw before starting upload
            root.after(500, lambda: app.upload_image(image_path))
            app.lbl_status.config(text=f"Uploading {os.path.basename(image_path)}...")
            app.btn_browse.config(state=tk.DISABLED)
            
    root.mainloop()
