"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleDigestAction } from "./actions";

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationPrefs({
  digestOptOut,
  vapidPublicKey,
  hasPushSubscription,
}: {
  digestOptOut: boolean;
  vapidPublicKey: string | null;
  hasPushSubscription: boolean;
}) {
  const [digestOff, setDigestOff] = useState(digestOptOut);
  const [pushState, setPushState] = useState<"idle" | "on" | "error">(hasPushSubscription ? "on" : "idle");
  const [pending, startTransition] = useTransition();

  const toggleDigest = () => {
    const next = !digestOff;
    setDigestOff(next);
    startTransition(() => toggleDigestAction(next));
  };

  const enablePush = async () => {
    if (!vapidPublicKey) return;
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setPushState(res.ok ? "on" : "error");
    } catch {
      setPushState("error");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={!digestOff}
          onChange={toggleDigest}
          disabled={pending}
          className="mt-1 accent-(--accent)"
        />
        <span>
          <span className="block text-sm font-medium">Digest hebdomadaire par email</span>
          <span className="block text-xs text-ink-muted">
            Un récap de vos notifications non lues, une fois par semaine.
          </span>
        </span>
      </label>

      <div>
        <p className="text-sm font-medium">Notifications push (navigateur)</p>
        {vapidPublicKey ? (
          pushState === "on" ? (
            <p className="mt-1 text-xs font-medium text-success">✓ Activées sur cet appareil.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-ink-muted">
                Recevez les événements importants même quand l&apos;onglet est fermé.
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={enablePush}>
                Activer sur cet appareil
              </Button>
              {pushState === "error" && (
                <p className="mt-1 text-xs text-danger">Activation impossible — vérifiez les permissions du navigateur.</p>
              )}
            </>
          )
        ) : (
          <p className="mt-1 rounded-(--radius-sm) bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
            DEFERRED_AWAITING_CREDENTIALS — clés VAPID non configurées par l&apos;opérateur (Console → Vault).
          </p>
        )}
      </div>
    </div>
  );
}
