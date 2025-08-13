"use client";

import LandingPage from "@/components/landing-page";
import { useRouter } from "next/navigation";



export default function HomePage() {
  const router = useRouter();

  const handleEnterApp = () => {
    router.push('/dashboard');
  };

  return <LandingPage onEnterApp={handleEnterApp} />;
}
