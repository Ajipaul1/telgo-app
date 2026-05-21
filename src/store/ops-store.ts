      addShiftReport: async (report: Omit<ShiftReport, "id" | "createdAt">) => {
        const response = await fetch("/api/mobile/reports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(report),
        });

        if (!response.ok) {
          // Handle error
          return;
        }

        const data = await response.json();

        set((state) => ({
          shiftReports: [data, ...state.shiftReports],
        }));
      },
