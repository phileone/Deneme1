import json
import os
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk
from datetime import datetime

import schedule

try:
    from plyer import notification
    PLYER_AVAILABLE = True
except ImportError:
    PLYER_AVAILABLE = False

REMINDERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reminders.json")


def load_reminders():
    if os.path.exists(REMINDERS_FILE):
        try:
            with open(REMINDERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return []


def save_reminders(reminders):
    try:
        with open(REMINDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(reminders, f, ensure_ascii=False, indent=2)
    except IOError:
        pass


def fire_notification(message):
    if PLYER_AVAILABLE:
        try:
            notification.notify(
                title="Reminder",
                message=message,
                app_name="Reminder App",
                timeout=10,
            )
            return
        except Exception:
            pass
    # Fallback: use Windows msgbox via ctypes if plyer fails
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, message, "Reminder", 0x40)
    except Exception:
        pass


class ReminderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Reminder App")
        self.root.resizable(False, False)
        self.root.geometry("480x440")

        self.reminders = load_reminders()
        self._fired_once_ids = set()

        self._build_ui()
        self._refresh_list()
        self._start_scheduler()

    # ------------------------------------------------------------------ UI --

    def _build_ui(self):
        pad = dict(padx=8, pady=4)

        # --- Add reminder frame ---
        add_frame = ttk.LabelFrame(self.root, text="Add Reminder", padding=8)
        add_frame.pack(fill="x", padx=10, pady=(10, 4))

        ttk.Label(add_frame, text="Message:").grid(row=0, column=0, sticky="w", **pad)
        self.msg_var = tk.StringVar()
        ttk.Entry(add_frame, textvariable=self.msg_var, width=36).grid(
            row=0, column=1, columnspan=2, sticky="ew", **pad
        )

        ttk.Label(add_frame, text="Time (HH:MM):").grid(row=1, column=0, sticky="w", **pad)
        self.time_var = tk.StringVar(value=datetime.now().strftime("%H:%M"))
        ttk.Entry(add_frame, textvariable=self.time_var, width=10).grid(
            row=1, column=1, sticky="w", **pad
        )

        ttk.Label(add_frame, text="Repeat:").grid(row=2, column=0, sticky="w", **pad)
        self.repeat_var = tk.StringVar(value="once")
        repeat_frame = ttk.Frame(add_frame)
        repeat_frame.grid(row=2, column=1, columnspan=2, sticky="w", **pad)
        ttk.Radiobutton(repeat_frame, text="Once", variable=self.repeat_var, value="once").pack(side="left")
        ttk.Radiobutton(repeat_frame, text="Daily", variable=self.repeat_var, value="daily").pack(side="left", padx=(12, 0))

        ttk.Button(add_frame, text="Add Reminder", command=self._add_reminder).grid(
            row=3, column=0, columnspan=3, pady=(6, 2)
        )
        add_frame.columnconfigure(1, weight=1)

        # --- Active reminders frame ---
        list_frame = ttk.LabelFrame(self.root, text="Active Reminders", padding=8)
        list_frame.pack(fill="both", expand=True, padx=10, pady=4)

        cols = ("time", "repeat", "message")
        self.tree = ttk.Treeview(list_frame, columns=cols, show="headings", selectmode="browse", height=8)
        self.tree.heading("time", text="Time")
        self.tree.heading("repeat", text="Repeat")
        self.tree.heading("message", text="Message")
        self.tree.column("time", width=60, anchor="center", stretch=False)
        self.tree.column("repeat", width=55, anchor="center", stretch=False)
        self.tree.column("message", width=300)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        ttk.Button(self.root, text="Delete Selected", command=self._delete_selected).pack(pady=(2, 4))

        # --- Status bar ---
        self.status_var = tk.StringVar(value="Ready.")
        status_bar = ttk.Label(
            self.root, textvariable=self.status_var, relief="sunken", anchor="w"
        )
        status_bar.pack(fill="x", side="bottom", ipady=2, padx=2, pady=(0, 2))

    def _set_status(self, msg):
        self.status_var.set(f"{datetime.now().strftime('%H:%M:%S')}  {msg}")

    # --------------------------------------------------------- Reminder CRUD --

    def _add_reminder(self):
        message = self.msg_var.get().strip()
        time_str = self.time_var.get().strip()
        repeat = self.repeat_var.get()

        if not message:
            messagebox.showwarning("Missing field", "Please enter a reminder message.")
            return

        try:
            datetime.strptime(time_str, "%H:%M")
        except ValueError:
            messagebox.showwarning("Invalid time", "Time must be in HH:MM format (24-hour).")
            return

        reminder = {
            "id": int(time.time() * 1000),
            "message": message,
            "time": time_str,
            "repeat": repeat,
        }
        self.reminders.append(reminder)
        save_reminders(self.reminders)
        self._refresh_list()
        self.msg_var.set("")
        self._set_status(f"Reminder added: '{message}' at {time_str} ({repeat})")

    def _delete_selected(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showinfo("Nothing selected", "Select a reminder to delete.")
            return
        item_id = int(self.tree.item(selected[0], "tags")[0])
        self.reminders = [r for r in self.reminders if r["id"] != item_id]
        save_reminders(self.reminders)
        self._refresh_list()
        self._set_status("Reminder deleted.")

    def _refresh_list(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for r in self.reminders:
            self.tree.insert(
                "",
                "end",
                values=(r["time"], r["repeat"], r["message"]),
                tags=(str(r["id"]),),
            )

    # ----------------------------------------------------- Scheduler thread --

    def _start_scheduler(self):
        t = threading.Thread(target=self._scheduler_loop, daemon=True)
        t.start()

    def _scheduler_loop(self):
        while True:
            self._check_reminders()
            time.sleep(15)

    def _check_reminders(self):
        now = datetime.now().strftime("%H:%M")
        to_delete = []

        for r in list(self.reminders):
            if r["time"] == now and r["id"] not in self._fired_once_ids:
                self._fired_once_ids.add(r["id"])
                fire_notification(r["message"])
                self.root.after(0, lambda msg=r["message"]: self._set_status(f"Fired: '{msg}'"))

                if r["repeat"] == "once":
                    to_delete.append(r["id"])

        if to_delete:
            self.reminders = [r for r in self.reminders if r["id"] not in to_delete]
            save_reminders(self.reminders)
            self.root.after(0, self._refresh_list)

        # Allow daily reminders to fire again on the next day:
        # clear their ids from the fired cache once the minute has passed.
        if datetime.now().strftime("%H:%M") != now:
            daily_ids = {r["id"] for r in self.reminders if r["repeat"] == "daily"}
            self._fired_once_ids -= daily_ids


def main():
    root = tk.Tk()
    app = ReminderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
