import type { Activity, Alert, Approval, ChatMessage, Engineer, Project } from "@/lib/types";

export const asset = (name: string) => `/assets/${name}`;

export const projects: Project[] = [
  {
    id: "vadakkekotta-sn-cable",
    code: "TLGO-PRJ-2026-0201",
    name: "Vadakkekotta to SN Junction UG Cable Laying",
    type: "Underground Cable Laying",
    location: "Tripunithura, Kochi, Kerala",
    client: "Kochi Metro Utility Corridor",
    image: asset("cial-33kv-cable-laying.webp"),
    status: "Active",
    progress: 25,
    budget: 6800000,
    spent: 1950000,
    totalLengthKm: 0.4,
    completedKm: 0.1,
    startDate: "May 15, 2026",
    endDate: "Jun 15, 2026",
    manager: "Aji Paul",
    siteInCharge: "Arjun Nair",
    coordinates: [76.34284445, 9.95378055],
    accent: "cyan",
    corridor: {
      startLabel: "Vadakkekotta Metro Station",
      endLabel: "SN Junction Metro Station",
      startCoordinates: [76.3395, 9.9528],
      endCoordinates: [76.3461889, 9.9547611],
      totalMeters: 400,
      completedMeters: 100,
      geofenceMeters: 120,
      progressUpdates: [
        {
          id: "vk-sn-progress-100m",
          label: "Daily laying progress",
          detail: "Underground cable laying completed for the first 100 meters from the Vadakkekotta side of the corridor.",
          recordedAt: "15 May 2026 · 04:30 PM",
          metersCompleted: 100
        }
      ]
    }
  },
  {
    id: "panangad-hdd",
    code: "TLGO-PRJ-2025-0112",
    name: "Panangad HDD Crossing",
    type: "HDD Drilling",
    location: "Ernakulam, Kerala",
    client: "Kerala Water Infra",
    image: asset("xcmg-hdd-machine.webp"),
    status: "On Track",
    progress: 83,
    budget: 16200000,
    spent: 12560000,
    totalLengthKm: 4.8,
    completedKm: 4.0,
    startDate: "Apr 02, 2025",
    endDate: "May 18, 2025",
    manager: "Sreejith P",
    siteInCharge: "Nikhil Raj",
    coordinates: [76.2673, 9.9312],
    accent: "cyan"
  },
  {
    id: "rdss-imperial",
    code: "TLGO-PRJ-2025-0094",
    name: "RDSS Imperial Commissioning",
    type: "Substation Work",
    location: "Thrissur, Kerala",
    client: "KSEB RDSS",
    image: asset("kseb-rdss-imperial-project.webp"),
    status: "At Risk",
    progress: 47,
    budget: 19800000,
    spent: 9632000,
    totalLengthKm: 11.2,
    completedKm: 5.3,
    startDate: "Apr 18, 2025",
    endDate: "Jun 25, 2025",
    manager: "Anitha R.",
    siteInCharge: "Vishnu P.",
    coordinates: [76.2144, 10.5276],
    accent: "green"
  },
  {
    id: "poonjar-110kv",
    code: "TLGO-PRJ-2025-0081",
    name: "Poonjar 110kV Line Upgradation",
    type: "Line Upgradation",
    location: "Kottayam, Kerala",
    client: "KSEB Transmission",
    image: asset("vembanad-backwater-crossing.webp"),
    status: "At Risk",
    progress: 35,
    budget: 15400000,
    spent: 8750000,
    totalLengthKm: 18.6,
    completedKm: 6.4,
    startDate: "Apr 28, 2025",
    endDate: "Jul 20, 2025",
    manager: "Sujith Kumar",
    siteInCharge: "Anandhu S",
    coordinates: [76.7784, 9.6727],
    accent: "amber"
  }
];

export const engineers: Engineer[] = [
  {
    id: "arjun",
    name: "Arjun Nair",
    role: "Site Engineer",
    site: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Vadakkekotta Metro Station, Tripunithura",
    status: "Active",
    lastUpdate: "2 min ago",
    distance: "Within Range",
    speed: "4.2 km/h",
    battery: 80,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "sujith",
    name: "Sujith Kumar",
    role: "Line Engineer",
    site: "Poonjar 110kV Upgrade",
    location: "Kottayam, Kerala",
    status: "Idle",
    lastUpdate: "18 min ago",
    distance: "Idle for 18m",
    speed: "0 km/h",
    battery: 65,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "vishnu",
    name: "Vishnu Prasad",
    role: "Project Manager",
    site: "RDSS Imperial Commissioning",
    location: "Alappuzha, Kerala",
    status: "Moving",
    lastUpdate: "1 min ago",
    distance: "Within Range",
    speed: "6.1 km/h",
    battery: 72,
    avatar: asset("telgo-logo-cropped.png")
  },
  {
    id: "nikhil",
    name: "Nikhil Raj",
    role: "Site Engineer",
    site: "Panangad HDD Crossing",
    location: "Ernakulam, Kerala",
    status: "Stagnant",
    lastUpdate: "52 min ago",
    distance: "Stagnant for 52m",
    speed: "0 km/h",
    battery: 48,
    avatar: asset("telgo-logo-cropped.png")
  }
];

export const activities: Activity[] = [
  {
    id: "a1",
    icon: "Camera",
    title: "Arjun Nair uploaded corridor progress photos",
    subtitle: "Vadakkekotta to SN Junction UG Cable Laying",
    time: "04:35 PM",
    tone: "green"
  },
  {
    id: "a2",
    icon: "Activity",
    title: "Daily laying update marked 100 m completed",
    subtitle: "Vadakkekotta Metro Station to SN Junction corridor",
    time: "04:30 PM",
    tone: "cyan",
    amount: "100 m ready"
  },
  {
    id: "a3",
    icon: "Users",
    title: "Attendance marked at Vadakkekotta access point",
    subtitle: "Crew reached start station geofence",
    time: "09:15 AM",
    tone: "blue"
  },
  {
    id: "a4",
    icon: "ReceiptIndianRupee",
    title: "Finance request #FR-201 raised",
    subtitle: "Barricading and corridor safety signage",
    time: "02:10 PM",
    tone: "violet",
    amount: "Rs 18,450"
  }
];

export const alerts: Alert[] = [
  {
    id: "alert-1",
    title: "Utility crossing review pending",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Tripunithura, Kochi, Kerala",
    severity: "High",
    detail: "Final underground utility crossing approval is pending before the next 150 m stretch can be opened.",
    time: "18 min ago"
  },
  {
    id: "alert-2",
    title: "Night barricading checklist pending",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "SN Junction approach, Tripunithura",
    severity: "Warning",
    detail: "Night shift barricading confirmation has not yet been uploaded for the station approach section.",
    time: "42 min ago"
  },
  {
    id: "alert-3",
    title: "Fuel Level Critical",
    project: "RDSS Imperial Commissioning",
    location: "Alappuzha, Kerala",
    severity: "High",
    detail: "Fuel level below 10% in generator. Refuel required immediately.",
    time: "45 min ago"
  },
  {
    id: "alert-4",
    title: "Heavy Rain Alert",
    project: "Multiple Sites",
    location: "Kerala",
    severity: "Warning",
    detail: "Heavy rainfall expected in several districts. Exercise caution.",
    time: "3 hrs ago"
  }
];

export const approvals: Approval[] = [
  {
    id: "att-1",
    category: "Attendance",
    requester: "Arjun Nair",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    location: "Vadakkekotta Metro Station, Tripunithura",
    meta: "Today, 09:15 AM - Clock In",
    status: "Pending",
    range: "Within Corridor Geofence"
  },
  {
    id: "fin-1",
    category: "Finance",
    requester: "Arjun Nair",
    project: "Vadakkekotta to SN Junction UG Cable Laying",
    amount: 18450,
    meta: "Today, 02:10 PM - Barricading and safety consumables",
    status: "Pending"
  },
  {
    id: "leave-1",
    category: "Leave",
    requester: "Nikhil Raj",
    project: "Site Engineer",
    meta: "May 15 - May 16, 2025 · Personal Work",
    status: "Pending"
  }
];

export const chatMessages: ChatMessage[] = [
  {
    id: "m1",
    author: "Arjun Nair",
    role: "Site Engineer",
    body: "Good morning team. Cable trenching completed from Palayam to West Hill.",
    time: "08:35 AM",
    tone: "blue",
    images: [
      asset("cial-33kv-cable-laying.webp"),
      asset("hdd-cable-drum-transport.webp"),
      asset("xcmg-hdd-machine.webp")
    ],
    reactions: 4
  },
  {
    id: "m2",
    author: "Sujith Kumar",
    role: "Line Engineer",
    body: "Duct jointing at West Hill in progress. ETA for completion 11:30 AM.",
    time: "08:42 AM",
    tone: "green",
    reactions: 2
  },
  {
    id: "m3",
    author: "Vishnu Prasad",
    role: "Project Manager",
    body: "Please ensure backfilling quality and update the measurements in site log.",
    time: "08:45 AM",
    tone: "amber",
    reactions: 3
  },
  {
    id: "m4",
    author: "Anitha R.",
    role: "Finance",
    body: "@Arjun Nair Fuel advance request of ₹5,000 approved. Ref: FIN-2025-146.",
    time: "09:02 AM",
    tone: "violet",
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
