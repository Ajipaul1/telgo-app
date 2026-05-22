import { useEffect, useState } from "react";
import { useOpsStore } from "@/store/ops-store";

export type GeolocationState = {
  permission: "prompt" | "granted" | "denied";
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
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
          setState((s) => ({ ...s, position, permission: "granted", error: null }));
          setLiveLocation({ position, permission: "granted", error: null });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setState((s) => ({ ...s, permission: "denied", error }));
            setLiveLocation({ position: null, permission: "denied", error });
          } else {
            setState((s) => ({ ...s, error }));
            setLiveLocation({ position: null, permission: "prompt", error });
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setState((s) => ({ ...s, position, permission: "granted", error: null }));
          setLiveLocation({ position, permission: "granted", error: null });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setState((s) => ({ ...s, permission: "denied", error }));
            setLiveLocation({ position: null, permission: "denied", error });
          } else {
            setState((s) => ({ ...s, error }));
            setLiveLocation({ position: null, permission: "prompt", error });
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
          } else if (permissionStatus.state === "prompt") {
            requestPermissionDirect();
          }
        } else {
          // Standard fallback
          requestPermissionDirect();
          startWatching();
        }
      } catch {
        // Fallback for query error
        requestPermissionDirect();
        startWatching();
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
        setState((s) => ({ ...s, position, permission: "granted", error: null }));
        setLiveLocation({ position, permission: "granted", error: null });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState((s) => ({ ...s, permission: "denied", error }));
          setLiveLocation({ position: null, permission: "denied", error });
          alert("Location access denied. Please allow location permissions in your browser or application settings to proceed.");
        } else {
          setState((s) => ({ ...s, error }));
          setLiveLocation({ position: null, permission: "prompt", error });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return { ...state, requestPermission };
}
