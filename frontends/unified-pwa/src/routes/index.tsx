import { createBrowserRouter, Navigate } from 'react-router-dom';
import LandingPage from '../modules/landing/pages/LandingPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import TrackerPage from '../modules/dashboard/pages/TrackerPage';
import { JobPostingPage } from '../modules/jobs/pages/JobPostingPage';
import { WorkerSearchPage } from '../modules/search/pages/WorkerSearchPage';
import ApplicationManagementPage from '../modules/jobs/pages/ApplicationManagementPage';
import { WorkerProfilePage } from '../modules/search/pages/WorkerProfilePage';
import { SavedProfilesPage } from '../modules/search/pages/SavedProfilesPage';
import JobSearchPage from '../modules/jobs/pages/JobSearchPage';
import JobDetailPage from '../modules/jobs/pages/JobDetailPage';
import AppliedJobsPage from '../modules/jobs/pages/AppliedJobsPage';
import { SavedJobsPage } from '../modules/jobs/pages/SavedJobsPage';
import { LevelDetailsPage } from '../modules/profile/pages/LevelDetailsPage';
import { IdentityVerificationPage } from '../modules/profile/pages/IdentityVerificationPage';
import { SignInPage } from '../modules/auth/pages/SignInPage';
import { SignUpPage } from '../modules/auth/pages/SignUpPage';
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../modules/auth/pages/ResetPasswordPage';
import OnboardingPage from '../modules/profile/pages/OnboardingPage';
import ProfilePage from '../modules/profile/pages/ProfilePage';
import NotificationsPage from '../modules/dashboard/pages/NotificationsPage';
import { SettingsPage } from '../modules/settings/pages/SettingsPage';
import TermsPage from '../modules/landing/pages/TermsPage';
import PrivacyPage from '../modules/landing/pages/PrivacyPage';
import NotFoundPage from '../modules/landing/pages/NotFoundPage';

import { AdminLoginPage } from '../modules/admin/pages/AdminLoginPage';
import { AdminLayout } from '../modules/admin/layouts/AdminLayout';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { AdminVerificationsPage } from '../modules/admin/pages/AdminVerificationsPage';
import { AdminUsersPage } from '../modules/admin/pages/AdminUsersPage';
import { AdminJobsPage } from '../modules/admin/pages/AdminJobsPage';
import { AdminLeadsPage } from '../modules/admin/pages/AdminLeadsPage';
import { AdminBlogPage } from '../modules/admin/pages/AdminBlogPage';
import { AdminBlogEditorPage } from '../modules/admin/pages/AdminBlogEditorPage';
import { BlogListingPage } from '../modules/blog/pages/BlogListingPage';
import { BlogPostPage } from '../modules/blog/pages/BlogPostPage';

import AppLayout from '../layouts/AppLayout';
import RootLayout from '../layouts/RootLayout';
import ProtectedRoute from '../layouts/ProtectedRoute';

import RoleGuard from '../layouts/RoleGuard';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/admin/login',
        element: <AdminLoginPage />,
      },
      {
        path: '/sign-in/*',
        element: <SignInPage />,
      },
      {
        path: '/sign-up/*',
        element: <SignUpPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: '/terms',
        element: <TermsPage />,
      },
      {
        path: '/privacy',
        element: <PrivacyPage />,
      },
      {
        path: '/blog',
        element: <BlogListingPage />,
      },
      {
        path: '/blog/:slug',
        element: <BlogPostPage />,
      },
      {
        path: '/blog/category/:slug',
        element: <BlogListingPage />,
      },
      {
        path: '/onboarding',
        element: (
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/onboarding/worker',
        element: (
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/onboarding/employer',
        element: (
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/verify-identity',
        element: (
          <ProtectedRoute>
            <IdentityVerificationPage />
          </ProtectedRoute>
        ),
      },
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          /* Employer Specific Routes (Protected by RoleGuard) */
          {
            element: <RoleGuard allowedRoles={['EMPLOYER']} />,
            children: [
              {
                path: '/dashboard',
                element: <DashboardPage />,
              },
              {
                path: '/post-job',
                element: <JobPostingPage />,
              },
              {
                path: '/jobs',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/jobs/:jobId',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/jobs/:jobId/applicants',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/dashboard/employer/jobs',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/dashboard/employer/jobs/:jobId',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/dashboard/employer/jobs/:jobId/applicants',
                element: <ApplicationManagementPage />,
              },
              {
                path: '/find-workers',
                element: <WorkerSearchPage />,
              },
              {
                path: '/saved-profiles',
                element: <SavedProfilesPage />,
              },
            ]
          },

          /* Worker Specific Routes (Protected by RoleGuard) */
          {
            element: <RoleGuard allowedRoles={['WORKER']} />,
            children: [
              {
                path: '/tracker',
                element: <TrackerPage />,
              },
              {
                path: '/search',
                element: <JobSearchPage />,
              },
              {
                path: '/saved-jobs',
                element: <SavedJobsPage />,
              },
              {
                path: '/applied-jobs',
                element: <AppliedJobsPage />,
              },
              {
                path: '/tests',
                element: <Navigate to="/level" replace />,
              },
              {
                path: '/level',
                element: <LevelDetailsPage />,
              },
              {
                path: '/profile/level-details',
                element: <LevelDetailsPage />,
              },
            ]
          },

          /* Shared Authenticated Routes (Accessible to both Worker & Employer) */
          {
            path: '/job/:id',
            element: <JobDetailPage />,
          },
          {
            path: '/jobs/:id',
            element: <JobDetailPage />,
          },
          {
            path: '/worker/:id',
            element: <WorkerProfilePage />,
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/settings',
            element: <SettingsPage />,
          },
          {
            path: '/notifications',
            element: <NotificationsPage />,
          },
        ],
      },
      /* Protected Admin Routes (Using AdminLayout & RoleGuard) */
      {
        path: '/admin',
        element: (
          <ProtectedRoute>
            <RoleGuard allowedRoles={['ADMIN']} />
          </ProtectedRoute>
        ),
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <Navigate to="/admin/dashboard" replace />,
              },
              {
                path: 'dashboard',
                element: <AdminDashboardPage />,
              },
              {
                path: 'leads',
                element: <AdminLeadsPage />,
              },
              {
                path: 'verifications',
                element: <AdminVerificationsPage />,
              },
              {
                path: 'users',
                element: <AdminUsersPage />,
              },
              {
                path: 'jobs',
                element: <AdminJobsPage />,
              },
              {
                path: 'blog',
                element: <AdminBlogPage />,
              },
              {
                path: 'blog/new',
                element: <AdminBlogEditorPage />,
              },
              {
                path: 'blog/:id/edit',
                element: <AdminBlogEditorPage />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
