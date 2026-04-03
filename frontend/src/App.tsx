import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./routes/calendar/CalendarPage";
import { StudyRoomCreatePage } from "./pages/study-room/StudyRoomCreatePage";
import { StudyRoomJoinPage } from "./pages/study-room/StudyRoomJoinPage";
import { StudyRoomPage } from "./pages/study-room/StudyRoomPage";
import { OnboardingPage } from "./pages/onboarding/OnboardingPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { SelfStudyPage } from "./pages/SelfStudyPage";
import { ProgressPage } from "./pages/ProgressPage";
import { StudyDnaPage } from "./pages/StudyDnaPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SearchBuddyPage } from "./pages/SearchBuddyPage";
import { BuddyProfilePage } from "./pages/BuddyProfilePage";
import { BuddyArenaPage } from "./pages/BuddyArenaPage";
import { RequireOnboarding } from "./layout/RequireOnboarding";
import { RequireAuth } from "./layout/RequireAuth";
import { GameShellLayout } from "./layout/GameShellLayout";

function StudyRoomLayout() {
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<GameShellLayout />}>
          <Route element={<RequireOnboarding />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/self-study" element={<SelfStudyPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/study-dna" element={<StudyDnaPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/search" element={<SearchBuddyPage />} />
            <Route path="/search/profile/:id" element={<BuddyProfilePage />} />
            <Route path="/buddies" element={<BuddyArenaPage />} />
            <Route path="/study-room" element={<StudyRoomLayout />}>
              <Route index element={<StudyRoomCreatePage />} />
              <Route path="join" element={<StudyRoomJoinPage />} />
              <Route path=":roomId" element={<StudyRoomPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
