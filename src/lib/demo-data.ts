import type { Activity, Alert, Approval, ChatMessage, Engineer, Project } from "@/lib/types";

export const asset = (name: string) => `/assets/${name}`;

export const projects: Project[] = [
  {
    id: "vadakkekotta-sn-cable",
    code: "TLGO-PRJ-2026-0201",
    name: "Vadakkekotta to SN Junction UG Cable Laying",
    type: "Underground Cable Corridor",
    location: "Tripunithura, Kochi, Kerala",
    client: "Kochi Metro Utility Corridor",
    image: asset("cial-33kv-cable-laying.webp"),
    status: "Active",
    progress: 30,
    budget: 12800000,
    spent: 4120000,
    totalLengthKm: 6,
    completedKm: 1.8,
    startDate: "15 May 2026",
    endDate: "30 Jul 2026",
    manager: "Aji Paul",
    siteInCharge: "Arjun Nair",
    coordinates: [76.34284445, 9.95378055],
    accent: "cyan",
    corridor: {
      startLabel: "Vadakkekotta Metro Station",
      endLabel: "SN Junction Metro Station",
      startCoordinates: [76.3395, 9.9528],
      endCoordinates: [76.3461889, 9.9547611],
      totalMeters: 6000,
      completedMeters: 1800,
      geofenceMeters: 150,
      progressUpdates: [
        {
          id: "vk-sn-update-1800m",
          label: "Cable laying live update",
          detail:
            "Underground cable laying has reached the first 1.8 km stretch between Vadakkekotta and SN Junction. Barricading and trench restoration continue alongside the corridor.",
          recordedAt: "15 May 2026 - 04:30 PM",
          metersCompleted: 1800
        }
      ]
    }
  },
  {
    id: "kolenchery-ernakulam-link",
    code: "TLGO-PRJ-2026-0202",
    name: "Kolenchery to Ernakulam Utility Link",
    type: "Power and Utility Ducting",
    location: "Kolenchery to Ernakulam, Kerala",
    client: "Urban Utility Distribution Wing",
    image: asset("xcmg-hdd-machine.webp"),
    status: "Active",
    progress: 40,
    budget: 9400000,
    spent: 3180000,
    totalLengthKm: 5,
    completedKm: 2,
    startDate: "10 May 2026",
    endDate: "18 Jul 2026",
    manager: "Sreejith P",
    siteInCharge: "Nikhil Raj",
    coordinates: [76.3893, 10.0027],
    accent: "green",
    corridor: {
      startLabel: "Kolenchery Junction",
      endLabel: "Ernakulam Utility Hub",
      startCoordinates: [76.4841, 10.0237],
      endCoordinates: [76.2982, 9.9819],
      totalMeters: 5000,
      completedMeters: 2000,
      geofenceMeters: 180,
      progressUpdates: [
        {
          id: "ke-link-2000m",
          label: "Two kilometer section completed",
          detail:
            "The first 2 km of the Kolenchery to Ernakulam link has been completed and the next duct pull sequence is ready for approval.",
          recordedAt: "15 May 2026 - 01:10 PM",
          metersCompleted: 2000
        }
      ]
    }
  },
  {
    id: "kannur-pwd-corridor",
    code: "TLGO-PRJ-2026-0203",
    name: "Kannur PWD Roadside Duct Corridor",
    type: "Roadside Utility Corridor",
    location: "Kannur Town, Kerala",
    client: "PWD Coordination Cell",
    image: asset("kseb-rdss-imperial-project.webp"),
    status: "Delayed",
    progress: 0,
    budget: 15600000,
    spent: 420000,
    totalLengthKm: 10,
    completedKm: 0,
    startDate: "12 May 2026",
    endDate: "28 Aug 2026",
    manager: "Anitha R.",
    siteInCharge: "Vishnu Prasad",
    coordinates: [75.3912, 11.8775],
    accent: "amber",
    corridor: {
      startLabel: "Kannur Bus Stand Junction",
      endLabel: "PWD Service Yard",
      startCoordinates: [75.3702, 11.8745],
      endCoordinates: [75.412, 11.8805],
      totalMeters: 10000,
      completedMeters: 0,
      geofenceMeters: 180,
      progressUpdates: [
        {
          id: "kannur-pwd-hold",
          label: "Permission hold",
          detail:
            "PWD permission is pending. Road opening, traffic diversion, and allied permission blockages are holding the corridor start until written clearance is received.",
          recordedAt: "15 May 2026 - 09:40 AM",
          metersCompleted: 0
        }
      ]
    }
  },
  {
    id: "kottayam-ring-main",
    code: "TLGO-PRJ-2026-0204",
    name: "Kottayam Ring Main Cable Upgrade",
    type: "Ring Main Strengthening",
    location: "Kottayam, Kerala",
    client: "Town Distribution Circle",
    image: asset("vembanad-backwater-crossing.webp"),
    status: "Active",
    progress: 21,
    budget: 7100000,
    spent: 1760000,
    totalLengthKm: 4.2,
    completedKm: 0.9,
    startDate: "14 May 2026",
    endDate: "05 Jul 2026",
    manager: "Sujith Kumar",
    siteInCharge: "Anand S",
    coordinates: [76.5318, 9.5907],
    accent: "violet",
    corridor: {
      startLabel: "Collectorate Junction",
      endLabel: "Nagampadam Sub Feeder",
      startCoordinates: [76.5213, 9.5916],
      endCoordinates: [76.5428, 9.5898],
      totalMeters: 4200,
      completedMeters: 900,
      geofenceMeters: 150,
      progressUpdates: [
        {
          id: "kottayam-progress-900m",
          label: "Feeder route progress",
          detail:
            "Cable trenching and ring main upgrade work has crossed the first 900 m inside the Kottayam alignment with inspection records uploaded.",
          recordedAt: "14 May 2026 - 06:15 PM",
          metersCompleted: 900
        }
      ]
    }
  },
  {
    id: "ernakulam-mg-road-duct",
    code: "TLGO-PRJ-2026-0205",
    name: "Ernakulam MG Road Service Duct Modernisation",
    type: "Service Duct Modernisation",
    location: "Ernakulam MG Road, Kerala",
    client: "Metro Commercial Utilities",
    image: asset("mannam-substation-commissioning.webp"),
    status: "Active",
    progress: 19,
    budget: 6200000,
    spent: 1290000,
    totalLengthKm: 3.2,
    completedKm: 0.6,
    startDate: "11 May 2026",
    endDate: "24 Jun 2026",
    manager: "Akhil Mathew",
    siteInCharge: "Jithin Jose",
    coordinates: [76.2877, 9.9743],
    accent: "blue",
    corridor: {
      startLabel: "MG Road North Access",
      endLabel: "South Commercial Stretch",
      startCoordinates: [76.2816, 9.9735],
      endCoordinates: [76.2939, 9.9748],
      totalMeters: 3200,
      completedMeters: 600,
      geofenceMeters: 130,
      progressUpdates: [
        {
          id: "mg-road-600m",
          label: "Urban ducting update",
          detail:
            "Initial service duct modernisation has reached 600 m, with traffic marshaling and business-side restoration progressing in sequence.",
          recordedAt: "15 May 2026 - 11:20 AM",
          metersCompleted: 600
        }
      ]
    }
  }
];

export const engineers: Engineer[] = [
  {
    id: "eng-arjun",
    name: "Arjun Nair",
    role: "Site Engineer",
    site: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Vadakkekotta Metro Station, Tripunithura",
    status: "Active",
    lastUpdate: "2 min ago",
    distance: "Within geofence",
    speed: "3.8 km/h",
    battery: 82,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "eng-nikhil",
    name: "Nikhil Raj",
    role: "Site Engineer",
    site: "Kolenchery to Ernakulam Utility Link",
    location: "Kolenchery Junction",
    status: "Moving",
    lastUpdate: "5 min ago",
    distance: "2.1 km covered today",
    speed: "5.2 km/h",
    battery: 69,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "eng-vishnu",
    name: "Vishnu Prasad",
    role: "Supervisor",
    site: "Kannur PWD Roadside Duct Corridor",
    location: "PWD Service Yard",
    status: "Idle",
    lastUpdate: "28 min ago",
    distance: "Permission hold",
    speed: "0 km/h",
    battery: 74,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "eng-anand",
    name: "Anand S",
    role: "Line Engineer",
    site: "Kottayam Ring Main Cable Upgrade",
    location: "Collectorate Junction",
    status: "Active",
    lastUpdate: "3 min ago",
    distance: "900 m completed",
    speed: "4.1 km/h",
    battery: 77,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "eng-jithin",
    name: "Jithin Jose",
    role: "Site Engineer",
    site: "Ernakulam MG Road Service Duct Modernisation",
    location: "MG Road North Access",
    status: "Moving",
    lastUpdate: "1 min ago",
    distance: "600 m completed",
    speed: "4.8 km/h",
    battery: 71,
    avatar: asset("telgo-logo-cropped.png")
  }
];

export const activities: Activity[] = [
  {
    id: "activity-1",
    icon: "Activity",
    title: "Vadakkekotta to SN Junction crossed 1.8 km completion",
    subtitle: "Daily corridor progress uploaded by site engineer",
    time: "04:30 PM",
    tone: "cyan",
    amount: "1.8 km ready"
  },
  {
    id: "activity-2",
    icon: "Users",
    title: "Kolenchery to Ernakulam marked 2 km complete",
    subtitle: "Updated for admin and client visibility",
    time: "01:10 PM",
    tone: "green"
  },
  {
    id: "activity-3",
    icon: "AlertTriangle",
    title: "Kannur corridor blocked by PWD permission hold",
    subtitle: "Permission note added to the project workspace",
    time: "09:40 AM",
    tone: "amber"
  },
  {
    id: "activity-4",
    icon: "Camera",
    title: "Ernakulam MG Road field photos uploaded",
    subtitle: "Restoration and service duct photo set synced to the project timeline",
    time: "03:05 PM",
    tone: "blue"
  }
];

export const alerts: Alert[] = [
  {
    id: "alert-1",
    title: "PWD permission pending",
    project: "Kannur PWD Roadside Duct Corridor",
    location: "Kannur Town, Kerala",
    severity: "High",
    detail:
      "Road opening, traffic diversion, and allied PWD permissions are still pending. Corridor start remains blocked until the formal clearance is received.",
    time: "25 min ago"
  },
  {
    id: "alert-2",
    title: "Live report follow-up pending",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Tripunithura, Kochi",
    severity: "Warning",
    detail:
      "The next corridor progress update is due from the site engineer after the 1.8 km completion mark.",
    time: "42 min ago"
  },
  {
    id: "alert-3",
    title: "Client document package due",
    project: "Kottayam Ring Main Cable Upgrade",
    location: "Kottayam, Kerala",
    severity: "Warning",
    detail:
      "Updated inspection and trench restoration package must be uploaded before tonight's client review.",
    time: "1 hr ago"
  }
];

export const approvals: Approval[] = [
  {
    id: "approval-1",
    category: "Attendance",
    requester: "Arjun Nair",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Vadakkekotta Metro Station",
    meta: "Today, 09:15 AM - Live attendance mark",
    status: "Pending",
    range: "Within corridor geofence"
  },
  {
    id: "approval-2",
    category: "Leave",
    requester: "Nikhil Raj",
    project: "Kolenchery to Ernakulam Utility Link",
    meta: "16 May 2026 - Personal leave request",
    status: "Pending"
  },
  {
    id: "approval-3",
    category: "Report",
    requester: "Jithin Jose",
    project: "Ernakulam MG Road Service Duct Modernisation",
    meta: "Daily restoration report package waiting for review",
    status: "Pending"
  }
];

export const chatMessages: ChatMessage[] = [
  {
    id: "chat-seed-1",
    author: "Arjun Nair",
    role: "Site Engineer",
    body: "Vadakkekotta trenching update is synced. First 1.8 km is ready for review.",
    time: "08:35 AM",
    tone: "blue",
    images: [asset("cial-33kv-cable-laying.webp")],
    reactions: 3
  },
  {
    id: "chat-seed-2",
    author: "Nikhil Raj",
    role: "Site Engineer",
    body: "Kolenchery to Ernakulam segment reached 2 km today. Waiting for the next duct pull window.",
    time: "10:15 AM",
    tone: "green",
    reactions: 2
  },
  {
    id: "chat-seed-3",
    author: "Vishnu Prasad",
    role: "Supervisor",
    body: "Kannur project remains on permission hold until the PWD approval letter is cleared.",
    time: "11:20 AM",
    tone: "amber",
    reactions: 1
  }
];

export const sitePhotos = [
  asset("cial-33kv-cable-laying.webp"),
  asset("hdd-cable-drum-transport.webp"),
  asset("xcmg-hdd-machine.webp"),
  asset("kseb-rdss-imperial-project.webp"),
  asset("mannam-substation-commissioning.webp"),
  asset("ashok-leyland-tanker.webp")
];
