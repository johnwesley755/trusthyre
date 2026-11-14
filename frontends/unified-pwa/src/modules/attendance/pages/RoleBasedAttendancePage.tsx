import React from 'react';
import { useUser } from '../../../providers/AuthContext';
import WorkerTodayShiftPage from './WorkerTodayShiftPage';
import EmployerShiftRegisterPage from './EmployerShiftRegisterPage';

export default function RoleBasedAttendancePage() {
  const { user } = useUser();
  const isEmployer = user?.role === 'EMPLOYER';

  if (isEmployer) {
    return <EmployerShiftRegisterPage />;
  }

  return <WorkerTodayShiftPage />;
}
