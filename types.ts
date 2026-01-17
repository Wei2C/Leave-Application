export enum LeaveType {
  ANNUAL = '年假 (Annual Leave)',
  SICK = '病假 (Sick Leave)',
  BIRTHDAY = '生日假 (Birthday Leave)'
}

export enum DurationType {
  FULL_DAY = '整天 (Full Day)',
  HALF_DAY = '半天 (Half Day)',
  HOURS = '選小時 (Hourly)'
}

export interface LeaveRequest {
  type: LeaveType | null;
  dates: Date[];
  durationType: DurationType;
  halfDayPeriod: 'AM' | 'PM';
  startHour: string;
  endHour: string;
}

export const MANAGER_EMAIL = "we.cheng@elsevier.com";
export const USER_NAME = "Maggie";