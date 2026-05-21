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

    const requestPermission = () => {
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

    navigator.permissions.query({ name: "geolocation" }).then((permissionStatus) => {
      const handlePermissionChange = () => {
        setState((s) => ({ ...s, permission: permissionStatus.state }));
        if (permissionStatus.state === "granted") {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              setState((s) => ({ ...s, position, error: null }));
              setLiveLocation({ position, permission: "granted", error: null });
            },
            (error) => {
              setState((s) => ({ ...s, error }));
              setLiveLocation({ position: null, permission: "prompt", error });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      };

      setState((s) => ({ ...s, permission: permissionStatus.state }));
      permissionStatus.onchange = handlePermissionChange;

      if (permissionStatus.state === "granted") {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setState((s) => ({ ...s, position, error: null }));
            setLiveLocation({ position, permission: "granted", error: null });
          },
          (error) => {
            setState((s) => ({ ...s, error }));
            setLiveLocation({ position: null, permission: "prompt", error });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else if (permissionStatus.state === "prompt") {
        requestPermission();
      }

      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
        permissionStatus.onchange = null;
      };
    });
  }, [setLiveLocation]);

  const requestPermission = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((permissionStatus) => {
        if (permissionStatus.state === "denied") {
          // Explain why the permission is needed and guide the user to settings.
          // This part is tricky because browsers don't allow direct links to settings.
          alert(
            "Geolocation permission has been denied. Please enable it in your browser settings to use this feature."
          );
        } else {
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
            }
          );
        }
      });
    }
  };

  return { ...state, requestPermission };
}
