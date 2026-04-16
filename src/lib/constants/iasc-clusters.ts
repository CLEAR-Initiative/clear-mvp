/**
 * IASC Global Clusters + cross-cutting Areas of Responsibility.
 *
 * Canonical source: OCHA Taxonomy as a Service, "Global Coordination Groups"
 * (https://vocabulary.unocha.org/). Three-letter codes follow OCHA/HPC usage.
 *
 * The 11 formal Global Clusters are flagged `isGlobalCluster: true`. Refugee
 * Response and Multi-purpose Cash are parallel/cross-cutting and flagged
 * false, but are included here because field teams treat them alongside
 * clusters when quantifying needs.
 */

import type { Icon } from "@tabler/icons-react";
import {
  IconHome2,
  IconDroplet,
  IconHeartHandshake,
  IconApple,
  IconBread,
  IconShieldExclamation,
  IconBook2,
  IconTent,
  IconTruck,
  IconAntenna,
  IconPlant2,
  IconUsersGroup,
  IconCash,
} from "@tabler/icons-react";

export type IASCClusterCode =
  | "SHL"
  | "WSH"
  | "HLT"
  | "NUT"
  | "FSL"
  | "PRO"
  | "EDU"
  | "CCM"
  | "LOG"
  | "ETC"
  | "ERY"
  | "REF"
  | "MPC";

export interface IASCCluster {
  code: IASCClusterCode;
  /** Full OCHA-preferred label. */
  label: string;
  /** Short label for chips/pills. Falls back to `label`. */
  shortLabel?: string;
  /** Cluster lead agency (or co-leads). */
  leadAgency: string;
  icon: Icon;
  /** True for the 11 formal IASC Global Clusters. */
  isGlobalCluster: boolean;
}

export const IASC_CLUSTERS: Record<IASCClusterCode, IASCCluster> = {
  SHL: { code: "SHL", label: "Shelter & NFI",                   shortLabel: "Shelter",   leadAgency: "IFRC / UNHCR",            icon: IconHome2,             isGlobalCluster: true  },
  WSH: { code: "WSH", label: "Water, Sanitation & Hygiene",     shortLabel: "WASH",      leadAgency: "UNICEF",                  icon: IconDroplet,           isGlobalCluster: true  },
  HLT: { code: "HLT", label: "Health",                                                   leadAgency: "WHO",                     icon: IconHeartHandshake,    isGlobalCluster: true  },
  NUT: { code: "NUT", label: "Nutrition",                                                leadAgency: "UNICEF",                  icon: IconApple,             isGlobalCluster: true  },
  FSL: { code: "FSL", label: "Food Security",                                            leadAgency: "WFP / FAO",               icon: IconBread,             isGlobalCluster: true  },
  PRO: { code: "PRO", label: "Protection",                                               leadAgency: "UNHCR",                   icon: IconShieldExclamation, isGlobalCluster: true  },
  EDU: { code: "EDU", label: "Education",                                                leadAgency: "UNICEF / Save the Children", icon: IconBook2,          isGlobalCluster: true  },
  CCM: { code: "CCM", label: "Camp Coordination & Management",  shortLabel: "CCCM",      leadAgency: "UNHCR / IOM",             icon: IconTent,              isGlobalCluster: true  },
  LOG: { code: "LOG", label: "Logistics",                                                leadAgency: "WFP",                     icon: IconTruck,             isGlobalCluster: true  },
  ETC: { code: "ETC", label: "Emergency Telecommunications",    shortLabel: "ETC",       leadAgency: "WFP",                     icon: IconAntenna,           isGlobalCluster: true  },
  ERY: { code: "ERY", label: "Early Recovery",                                           leadAgency: "UNDP",                    icon: IconPlant2,            isGlobalCluster: true  },
  REF: { code: "REF", label: "Refugee Response",                                         leadAgency: "UNHCR",                   icon: IconUsersGroup,        isGlobalCluster: false },
  MPC: { code: "MPC", label: "Multi-purpose Cash",              shortLabel: "Cash",      leadAgency: "CaLP / cluster-led",      icon: IconCash,              isGlobalCluster: false },
};

/** Canonical display order (clusters first, then cross-cutting). */
export const IASC_CLUSTER_ORDER: IASCClusterCode[] = [
  "SHL", "WSH", "HLT", "NUT", "FSL", "PRO", "EDU", "CCM", "LOG", "ETC", "ERY", "REF", "MPC",
];
