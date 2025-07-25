# WorkNow Project Structure

## Root Directory
- `package.json` - Main package configuration
- `package-lock.json` - Locked dependencies
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.server.json` - Server TypeScript configuration
- `docker-compose.yml` - Docker Compose configuration (UPDATED to reference docker/Dockerfile.dev, include environment variables, support .env.local, and add memory limits)
- `setup-env.js` - Environment setup script
- `.env.local` - Frontend environment variables (VITE_*) (NEW)

## Docker Directory
- `docker/Dockerfile` - Production Docker configuration (UPDATED with proper paths)
- `docker/Dockerfile.dev` - Development Docker configuration (UPDATED with environment variables, proper paths, Alpine Linux base, OpenSSL installation, and .env.local support)
- `docker/setup-env.sh` - Docker environment setup script (NEW)
- `docker/setup-env-local.sh` - Frontend environment setup script (NEW)

## GitHub Workflows
- `.github/workflows/docker-image.yml` - Docker CI/CD workflow (UPDATED to reference docker/Dockerfile)

## Apps Directory
### apps/client/
- `index.html` - Main HTML entry point
      - `src/` - React application source code
      - `components/` - Reusable UI components
          - `Navbar.jsx` - Navigation panel (UPDATED to hide mail icon when user is not logged in)
          - `JobCard.jsx` - Job card component (UPDATED with new premium color, image display, debugging, fixed glance animation to only show during upload, and uses ImageModal component)
    - `UserJobs.jsx` - User job listings component (UPDATED with new premium color, image display, debugging, fixed glance animation to only show during upload, loading progress, authentication token handling for delete and boost operations, and uses ImageModal component)
      - `UserProfile.jsx` - User profile component (UPDATED with loading progress)
      - `PremiumPage.jsx` - Premium pricing page (UPDATED with user sync and test mode price IDs)
      - `ui/ImageUpload.jsx` - Image upload component (UPDATED with useEffect for prop changes and S3 image deletion functionality)
      - `ui/ImageModal.jsx` - Reusable image modal component for displaying images in modal
      - `ui/ProgressBar.jsx` - Progress bar component for loading states (NEW)
      - `form/JobForm.jsx` - Job creation form (UPDATED with image upload, loading progress, submit button with loading state, and publish button text)
      - `form/EditJobForm.jsx` - Job editing form (UPDATED with authentication token handling and user authorization)
      - `form/JobFormFields.jsx` - Job form fields (UPDATED with image upload field and loading state for submit button)
      - `form/EditJobForm.jsx` - Job editing form (UPDATED with image upload, loading progress, and submit button with loading state)
      - `form/EditJobFields.jsx` - Job edit form fields (UPDATED with image upload field)
    - `contexts/ImageUploadContext.jsx` - Image upload context (NEW)
    - `contexts/LoadingContext.jsx` - Loading state management context (NEW)
          - `hooks/` - Custom React hooks
        - `useUpdateJobs.js` - Job update hooks (UPDATED with imageUrl support and loading progress)
        - `useUserSync.js` - User synchronization hook (NEW)
        - `useLoadingProgress.js` - Loading progress management hook (NEW)
        - `useJobs.js` - Job fetching hook (UPDATED with loading progress)
    - `pages/` - Application pages
      - `Seekers.jsx` - Job seekers listing page (UPDATED with loading progress and React Helmet for SEO)
      - `SeekerDetails.jsx` - Seeker details page (UPDATED with loading progress, fixed API URL for logged out users, and React Helmet for SEO)
    - `index.css` - Global styles (UPDATED with new premium color scheme)
- `dist/` - Built frontend assets

### apps/api/
      - `index.js` - Main server entry point (UPDATED with upload routes, CORS configuration, static image serving, test endpoints, database debugging, production static file serving, security headers, proper route ordering, API error handling, improved CSP for development, static file serving for development mode, and fixed route order for API endpoints)
- `cron-jobs.js` - Automated task scheduling
- `controllers/` - Request handlers
  - `messages.js` - Messages controller (UPDATED with reduced logging to prevent spam)
  - `jobsController.js` - Jobs controller (UPDATED with proper user authentication and clerkUserId extraction for create, update, and delete operations)
- `routes/` - API route definitions
        - `upload.js` - Image upload routes (UPDATED with full URL generation and debugging)
        - `jobs.js` - Job routes (UPDATED with authentication middleware and proper user extraction)
- `services/` - Business logic layer
  - `jobCreateService.js` - Job creation service (UPDATED with image support and debugging)
  - `editFormService.js` - Job editing service (UPDATED with image support and user authorization check)
  - `jobDeleteService.js` - Job deletion service (UPDATED with user authorization check and S3 image cleanup)
  - `getJobService.js` - Job fetching service (UPDATED with user and imageUrl support and debugging)
  - `getJobById.js` - Job fetching service (UPDATED with user and imageUrl support)
  - `jobService.js` - Job service (UPDATED with reduced logging)
  - `userService.js` - User service (UPDATED with reduced logging)
- `middlewares/` - Express middlewares
  - `auth.js` - Authentication middleware (UPDATED with JWT token decoding and user extraction for development)
- `utils/` - Utility functions
  - `upload.js` - File upload configuration (NEW)
- `config/` - Configuration files

## Other Directories
- `libs/` - Shared utility libraries
- `prisma/` - Database schema and migrations
  - `public/` - Static assets and locales
    - `locales/` - Translation files
          - `ru/translation.json` - Russian translations (UPDATED with note premium message, publish button text, publishing loading state, and image deletion messages)
    - `en/translation.json` - English translations (UPDATED with note premium message, publish button text, publishing loading state, and image deletion messages)
    - `he/translation.json` - Hebrew translations (UPDATED with note premium message, publish button text, publishing loading state, image deletion messages, and complete image upload translations)
    - `ar/translation.json` - Arabic translations (UPDATED with note premium message, publish button text, publishing loading state, image deletion messages, and complete image upload translations)
- `tests/` - Test files
- `tools/` - Development and utility scripts 