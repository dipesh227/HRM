import { UserRole } from "@/types";
import { LayoutDashboard, Users, Building, FileText, ClipboardList, Settings, LogOut } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

export const navItems: NavItem[] = [
  // HR Navigation
  {
    title: "HR Dashboard",
    href: "/hr",
    icon: LayoutDashboard,
    roles: [UserRole.HR],
  },
  {
    title: "Site Management",
    href: "/hr/sites",
    icon: Building,
    roles: [UserRole.HR],
  },
  {
    title: "Employee Approvals",
    href: "/hr/approvals",
    icon: ClipboardList,
    roles: [UserRole.HR],
  },
  {
    title: "Payroll Management",
    href: "/hr/payroll",
    icon: FileText,
    roles: [UserRole.HR],
  },
  {
    title: "Audit Logs",
    href: "/hr/audit",
    icon: Settings,
    roles: [UserRole.HR],
  },

  // Site Incharge Navigation
  {
    title: "Site Dashboard",
    href: "/site",
    icon: LayoutDashboard,
    roles: [UserRole.SITE_INCHARGE],
  },
  {
    title: "Employee Roster",
    href: "/site/employees",
    icon: Users,
    roles: [UserRole.SITE_INCHARGE],
  },

  // Employee Navigation
  {
    title: "My Salary Slips",
    href: "/employee",
    icon: FileText,
    roles: [UserRole.EMPLOYEE],
  },
];

export const logoutItem: NavItem = {
  title: "Logout",
  href: "#logout",
  icon: LogOut,
  roles: [UserRole.HR, UserRole.SITE_INCHARGE, UserRole.EMPLOYEE],
};