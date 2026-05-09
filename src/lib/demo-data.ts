import type { Activity, Alert, Approval, ChatMessage, Engineer, Project } from "@/lib/types";

export const asset = (name: string) => `/assets/${name}`;

export const projects: Project[] = [
  {
    id: "cial-33kv",
    code: "TLGO-PRJ-2025-0148",
    name: "CIAL 33kV UG Cable Laying",
    type: "UG Cable Laying",
    location: "Kozhikode, Kerala",
    client: "CIAL - Calicut International Airport Ltd.",
    image: asset("cial-33kv-cable-laying.webp"),
    status: "On Track",
    progress: 72,
    budget: 24500000,
    spent: 16845780,
    totalLengthKm: 8.65,
    completedKm: 6.23,
    startDate: "Mar 10, 2025",
    endDate: "May 30, 2025",
    manager: "Vishnu Prasad",
    siteInCharge: "Arjun Nair",
    coordinates: [75.7873, 11.2588],
    accent: "violet"
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
    site: "CIAL 33kV UG Cable Laying",
    location: "Kozhikode, Kerala",
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
    title: "Arjun Nair uploaded 5 photos",
    subtitle: "CIAL 33kV UG Cable Laying",
    time: "08:35 AM",
    tone: "green"
  },
  {
    id: "a2",
    icon: "ReceiptIndianRupee",
    title: "Finance request #FR-125 approved",
    subtitle: "By Anitha R. (Finance Manager)",
    time: "08:29 AM",
    tone: "violet",
    amount: "₹12,500"
  },
  {
    id: "a3",
    icon: "Users",
    title: "Attendance marked at Panangad HDD",
    subtitle: "8 members marked attendance",
    time: "08:15 AM",
    tone: "blue"
  },
  {
    id: "a4",
    icon: "TriangleAlert",
    title: "Low fuel alert for Machine HDD-02",
    subtitle: "Panangad HDD",
    time: "07:50 PM",
    tone: "red"
  }
];

export const alerts: Alert[] = [
  {
    id: "alert-1",
    title: "Machine Breakdown",
    project: "CIAL 33kV UG Cable Laying",
    location: "Thrissur, Kerala",
    severity: "Critical",
    detail: "Cable laying machine is not operational. Work has been stopped.",
    time: "10 min ago"
  },
  {
    id: "alert-2",
    title: "Safety Incident Reported",
    project: "Poonjar 110kV Line Upgrade",
    location: "Kottayam, Kerala",
    severity: "Critical",
    detail: "Worker reported a minor injury. Medical assistance provided.",
    time: "25 min ago"
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
    project: "CIAL 33kV UG Cable Laying",
    location: "Kozhikode, Kerala",
    meta: "Today, 08:15 AM · Clock In",
    status: "Pending",
    range: "Out of Range +320m"
  },
  {
    id: "fin-1",
    category: "Finance",
    requester: "Arjun Nair",
    project: "CIAL 33kV UG Cable Laying",
    amount: 18450,
    meta: "Today, 11:30 AM · Travel & Food",
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
