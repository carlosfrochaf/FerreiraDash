"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Verifica se notificações e service workers são suportados pelo navegador
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Registra o Service Worker local
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Verifica se já existe uma assinatura ativa
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.error("Erro ao registrar Service Worker / carregar assinatura:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function handleToggleNotifications() {
    if (!isSupported) return;
    setLoading(true);

    try {
      if (isSubscribed) {
        // --- CANCELAR ASSINATURA ---
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        
        if (sub) {
          // Cancela no navegador
          await sub.unsubscribe();
          
          // Remove do nosso banco de dados
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              unsubscribe: true,
            }),
          });
        }
        
        setIsSubscribed(false);
      } else {
        // --- CRIAR NOVA ASSINATURA ---
        // Solicita permissão se ainda não foi concedida
        let currentPermission = Notification.permission;
        if (currentPermission === "default") {
          currentPermission = await Notification.requestPermission();
          setPermission(currentPermission);
        }

        if (currentPermission !== "granted") {
          alert("Permissão de notificação negada. Por favor, habilite as notificações nas configurações do seu navegador.");
          setLoading(false);
          return;
        }

        if (!VAPID_PUBLIC_KEY) {
          alert("Chave VAPID pública não configurada no servidor.");
          setLoading(false);
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        
        // Subscreve com a chave VAPID pública convertida
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Salva a assinatura no nosso banco de dados
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });

        if (!res.ok) {
          throw new Error("Erro ao salvar assinatura no servidor.");
        }

        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Erro ao gerenciar assinatura push:", error);
      alert("Ocorreu um erro ao gerenciar as notificações de push.");
    } finally {
      setLoading(false);
    }
  }

  // Se o navegador não suportar notificações push, não renderiza o botão
  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={handleToggleNotifications}
      disabled={loading}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300 relative cursor-pointer",
        isSubscribed
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-md shadow-emerald-500/15 scale-[1.02]"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
      title={isSubscribed ? "Notificações de Celular Ativadas" : "Habilitar Notificações no Celular"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <>
          <Bell className="h-4 w-4 animate-swing" />
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </>
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </button>
  );
}
