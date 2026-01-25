"use client";

import { useState, useEffect } from "react";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already been asked
    const asked = localStorage.getItem("notification-asked");
    const neverAsk = localStorage.getItem("notification-never-ask");

    if (!asked && !neverAsk && "Notification" in window) {
      // Show prompt after 5 seconds
      const timer = setTimeout(() => {
        if (Notification.permission === "default") {
          setShow(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    localStorage.setItem("notification-asked", "true");

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // Subscribe to push notifications
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const registration = await navigator.serviceWorker.ready;

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
            ),
          });

          // Send to server
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
        }
      }
    } catch (error) {
      console.error("Notification permission error:", error);
    }

    setShow(false);
  };

  const handleLater = () => {
    localStorage.setItem("notification-asked", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">🔔</div>
          <h3 className="text-xl font-bold mb-2">Bildirimleri Açın</h3>
          <p className="text-muted-foreground text-sm">
            Yeni haberlerden anında haberdar olmak ister misiniz? Önemli
            gelişmeleri kaçırmayın!
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleEnable}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
          >
            Bildirimleri Aç
          </button>
          <button
            onClick={handleLater}
            className="w-full px-4 py-3 border rounded-md hover:bg-muted transition-colors"
          >
            Daha Sonra
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="dont-show-again"
            onChange={(e) => {
              if (e.target.checked) {
                localStorage.setItem("notification-never-ask", "true");
              }
            }}
            className="rounded"
          />
          <label
            htmlFor="dont-show-again"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Bir daha gösterme
          </label>
        </div>
      </div>
    </div>
  );
}

// Helper function
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}
