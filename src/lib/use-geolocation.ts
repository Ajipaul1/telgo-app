import { useEffect, useState } from "react";

export type GeolocationState = {
  permission: "prompt" | "granted" | "denied";
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
};

export function useGeolocation() {
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

    navigator.permissions.query({ name: "geolocation" }).then((permissionStatus) => {
      const handlePermissionChange = () => {
        setState((s) => ({ ...s, permission: permissionStatus.state }));
      };

      setState((s) => ({ ...s, permission: permissionStatus.state }));
      permissionStatus.onchange = handlePermissionChange;

      if (permissionStatus.state === "granted") {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setState((s) => ({ ...s, position, error: null }));
          },
          (error) => {
            setState((s) => ({ ...s, error }));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }

      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
        permissionStatus.onchange = null;
      };
    });
  }, []);

  const requestPermission = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState((s) => ({ ...s, position, permission: 'granted', error: null }));
            },
            (error) => {
                if(error.code === error.PERMISSION_DENIED) {
                    setState((s) => ({ ...s, permission: 'denied', error }));
                }
            }
        );
    }
  };

  return { ...state, requestPermission };
}
