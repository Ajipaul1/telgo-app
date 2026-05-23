import { useEffect, useState } from "react";
import { useOpsStore } from "@/store/ops-store";

export type GeolocationState = {
  permission: "prompt" | "granted" | "denied";
  position: any | null;
  error: any | null;
};

export function useGeolocation() {
  const setLiveLocation = useOpsStore((state) => state.setLiveLocation);
  const [state, setState] = useState<GeolocationState>({
    permission: "prompt",
    position: null,
    error: null,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    let watchId: number;

    const requestPermissionDirect = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const serializedPos = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          };
          setState((s) => ({ ...s, position: serializedPos, permission: "granted", error: null }));
          setLiveLocation({ position: serializedPos, permission: "granted", error: null });
        },
        (error) => {
          const serializedErr = { code: error.code, message: error.message };
          if (error.code === error.PERMISSION_DENIED) {
            setState((s) => ({ ...s, permission: "denied", error: serializedErr }));
            setLiveLocation({ position: null, permission: "denied", error: serializedErr });
          } else {
            setState((s) => ({ ...s, error: serializedErr }));
            setLiveLocation({ position: null, permission: "prompt", error: serializedErr });
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const serializedPos = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          };
          setState((s) => ({ ...s, position: serializedPos, permission: "granted", error: null }));
          setLiveLocation({ position: serializedPos, permission: "granted", error: null });
        },
        (error) => {
          const serializedErr = { code: error.code, message: error.message };
          if (error.code === error.PERMISSION_DENIED) {
            setState((s) => ({ ...s, permission: "denied", error: serializedErr }));
            setLiveLocation({ position: null, permission: "denied", error: serializedErr });
          } else {
            setState((s) => ({ ...s, error: serializedErr }));
            setLiveLocation({ position: null, permission: "prompt", error: serializedErr });
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    const queryPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          
          setState((s) => ({ ...s, permission: permissionStatus.state as GeolocationState["permission"] }));
          
          permissionStatus.onchange = () => {
            setState((s) => ({ ...s, permission: permissionStatus.state as GeolocationState["permission"] }));
            if (permissionStatus.state === "granted") {
              startWatching();
            }
          };

          if (permissionStatus.state === "granted") {
            startWatching();
          }
          // Do NOT call requestPermissionDirect() on mount when state is "prompt"
          // to adhere to strict browser/PWA policies requiring user gesture
        }
      } catch {
        // Fallback for query error - do not auto-request to prevent mount-time crashes
      }
    };

    queryPermission();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [setLiveLocation]);

  const requestPermission = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const serializedPos = {
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        };
        setState((s) => ({ ...s, position: serializedPos, permission: "granted", error: null }));
        setLiveLocation({ position: serializedPos, permission: "granted", error: null });
      },
      (error) => {
        const serializedErr = { code: error.code, message: error.message };
        if (error.code === error.PERMISSION_DENIED) {
          setState((s) => ({ ...s, permission: "denied", error: serializedErr }));
          setLiveLocation({ position: null, permission: "denied", error: serializedErr });
          alert("Location access denied. Please allow location permissions in your browser or application settings to proceed.");
        } else {
          setState((s) => ({ ...s, error: serializedErr }));
          setLiveLocation({ position: null, permission: "prompt", error: serializedErr });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return { ...state, requestPermission };
}
